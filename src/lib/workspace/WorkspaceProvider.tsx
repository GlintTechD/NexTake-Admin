import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { backend } from "../backend";
import { isSupabaseConfigured } from "../config";
import { useAuth } from "../auth/context";
import type { Article, SiteSettings } from "../../types";
import { DEFAULT_SETTINGS } from "../backend/mappers";
import {
  WorkspaceContext,
  type ArticleApi,
  type AuditApi,
  type CollectionApi,
  type EngagementApi,
  type HomepageApi,
  type NewRecord,
  type NewsletterApi,
  type SuggestionApi,
  type TaxonomyApi,
  type WorkspaceContextValue,
} from "./context";
import {
  buildSampleWorkspace,
  seedEngagement,
  seedSuggestions,
  seedTaxonomy,
} from "./seed";
import { ROLE_DEFINITIONS } from "../permissions";
import {
  articleToInput,
  normalizeArticle,
  readLocalArticles,
  seedArticles,
  writeLocalArticles,
} from "./articleAdapter";
import {
  deleteRemoteRecord,
  initialHealth,
  loadRemoteCollection,
  readLocalCollection,
  writeLocalCollection,
  writeRemoteRecord,
} from "./persistence";
import { canonicalizeList, resolveTaxonomy } from "./taxonomy";
import type {
  AuditAction,
  AuditEvent,
  BaseRecord,
  Claim,
  CollectionHealth,
  Company,
  EngagementEvent,
  HomepageConfig,
  Industry,
  MediaAsset,
  NewsletterCampaign,
  NewsletterSubscriber,
  NexTakeEvent,
  Person,
  RelationshipSuggestion,
  Source,
  StoredRoleDefinition,
  Startup,
  TaxonomyKind,
  TaxonomyTerm,
  WorkspaceCollection,
  WorkspaceUser,
} from "./types";
import { suggestRelationships, type EntityIndexInput } from "./relations";
import { MARKETS } from "./taxonomy";

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

const HOMEPAGE_KEY = "nextake.cms.v1.homepage";
const AUDIT_LIMIT = 500;

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function sampleArticleIds(): string[] {
  const stored = readLocalArticles();
  const articles = stored && stored.length > 0 ? stored : seedArticles();
  return articles.map((article) => article.id);
}

const HOME_ARTICLE_IDS = sampleArticleIds();

function defaultHomepage(): HomepageConfig {
  const published = seedArticles()
    .filter((article) => article.status === "published")
    .map((article) => article.id);

  return {
    heroMainId: published[0] ?? null,
    heroSecondaryIds: published.slice(1, 3),
    trendingIds: published.slice(2, 6),
    editorsPickIds: published.slice(4, 8),
    startupSpotlightId: "startup-flutterwave",
    autoSort: { hero: "manual", trending: "manual", editorsPicks: "manual" },
    updatedAt: new Date().toISOString(),
    updatedBy: "workspace",
  };
}

function readHomepage(): HomepageConfig {
  try {
    const raw = window.localStorage.getItem(HOMEPAGE_KEY);
    if (!raw) return defaultHomepage();
    return { ...defaultHomepage(), ...(JSON.parse(raw) as HomepageConfig) };
  } catch {
    return defaultHomepage();
  }
}

/* -------------------------------------------------------------------------- */
/*                          GENERIC COLLECTION STORE                          */
/* -------------------------------------------------------------------------- */

interface CollectionConfig<T extends BaseRecord> {
  collection: WorkspaceCollection;
  seed: () => T[];
  idPrefix: string;
  label: (record: T) => string;
  audit?: { created: AuditAction; updated: AuditAction; deleted: AuditAction };
  /** Collections whose records are addressed by slug rather than a prefix id. */
  slugifyName?: (record: NewRecord<T>) => string;
}

type Stored<T> = CollectionApi<T> & { ready: boolean; health: CollectionHealth };

function useCollectionStore<T extends BaseRecord>(
  config: CollectionConfig<T>,
  actor: string,
  log: (input: {
    action: AuditAction;
    entityType: string;
    entityId: string;
    entityLabel: string;
    detail?: string;
    changes?: AuditApi extends never ? never : Array<{ field: string; from: string; to: string }>;
  }) => void
): Stored<T> {
  const { collection, seed, idPrefix, label, audit, slugifyName } = config;
  const seedRef = useRef(seed);

  /* Keep the latest seed available to the async loader without touching a ref
     during render. */
  useEffect(() => {
    seedRef.current = seed;
  }, [seed]);

  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);
  const [health, setHealth] = useState<CollectionHealth>(() => initialHealth(collection));

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const remote = await loadRemoteCollection<T>(collection);
      if (cancelled) return;

      if (remote.items) {
        setItems(remote.items);
      } else {
        const local = readLocalCollection<T>(collection);
        const initial = local && local.length > 0 ? local : seedRef.current();
        setItems(initial);
        writeLocalCollection(collection, initial);
      }

      setHealth({ collection, mode: remote.mode, message: remote.message });
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [collection]);

  const commit = useCallback(
    (next: T[]) => {
      setItems(next);
      writeLocalCollection(collection, next);
    },
    [collection]
  );

  const create = useCallback<CollectionApi<T>["create"]>(
    (input) => {
      const at = new Date().toISOString();
      const id =
        (input as { id?: string }).id ??
        `${idPrefix}-${uid(idPrefix).split("-")[1]}`;
      const record = {
        ...(input as object),
        id,
        createdAt: at,
        updatedAt: at,
        createdBy: actor,
        updatedBy: actor,
        origin: (input as { origin?: BaseRecord["origin"] }).origin ?? "live",
      } as T;

      if (slugifyName && !(record as { slug?: string }).slug) {
        (record as { slug?: string }).slug = slugifyName(input);
      }

      const next = [record, ...items];
      commit(next);
      void writeRemoteRecord(collection, record);

      if (audit) {
        log({
          action: audit.created,
          entityType: collection,
          entityId: id,
          entityLabel: label(record),
          detail: "Created",
        });
      }

      return record;
    },
    [actor, audit, collection, commit, idPrefix, items, label, log, slugifyName]
  );

  const update = useCallback<CollectionApi<T>["update"]>(
    (id, patch) => {
      const current = items.find((item) => item.id === id);
      if (!current) return null;

      const updated = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
        updatedBy: actor,
      } as T;

      commit(items.map((item) => (item.id === id ? updated : item)));
      void writeRemoteRecord(collection, updated);

      if (audit) {
        log({
          action: audit.updated,
          entityType: collection,
          entityId: id,
          entityLabel: label(updated),
          detail: "Updated",
        });
      }

      return updated;
    },
    [actor, audit, collection, commit, items, label, log]
  );

  const remove = useCallback<CollectionApi<T>["remove"]>(
    (id) => {
      const target = items.find((item) => item.id === id);
      commit(items.filter((item) => item.id !== id));
      void deleteRemoteRecord(collection, id);

      if (audit && target) {
        log({
          action: audit.deleted,
          entityType: collection,
          entityId: id,
          entityLabel: label(target),
          detail: "Deleted",
        });
      }
    },
    [audit, collection, commit, items, label, log]
  );

  return {
    items,
    create,
    update,
    remove,
    byId: (id) => (id ? items.find((item) => item.id === id) ?? null : null),
    replaceAll: commit,
    ready,
    health,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  PROVIDER                                  */
/* -------------------------------------------------------------------------- */

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const actor = profile?.email ?? "workspace@nextake";
  const actorRole = profile?.role ?? "admin";

  /* ---------------------------------------------------------------------- */
  /* AUDIT TRAIL (declared first — every other store reports into it)        */
  /* ---------------------------------------------------------------------- */

  const [auditItems, setAuditItems] = useState<AuditEvent[]>([]);
  const [auditReady, setAuditReady] = useState(false);
  const [auditHealth, setAuditHealth] = useState<CollectionHealth>(() =>
    initialHealth("audit")
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const remote = await loadRemoteCollection<AuditEvent>("audit");
      if (cancelled) return;

      const initial = remote.items ?? readLocalCollection<AuditEvent>("audit") ?? [];
      setAuditItems(initial);
      if (!remote.items) writeLocalCollection("audit", initial);
      setAuditHealth({ collection: "audit", mode: remote.mode, message: remote.message });
      setAuditReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const logAction = useCallback<AuditApi["log"]>(
    ({ action, entityType, entityId, entityLabel, detail, changes }) => {
      const event: AuditEvent = {
        id: uid("audit"),
        origin: "live",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: actor,
        updatedBy: actor,
        at: new Date().toISOString(),
        actorId: profile?.id ?? "unknown",
        actorEmail: actor,
        actorRole: actorRole,
        action,
        entityType,
        entityId,
        entityLabel,
        detail: detail ?? "",
        changes: changes ?? [],
      };

      setAuditItems((current) => {
        const next = [event, ...current].slice(0, AUDIT_LIMIT);
        writeLocalCollection("audit", next);
        return next;
      });
      void writeRemoteRecord("audit", event);
    },
    [actor, actorRole, profile?.id]
  );

  const audit = useMemo<AuditApi>(
    () => ({
      items: auditItems,
      ready: auditReady,
      health: auditHealth,
      create: (input) => {
        const event: AuditEvent = {
          ...(input as unknown as AuditEvent),
          id: uid("audit"),
          at: new Date().toISOString(),
        } as AuditEvent;
        setAuditItems((current) => [event, ...current].slice(0, AUDIT_LIMIT));
        return event;
      },
      update: () => null,
      remove: (id) =>
        setAuditItems((current) => current.filter((event) => event.id !== id)),
      byId: (id) => auditItems.find((event) => event.id === id) ?? null,
      replaceAll: (next) => setAuditItems(next),
      log: logAction,
    }),
    [auditHealth, auditItems, auditReady, logAction]
  );

  /* ---------------------------------------------------------------------- */
  /* ARTICLES                                                               */
  /* ---------------------------------------------------------------------- */

  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesReady, setArticlesReady] = useState(false);
  const articlesRef = useRef<Article[]>([]);

  useEffect(() => {
    articlesRef.current = articles;
  }, [articles]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (isSupabaseConfigured) {
        const result = await backend.articles.list();
        if (cancelled) return;
        setArticles((result.data ?? []).map(normalizeArticle));
        setArticlesReady(true);
        return;
      }

      const local = readLocalArticles();
      const initial = local && local.length > 0 ? local : seedArticles();
      setArticles(initial.map(normalizeArticle));
      writeLocalArticles(initial.map(normalizeArticle));
      setArticlesReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistLocalArticles = useCallback((next: Article[]) => {
    if (!isSupabaseConfigured) writeLocalArticles(next);
  }, []);

  const articlesApi = useMemo<ArticleApi>(() => {
    const find = (id: string | null | undefined) =>
      id ? articlesRef.current.find((article) => article.id === id) ?? null : null;

    const apply = (next: Article[]) => {
      setArticles(next);
      persistLocalArticles(next);
    };

    const replace = (article: Article) =>
      apply(
        articlesRef.current.map((entry) => (entry.id === article.id ? article : entry))
      );

    return {
      items: articles,
      byId: find,

      create(article) {
        const normalized = normalizeArticle(article);
        apply([normalized, ...articlesRef.current]);
        if (isSupabaseConfigured) {
          void backend.articles.create(articleToInput(normalized), actor);
        }
        logAction({
          action: "article.created",
          entityType: "article",
          entityId: normalized.id,
          entityLabel: normalized.title,
          detail: `Created as ${normalized.status}`,
        });
        return normalized;
      },

      async save(article) {
        const normalized = normalizeArticle(article);
        const exists = articlesRef.current.some((entry) => entry.id === normalized.id);
        const next = exists
          ? articlesRef.current.map((entry) =>
              entry.id === normalized.id ? normalized : entry
            )
          : [normalized, ...articlesRef.current];

        setArticles(next);
        persistLocalArticles(next);

        if (isSupabaseConfigured) {
          const input = articleToInput(normalized);
          const result = exists
            ? await backend.articles.update(normalized.id, input, actor)
            : await backend.articles.create(input, actor);
          if (result.error) return { ok: false, error: result.error };
        }

        logAction({
          action: exists ? "article.updated" : "article.created",
          entityType: "article",
          entityId: normalized.id,
          entityLabel: normalized.title,
          detail: `Saved as ${normalized.status}`,
        });

        return { ok: true };
      },

      async remove(id) {
        const target = find(id);
        apply(articlesRef.current.filter((article) => article.id !== id));

        if (isSupabaseConfigured) {
          const result = await backend.articles.remove(id);
          if (result.error) {
            logAction({
              action: "article.deleted",
              entityType: "article",
              entityId: id,
              entityLabel: target?.title ?? id,
              detail: `Delete failed: ${result.error}`,
            });
          }
        }

        logAction({
          action: "article.deleted",
          entityType: "article",
          entityId: id,
          entityLabel: target?.title ?? id,
          detail: "Deleted from the workspace",
        });
      },

      duplicate(id) {
        const source = find(id);
        if (!source) return null;

        const copy = normalizeArticle({
          ...source,
          id: uid("art"),
          title: `${source.title} (copy)`,
          status: "draft",
          reviewState: "draft",
          publishedAt: null,
          views: 0,
          likes: 0,
          comments: 0,
          saves: 0,
          archived: false,
          archivedAt: null,
          isBigStory: false,
          seo: { ...source.seo, slug: `${source.seo?.slug ?? source.id}-copy` },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        apply([copy, ...articlesRef.current]);
        if (isSupabaseConfigured) {
          void backend.articles.create(articleToInput(copy), actor);
        }
        logAction({
          action: "article.duplicated",
          entityType: "article",
          entityId: copy.id,
          entityLabel: copy.title,
          detail: `Duplicated from “${source.title}”`,
        });
        return copy;
      },

      setStatus(id, status, publishedAt) {
        const target = find(id);
        if (!target) return;

        const updated = normalizeArticle({
          ...target,
          status,
          publishedAt:
            publishedAt === undefined ? target.publishedAt ?? null : publishedAt,
          reviewState:
            status === "published"
              ? "approved"
              : status === "scheduled"
              ? "approved"
              : target.reviewState,
        });

        replace(updated);

        if (isSupabaseConfigured) {
          void backend.articles.update(id, articleToInput(updated), actor);
        }

        const action: AuditAction =
          status === "scheduled"
            ? "article.scheduled"
            : status === "published"
            ? "article.published"
            : "article.unpublished";

        logAction({
          action,
          entityType: "article",
          entityId: id,
          entityLabel: updated.title,
          detail: `Status set to ${status}`,
        });
      },

      submitForReview(id) {
        const target = find(id);
        if (!target) return;
        const updated = normalizeArticle({
          ...target,
          status: "draft",
          reviewState: "in_review",
          submittedForReviewAt: new Date().toISOString(),
          reviewerId: actor,
        });
        replace(updated);
        if (isSupabaseConfigured) {
          void backend.articles.update(id, articleToInput(updated), actor);
        }
        logAction({
          action: "article.review_requested",
          entityType: "article",
          entityId: id,
          entityLabel: updated.title,
          detail: "Submitted for editorial review",
        });
      },

      approve(id) {
        const target = find(id);
        if (!target) return;
        const updated = normalizeArticle({
          ...target,
          reviewState: "approved",
          approvedAt: new Date().toISOString(),
          reviewerId: actor,
        });
        replace(updated);
        if (isSupabaseConfigured) {
          void backend.articles.update(id, articleToInput(updated), actor);
        }
        logAction({
          action: "article.approved",
          entityType: "article",
          entityId: id,
          entityLabel: updated.title,
          detail: "Approved by editorial",
        });
      },

      archive(id) {
        const target = find(id);
        if (!target) return;
        const updated = normalizeArticle({
          ...target,
          archived: true,
          archivedAt: new Date().toISOString(),
          status: target.status === "published" ? "unpublished" as Article["status"] : target.status,
        });
        replace(updated);
        if (isSupabaseConfigured) {
          void backend.articles.update(id, articleToInput(updated), actor);
        }
        logAction({
          action: "article.archived",
          entityType: "article",
          entityId: id,
          entityLabel: updated.title,
          detail: "Archived",
        });
      },

      restore(id) {
        const target = find(id);
        if (!target) return;
        const updated = normalizeArticle({
          ...target,
          archived: false,
          archivedAt: null,
          status: "draft",
        });
        replace(updated);
        if (isSupabaseConfigured) {
          void backend.articles.update(id, articleToInput(updated), actor);
        }
        logAction({
          action: "article.updated",
          entityType: "article",
          entityId: id,
          entityLabel: updated.title,
          detail: "Restored from archive",
        });
      },
    };
  }, [actor, articles, logAction, persistLocalArticles]);

  /* ---------------------------------------------------------------------- */
  /* WORKSPACE COLLECTIONS                                                  */
  /* ---------------------------------------------------------------------- */

  const sampleRef = useRef(buildSampleWorkspace(HOME_ARTICLE_IDS));

  const startups = useCollectionStore<Startup>(
    {
      collection: "startups",
      seed: () => sampleRef.current.startups,
      idPrefix: "startup",
      label: (startup) => startup.name,
      slugifyName: (input) => String(input.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      audit: {
        created: "startup.created",
        updated: "startup.updated",
        deleted: "startup.deleted",
      },
    },
    actor,
    logAction
  );

  const people = useCollectionStore<Person>(
    {
      collection: "people",
      seed: () => sampleRef.current.people,
      idPrefix: "person",
      label: (person) => person.name,
      audit: { created: "person.created", updated: "person.updated", deleted: "person.updated" },
    },
    actor,
    logAction
  );

  const companies = useCollectionStore<Company>(
    {
      collection: "companies",
      seed: () => sampleRef.current.companies,
      idPrefix: "company",
      label: (company) => company.name,
      audit: { created: "startup.created", updated: "startup.updated", deleted: "startup.deleted" },
    },
    actor,
    logAction
  );

  const industries = useCollectionStore<Industry>(
    {
      collection: "industries",
      seed: () => sampleRef.current.industries,
      idPrefix: "industry",
      label: (industry) => industry.name,
      audit: { created: "taxonomy.created", updated: "taxonomy.updated", deleted: "taxonomy.updated" },
    },
    actor,
    logAction
  );

  const events = useCollectionStore<NexTakeEvent>(
    {
      collection: "events",
      seed: () => sampleRef.current.events,
      idPrefix: "event",
      label: (event) => event.name,
      audit: { created: "source.created", updated: "source.updated", deleted: "source.updated" },
    },
    actor,
    logAction
  );

  const sources = useCollectionStore<Source>(
    {
      collection: "sources",
      seed: () => sampleRef.current.sources,
      idPrefix: "source",
      label: (source) => `${source.publisher} — ${source.title}`,
      audit: { created: "source.created", updated: "source.updated", deleted: "source.updated" },
    },
    actor,
    logAction
  );

  const claims = useCollectionStore<Claim>(
    {
      collection: "claims",
      seed: () => sampleRef.current.claims,
      idPrefix: "claim",
      label: (claim) => claim.statement.slice(0, 80),
      audit: { created: "claim.created", updated: "claim.updated", deleted: "claim.updated" },
    },
    actor,
    logAction
  );

  const media = useCollectionStore<MediaAsset>(
    {
      collection: "media",
      seed: () => sampleRef.current.media,
      idPrefix: "media",
      label: (asset) => asset.filename,
      audit: { created: "media.uploaded", updated: "media.updated", deleted: "media.deleted" },
    },
    actor,
    logAction
  );

  const campaigns = useCollectionStore<NewsletterCampaign>(
    {
      collection: "campaigns",
      seed: () => sampleRef.current.campaigns,
      idPrefix: "campaign",
      label: (campaign) => campaign.name,
      audit: { created: "newsletter.created", updated: "newsletter.updated", deleted: "newsletter.updated" },
    },
    actor,
    logAction
  );

  const subscribers = useCollectionStore<NewsletterSubscriber>(
    {
      collection: "subscribers",
      seed: () => sampleRef.current.subscribers,
      idPrefix: "sub",
      label: (subscriber) => subscriber.email,
    },
    actor,
    logAction
  );

  const users = useCollectionStore<WorkspaceUser>(
    {
      collection: "users",
      seed: () => sampleRef.current.users,
      idPrefix: "admin",
      label: (user) => user.fullName || user.email,
      audit: { created: "user.invited", updated: "user.updated", deleted: "user.updated" },
    },
    actor,
    logAction
  );

  const roles = useCollectionStore<StoredRoleDefinition>(
    {
      collection: "roles",
      seed: () =>
        ROLE_DEFINITIONS.map((role, index) => ({
          id: role.id,
          role: role.id,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isSystem: role.isSystem,
          origin: "sample" as const,
          createdAt: new Date(Date.now() - (180 - index) * 86_400_000).toISOString(),
          updatedAt: new Date(Date.now() - (180 - index) * 86_400_000).toISOString(),
          createdBy: "workspace@nextake",
          updatedBy: "workspace@nextake",
        })),
      idPrefix: "role",
      label: (role) => role.name,
      audit: { created: "role.updated", updated: "role.updated", deleted: "role.updated" },
    },
    actor,
    logAction
  );

  const initialTerms = useMemo(() => seedTaxonomy(), []);
  const taxonomyBase = useMemo(() => {
    void initialTerms;
    return sampleRef.current.taxonomy;
  }, [initialTerms]);

  const taxonomyStore = useCollectionStore<TaxonomyTerm>(
    {
      collection: "taxonomy",
      seed: () => taxonomyBase,
      idPrefix: "term",
      label: (term) => term.name,
      audit: { created: "taxonomy.created", updated: "taxonomy.updated", deleted: "taxonomy.updated" },
    },
    actor,
    logAction
  );

  const taxonomy = useMemo<TaxonomyApi>(() => {
    const resolve = (kind: TaxonomyKind, value: string): string => {
      const resolution = resolveTaxonomy(taxonomyStore.items, kind, value);
      if (resolution.isNew && resolution.value) {
        taxonomyStore.create({
          id: `term-${kind}-${resolution.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          kind,
          name: resolution.value,
          slug: resolution.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          aliases: resolution.asTyped !== resolution.value ? [resolution.asTyped] : [],
          description: "",
        } as NewRecord<TaxonomyTerm>);
      }
      return resolution.value;
    };

    return {
      ...taxonomyStore,
      resolve,
      canonicalize: (kind, values) => {
        const canonical = canonicalizeList(taxonomyStore.items, kind, values);
        for (const name of canonical) resolve(kind, name);
        return canonical;
      },
      byKind: (kind) => taxonomyStore.items.filter((term) => term.kind === kind),
      names: (kind) => taxonomyStore.items.filter((term) => term.kind === kind).map((term) => term.name),
    };
  }, [taxonomyStore]);

  /* ---------------------------------------------------------------------- */
  /* SUGGESTIONS                                                            */
  /* ---------------------------------------------------------------------- */

  const suggestionStore = useCollectionStore<RelationshipSuggestion>(
    {
      collection: "suggestions",
      seed: () => seedSuggestions().filter((suggestion) =>
        HOME_ARTICLE_IDS.includes(suggestion.hostId) ||
        sampleRef.current.startups.some((startup) => startup.id === suggestion.hostId)
      ),
      idPrefix: "sugg",
      label: (suggestion) => `${suggestion.hostLabel} → ${suggestion.targetLabel}`,
    },
    actor,
    logAction
  );

  const suggestions = useMemo<SuggestionApi>(() => {
    const library = (): EntityIndexInput => ({
      articles: articlesRef.current,
      startups: startups.items,
      people: people.items,
      companies: companies.items,
      industries: industries.items,
      sources: sources.items,
      events: events.items,
    });

    return {
      ...suggestionStore,
      generate(host) {
        const proposals = suggestRelationships(
          {
            hostType: host.type,
            hostId: host.id,
            hostLabel: host.label,
            text: host.text,
            linkedStartupIds: host.linkedStartupIds ?? [],
            linkedPersonIds: host.linkedPersonIds ?? [],
            linkedArticleIds: host.linkedArticleIds ?? [],
            category: host.category,
            tags: host.tags,
          },
          library(),
          suggestionStore.items,
          [...MARKETS]
        );

        const existingIds = new Set(suggestionStore.items.map((item) => item.id));
        const fresh = proposals.filter((proposal) => !existingIds.has(proposal.id));

        if (fresh.length > 0) {
          suggestionStore.replaceAll([...fresh, ...suggestionStore.items]);
          logAction({
            action: "suggestion.detected",
            entityType: host.type,
            entityId: host.id,
            entityLabel: host.label,
            detail: `${fresh.length} candidate relationship${
              fresh.length === 1 ? "" : "s"
            } detected — awaiting editorial approval`,
          });
        }

        return fresh;
      },
      decide(id, status) {
        const target = suggestionStore.items.find((item) => item.id === id);
        if (!target) return;
        suggestionStore.update(id, {
          status,
          decidedAt: new Date().toISOString(),
          decidedBy: actor,
        });
        logAction({
          action: status === "accepted" ? "suggestion.accepted" : "suggestion.rejected",
          entityType: target.hostType,
          entityId: target.hostId,
          entityLabel: target.hostLabel,
          detail: `${status === "accepted" ? "Accepted" : "Rejected"} suggestion: ${target.targetLabel}`,
        });
      },
      pendingFor: (hostId) =>
        suggestionStore.items.filter(
          (item) => item.hostId === hostId && item.status === "pending"
        ),
      acceptedFor: (hostId) =>
        suggestionStore.items.filter(
          (item) => item.hostId === hostId && item.status === "accepted"
        ),
    };
  }, [
    actor,
    companies.items,
    events.items,
    industries.items,
    logAction,
    people.items,
    sources.items,
    startups.items,
    suggestionStore,
  ]);

  /* ---------------------------------------------------------------------- */
  /* ENGAGEMENT EVENTS                                                      */
  /* ---------------------------------------------------------------------- */

  const engagementStore = useCollectionStore<EngagementEvent>(
    {
      collection: "engagement",
      seed: () => seedEngagement(HOME_ARTICLE_IDS),
      idPrefix: "eng",
      label: (event) => `${event.kind} · ${event.entityId}`,
    },
    actor,
    logAction
  );

  const engagement = useMemo<EngagementApi>(
    () => ({
      ...engagementStore,
      track(input) {
        const at = new Date().toISOString();
        const event: EngagementEvent = {
          id: uid("eng"),
          origin: "live",
          createdAt: at,
          updatedAt: at,
          createdBy: actor,
          updatedBy: actor,
          at,
          entityType: input.entityType,
          entityId: input.entityId,
          kind: input.kind,
          trafficSource: input.trafficSource ?? "internal",
          path: input.path ?? "",
          context: input.context ?? "admin",
          meta: input.meta ?? {},
        };

        engagementStore.replaceAll([event, ...engagementStore.items]);
        void writeRemoteRecord("engagement", event);
      },
    }),
    [actor, engagementStore]
  );

  /* ---------------------------------------------------------------------- */
  /* NEWSLETTER                                                             */
  /* ---------------------------------------------------------------------- */

  const newsletter = useMemo<NewsletterApi>(
    () => ({
      ...campaignStoreWith(campaigns),
      subscribers,
      setStatus(id, status) {
        campaigns.update(id, { status });
        logAction({
          action: status === "scheduled" ? "newsletter.scheduled" : "newsletter.updated",
          entityType: "campaign",
          entityId: id,
          entityLabel: campaigns.byId(id)?.name ?? id,
          detail: `Campaign status: ${status}`,
        });
      },
      markSent(id, recipients) {
        const target = campaigns.byId(id);
        campaigns.update(id, {
          status: "sent",
          sentAt: new Date().toISOString(),
          recipients,
        });
        logAction({
          action: "newsletter.sent",
          entityType: "campaign",
          entityId: id,
          entityLabel: target?.name ?? id,
          detail: `Queued for ${recipients} recipient${recipients === 1 ? "" : "s"}`,
        });
      },
      metrics() {
        const items = subscribers.items;
        const byFrequency: Record<string, number> = {};
        for (const subscriber of items) {
          if (subscriber.status !== "subscribed") continue;
          byFrequency[subscriber.frequency] = (byFrequency[subscriber.frequency] ?? 0) + 1;
        }

        return {
          total: items.length,
          active: items.filter((item) => item.status === "subscribed").length,
          unsubscribed: items.filter((item) => item.status === "unsubscribed").length,
          bounced: items.filter((item) => item.status === "bounced").length,
          byFrequency,
          newest: [...items]
            .sort(
              (a, b) =>
                new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime()
            )
            .slice(0, 5),
        };
      },
    }),
    [actor, campaigns, logAction, subscribers]
  );

  /* ---------------------------------------------------------------------- */
  /* HOMEPAGE + SETTINGS                                                    */
  /* ---------------------------------------------------------------------- */

  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig>(() => readHomepage());

  const homepage = useMemo<HomepageApi>(
    () => ({
      config: homepageConfig,
      save(next, detail) {
        const stored: HomepageConfig = {
          ...next,
          updatedAt: new Date().toISOString(),
          updatedBy: actor,
        };
        setHomepageConfig(stored);
        try {
          window.localStorage.setItem(HOMEPAGE_KEY, JSON.stringify(stored));
        } catch {
          /* storage unavailable */
        }
        logAction({
          action: "homepage.updated",
          entityType: "homepage",
          entityId: "homepage",
          entityLabel: "Homepage placement",
          detail: detail ?? "Homepage sections updated",
        });
      },
    }),
    [actor, homepageConfig, logAction]
  );

  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await backend.settings.get();
      if (cancelled) return;
      if (result.data) setSettings(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSettings = useCallback(
    async (next: SiteSettings) => {
      const result = await backend.settings.update(next);
      if (result.data) setSettings(result.data);
      logAction({
        action: "settings.updated",
        entityType: "settings",
        entityId: "site",
        entityLabel: "Site settings",
        detail: "Site settings saved",
      });
    },
    [logAction]
  );

  /* ---------------------------------------------------------------------- */
  /* WORKSPACE HEALTH                                                       */
  /* ---------------------------------------------------------------------- */

  const health = useMemo<CollectionHealth[]>(
    () => [
      auditHealth,
      startups.health,
      people.health,
      companies.health,
      industries.health,
      events.health,
      sources.health,
      claims.health,
      media.health,
      suggestionStore.health,
      campaigns.health,
      subscribers.health,
      engagementStore.health,
      users.health,
      roles.health,
      taxonomyStore.health,
    ],
    [
      auditHealth,
      campaigns.health,
      claims.health,
      companies.health,
      engagementStore.health,
      events.health,
      industries.health,
      media.health,
      people.health,
      roles.health,
      sources.health,
      startups.health,
      subscribers.health,
      suggestionStore.health,
      taxonomyStore.health,
      users.health,
    ]
  );

  const isSampleWorkspace = useMemo(
    () =>
      startups.items.some((item) => item.origin === "sample") ||
      sources.items.some((item) => item.origin === "sample"),
    [sources.items, startups.items]
  );

  const ready = articlesReady && startups.ready && auditReady;

  const resetWorkspace = useCallback(() => {
    const fresh = buildSampleWorkspace(articlesRef.current.map((article) => article.id));
    startups.replaceAll(fresh.startups);
    people.replaceAll(fresh.people);
    companies.replaceAll(fresh.companies);
    industries.replaceAll(fresh.industries);
    events.replaceAll(fresh.events);
    sources.replaceAll(fresh.sources);
    claims.replaceAll(fresh.claims);
    media.replaceAll(fresh.media);
    campaigns.replaceAll(fresh.campaigns);
    subscribers.replaceAll(fresh.subscribers);
    users.replaceAll(fresh.users);
    taxonomyStore.replaceAll(fresh.taxonomy);
    suggestionStore.replaceAll(fresh.suggestions);
    engagementStore.replaceAll(seedEngagement(articlesRef.current.map((a) => a.id)));
    logAction({
      action: "workspace.reseeded",
      entityType: "workspace",
      entityId: "workspace",
      entityLabel: "Workspace",
      detail: "Workspace records reset to the shipped sample set",
    });
  }, [
    campaigns,
    claims,
    companies,
    engagementStore,
    events,
    industries,
    logAction,
    media,
    people,
    sources,
    suggestionStore,
    subscribers,
    startups,
    taxonomyStore,
    users,
  ]);

  const exportWorkspaceJson = useCallback(
    () =>
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          articles: articlesRef.current,
          startups: startups.items,
          people: people.items,
          companies: companies.items,
          industries: industries.items,
          events: events.items,
          sources: sources.items,
          claims: claims.items,
          media: media.items,
          campaigns: campaigns.items,
          subscribers: subscribers.items,
          suggestions: suggestionStore.items,
          audit: auditItems,
          users: users.items,
          taxonomy: taxonomyStore.items,
          homepage: homepageConfig,
        },
        null,
        2
      ),
    [
      auditItems,
      campaigns.items,
      claims.items,
      companies.items,
      events.items,
      homepageConfig,
      industries.items,
      media.items,
      people.items,
      sources.items,
      subscribers.items,
      suggestionStore.items,
      startups.items,
      taxonomyStore.items,
      users.items,
    ]
  );

  /* ---------------------------------------------------------------------- */
  /* CONTEXT                                                                */
  /* ---------------------------------------------------------------------- */

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ready,
      health,
      isSampleWorkspace,
      backendMode: isSupabaseConfigured ? "supabase" : "demo",
      actor,
      articles: articlesApi,
      startups,
      people,
      companies,
      industries,
      events,
      sources,
      claims,
      media,
      suggestions,
      newsletter,
      engagement,
      audit,
      users,
      roles,
      taxonomy,
      homepage,
      settings,
      saveSettings,
      resetWorkspace,
      exportWorkspaceJson,
      healthFor: (collection) => health.find((entry) => entry.collection === collection) ?? null,
    }),
    [
      actor,
      articlesApi,
      audit,
      campaigns,
      claims,
      companies,
      engagement,
      events,
      health,
      homepage,
      industries,
      isSampleWorkspace,
      media,
      newsletter,
      people,
      ready,
      resetWorkspace,
      roles,
      saveSettings,
      settings,
      sources,
      startups,
      subscribers,
      suggestions,
      taxonomy,
      users,
      exportWorkspaceJson,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

/**
 * Newsletter campaigns are a plain collection plus status helpers; the label is
 * stripped so the API surface stays explicit.
 */
function campaignStoreWith(
  store: CollectionApi<NewsletterCampaign> & { ready: boolean; health: CollectionHealth }
): CollectionApi<NewsletterCampaign> {
  const { items, create, update, remove, byId, replaceAll } = store;
  return { items, create, update, remove, byId, replaceAll };
}

export default WorkspaceProvider;
