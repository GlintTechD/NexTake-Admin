/**
 * Relationship engine.
 *
 * NexTake entities are interconnected records (brief §25). This module turns
 * the flat collections into a queryable graph:
 *
 *   • `buildEntityIndex`      — every entity becomes a searchable node
 *   • `detectEntities`        — entity/industry/market detection inside copy
 *   • `suggestRelationships`  — candidate links (never auto-applied)
 *   • `relatedStories`        — scored story-to-story relationships
 *   • `startupCoverage`       — which stories cover which startup
 *   • `mediaUsage`            — where an asset is used
 */

import type { Article } from "../../types";
import type {
  Company,
  Industry,
  NexTakeEvent,
  Person,
  RelationshipSuggestion,
  Source,
  Startup,
} from "./types";
import { taxonomyKey } from "./taxonomy";

export type EntityType =
  | "article"
  | "startup"
  | "person"
  | "company"
  | "industry"
  | "source"
  | "event";

export interface EntityNode {
  type: EntityType;
  id: string;
  label: string;
  /** Secondary line shown in pickers — industry, role, publisher, … */
  subtitle: string;
  href: string;
  keywords: string[];
  origin: "sample" | "live";
}

export interface EntityIndexInput {
  articles: Article[];
  startups: Startup[];
  people: Person[];
  companies: Company[];
  industries: Industry[];
  sources: Source[];
  events: NexTakeEvent[];
}

export function buildEntityIndex(input: EntityIndexInput): EntityNode[] {
  const nodes: EntityNode[] = [];

  for (const startup of input.startups) {
    nodes.push({
      type: "startup",
      id: startup.id,
      label: startup.name,
      subtitle: `${startup.industry} · ${startup.country}`,
      href: `startup-dossier:${startup.id}`,
      keywords: [
        startup.industry,
        startup.country,
        startup.headquarters,
        ...startup.markets,
        ...startup.tags,
        ...startup.products,
      ],
      origin: startup.origin,
    });
  }

  for (const person of input.people) {
    nodes.push({
      type: "person",
      id: person.id,
      label: person.name,
      subtitle: `${person.currentRole || person.role}${
        person.organization ? ` · ${person.organization}` : ""
      }`,
      href: `people:${person.id}`,
      keywords: [person.organization, person.location, person.role],
      origin: person.origin,
    });
  }

  for (const company of input.companies) {
    nodes.push({
      type: "company",
      id: company.id,
      label: company.name,
      subtitle: company.sector,
      href: `companies:${company.id}`,
      keywords: [company.sector, company.country],
      origin: company.origin,
    });
  }

  for (const industry of input.industries) {
    nodes.push({
      type: "industry",
      id: industry.id,
      label: industry.name,
      subtitle: "Industry",
      href: `industries:${industry.id}`,
      keywords: industry.aliases,
      origin: industry.origin,
    });
  }

  for (const source of input.sources) {
    nodes.push({
      type: "source",
      id: source.id,
      label: source.publisher,
      subtitle: source.title,
      href: `sources:${source.id}`,
      keywords: [source.author, source.type],
      origin: source.origin,
    });
  }

  for (const event of input.events) {
    nodes.push({
      type: "event",
      id: event.id,
      label: event.name,
      subtitle: event.location,
      href: `events:${event.id}`,
      keywords: [event.organizer, event.kind],
      origin: event.origin,
    });
  }

  for (const article of input.articles) {
    nodes.push({
      type: "article",
      id: article.id,
      label: article.title,
      subtitle: `${article.category} · ${article.status}`,
      href: `article-editor:${article.id}`,
      keywords: [...(article.tags ?? []), article.author, article.excerpt],
      origin: "live",
    });
  }

  return nodes;
}

/** Case-insensitive, word-boundary-ish search across the entity index. */
export function searchEntities(
  index: EntityNode[],
  query: string,
  options: { types?: EntityType[]; limit?: number } = {}
): EntityNode[] {
  const trimmed = query.trim().toLowerCase();
  const types = options.types;
  const pool = types ? index.filter((node) => types.includes(node.type)) : index;

  if (!trimmed) {
    return pool.slice(0, options.limit ?? 12);
  }

  const terms = trimmed.split(/\s+/).filter(Boolean);

  return pool
    .map((node) => {
      const haystack = `${node.label} ${node.subtitle} ${node.keywords.join(" ")}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (node.label.toLowerCase().startsWith(term)) score += 6;
        else if (node.label.toLowerCase().includes(term)) score += 4;
        else if (haystack.includes(term)) score += 2;
        else score -= 3;
      }
      return { node, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 12)
    .map((entry) => entry.node);
}

/* -------------------------------------------------------------------------- */
/*                            ENTITY DETECTION                                */
/* -------------------------------------------------------------------------- */

export interface DetectedEntity {
  label: string;
  type: EntityType | "market" | "tag";
  id?: string;
  /** How many times the phrase occurs in the analysed copy. */
  occurrences: number;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle.trim()) return 0;

  const escaped = needle
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");

  const matches = haystack.match(new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "gi"));
  return matches?.length ?? 0;
}

/**
 * Detect known entities inside a block of copy. Purely additive: the result is
 * surfaced to the editor as a suggestion, never written into the record.
 */
export function detectEntities(
  text: string,
  input: EntityIndexInput,
  markets: string[] = []
): DetectedEntity[] {
  const haystack = text ?? "";
  if (!haystack.trim()) return [];

  const found = new Map<string, DetectedEntity>();

  const push = (entity: DetectedEntity) => {
    const key = `${entity.type}:${taxonomyKey(entity.label)}`;
    const existing = found.get(key);
    if (existing) {
      existing.occurrences += entity.occurrences;
      return;
    }
    found.set(key, entity);
  };

  for (const startup of input.startups) {
    const occurrences = countOccurrences(haystack, startup.name);
    if (occurrences > 0) {
      push({ label: startup.name, type: "startup", id: startup.id, occurrences });
    }
  }

  for (const person of input.people) {
    const occurrences = countOccurrences(haystack, person.name);
    if (occurrences > 0) {
      push({ label: person.name, type: "person", id: person.id, occurrences });
    }
  }

  for (const company of input.companies) {
    const occurrences = countOccurrences(haystack, company.name);
    if (occurrences > 0) {
      push({ label: company.name, type: "company", id: company.id, occurrences });
    }
  }

  for (const industry of input.industries) {
    const variants = [industry.name, ...industry.aliases];
    const occurrences = variants.reduce(
      (sum, variant) => sum + countOccurrences(haystack, variant),
      0
    );
    if (occurrences > 0) {
      push({ label: industry.name, type: "industry", id: industry.id, occurrences });
    }
  }

  for (const market of markets) {
    const occurrences = countOccurrences(haystack, market);
    if (occurrences > 0) {
      push({ label: market, type: "market", occurrences });
    }
  }

  return Array.from(found.values()).sort((a, b) => b.occurrences - a.occurrences);
}

/* -------------------------------------------------------------------------- */
/*                          RELATIONSHIP SUGGESTIONS                          */
/* -------------------------------------------------------------------------- */

export interface SuggestionInput {
  hostType: "article" | "startup";
  hostId: string;
  hostLabel: string;
  text: string;
  /** Ids already linked — never suggested again. */
  linkedStartupIds: string[];
  linkedPersonIds: string[];
  linkedArticleIds: string[];
  category?: string;
  tags?: string[];
}

function overlapScore(left: string[], right: string[]): number {
  const leftKeys = new Set(left.map(taxonomyKey));
  const matches = right.filter((value) => leftKeys.has(taxonomyKey(value))).length;
  return matches;
}

/**
 * Build candidate relationships.
 *
 * IMPORTANT: this only *proposes* links. `RelationshipSuggestion.status` starts
 * as `pending` and the editor must accept it before any record changes.
 */
export function suggestRelationships(
  input: SuggestionInput,
  library: EntityIndexInput,
  existingSuggestions: RelationshipSuggestion[],
  markets: string[] = []
): RelationshipSuggestion[] {
  const detected = detectEntities(input.text, library, markets);
  const detectedLabels = detected.map((entity) => entity.label);
  const detectedStartupIds = new Set(
    detected.filter((entity) => entity.type === "startup" && entity.id).map((e) => e.id)
  );
  const detectedIndustries = new Set(
    detected.filter((entity) => entity.type === "industry").map((e) => taxonomyKey(e.label))
  );
  const detectedMarkets = new Set(
    detected.filter((entity) => entity.type === "market").map((e) => taxonomyKey(e.label))
  );

  const at = new Date().toISOString();
  const proposals: RelationshipSuggestion[] = [];

  const alreadyPending = (targetType: string, targetId: string) =>
    existingSuggestions.some(
      (suggestion) =>
        suggestion.hostId === input.hostId &&
        suggestion.targetType === targetType &&
        suggestion.targetId === targetId
    );

  const make = (
    targetType: RelationshipSuggestion["targetType"],
    targetId: string,
    targetLabel: string,
    confidence: number,
    reason: string
  ): RelationshipSuggestion => ({
    id: `sugg-gen-${input.hostId}-${targetType}-${targetId}`,
    origin: "live",
    createdAt: at,
    updatedAt: at,
    createdBy: "relationship-engine",
    updatedBy: "relationship-engine",
    hostType: input.hostType,
    hostId: input.hostId,
    hostLabel: input.hostLabel,
    targetType,
    targetId,
    targetLabel,
    confidence: Math.max(0.3, Math.min(0.97, confidence)),
    reason,
    detectedEntities: detectedLabels,
    status: "pending",
    decidedAt: null,
    decidedBy: "",
  });

  /* 1. Startups explicitly named in the copy — strongest signal. */
  for (const startup of library.startups) {
    if (input.linkedStartupIds.includes(startup.id)) continue;
    if (!detectedStartupIds.has(startup.id)) continue;
    if (alreadyPending("startup", startup.id)) continue;

    const mentions = detected.find((entity) => entity.id === startup.id)?.occurrences ?? 1;
    proposals.push(
      make(
        "startup",
        startup.id,
        startup.name,
        Math.min(0.95, 0.72 + mentions * 0.06),
        `“${startup.name}” is named ${mentions}× in the copy.`
      )
    );
  }

  /* 2. Startups matching the detected industry + market combination. */
  if (detectedIndustries.size > 0 || detectedMarkets.size > 0) {
    for (const startup of library.startups) {
      if (input.linkedStartupIds.includes(startup.id)) continue;
      if (detectedStartupIds.has(startup.id)) continue;
      if (alreadyPending("startup", startup.id)) continue;

      const industryMatch = detectedIndustries.has(taxonomyKey(startup.industry));
      const marketMatch = [...detectedMarkets].some(
        (market) =>
          taxonomyKey(startup.country) === market ||
          startup.markets.some((entry) => taxonomyKey(entry) === market)
      );

      if (!industryMatch && !marketMatch) continue;

      proposals.push(
        make(
          "startup",
          startup.id,
          startup.name,
          industryMatch && marketMatch ? 0.7 : 0.58,
          industryMatch
            ? `Operates in the detected ${startup.industry} industry.`
            : `Active in a detected market (${startup.country}).`
        )
      );
    }
  }

  /* 3. People leading already-linked or detected startups. */
  for (const person of library.people) {
    if (input.linkedPersonIds.includes(person.id)) continue;
    if (alreadyPending("person", person.id)) continue;

    const leadsLinkedStartup = person.startupIds.some((id) =>
      detectedStartupIds.has(id) || input.linkedStartupIds.includes(id)
    );
    const namedInCopy = detected.some(
      (entity) => entity.type === "person" && entity.id === person.id
    );

    if (!leadsLinkedStartup && !namedInCopy) continue;

    proposals.push(
      make(
        "person",
        person.id,
        person.name,
        namedInCopy ? 0.8 : 0.6,
        namedInCopy
          ? `“${person.name}” is named in the copy.`
          : `Leadership of a related startup (${person.organization}).`
      )
    );
  }

  /* 4. Related stories in the same category with overlapping tags/entities. */
  if (input.hostType === "article") {
    for (const article of library.articles) {
      if (article.id === input.hostId) continue;
      if (input.linkedArticleIds.includes(article.id)) continue;
      if (article.status !== "published") continue;
      if (alreadyPending("article", article.id)) continue;

      const sharedTags = overlapScore(article.tags ?? [], input.tags ?? []);
      const sameCategory = taxonomyKey(article.category) === taxonomyKey(input.category ?? "");
      const mentionsStartup = library.startups.some(
        (startup) =>
          detectedStartupIds.has(startup.id) &&
          (startup.articleIds.includes(article.id) ||
            (article.relatedStartupIds ?? []).includes(startup.id))
      );

      if (!sharedTags && !sameCategory && !mentionsStartup) continue;

      const confidence = 0.45 + sharedTags * 0.12 + (sameCategory ? 0.08 : 0) + (mentionsStartup ? 0.1 : 0);

      proposals.push(
        make(
          "article",
          article.id,
          article.title,
          confidence,
          mentionsStartup
            ? "Covers a startup related to this story."
            : sameCategory
            ? `Same section (${article.category}) with a related theme.`
            : `${sharedTags} shared tag${sharedTags === 1 ? "" : "s"}.`
        )
      );
    }
  }

  /* 5. Tags detected in the copy that are not on the record yet. */
  const knownTags = new Set((input.tags ?? []).map(taxonomyKey));
  for (const entity of detected) {
    if (entity.type === "industry" || entity.type === "market") {
      const label = entity.label.toLowerCase();
      if (!knownTags.has(taxonomyKey(label))) {
        proposals.push(
          make("tag", taxonomyKey(label), label, 0.55, `“${entity.label}” detected in the copy.`)
        );
      }
    }
  }

  return proposals
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 12);
}

/* -------------------------------------------------------------------------- */
/*                                  COVERAGE                                  */
/* -------------------------------------------------------------------------- */

export interface CoverageEntry {
  startupId: string;
  articleIds: string[];
  count: number;
}

export function startupCoverage(
  startups: Startup[],
  articles: Article[]
): CoverageEntry[] {
  return startups
    .map((startup) => {
      const articleIds = articles
        .filter(
          (article) =>
            startup.articleIds.includes(article.id) ||
            (article.relatedStartupIds ?? []).includes(startup.id)
        )
        .map((article) => article.id);

      return { startupId: startup.id, articleIds, count: articleIds.length };
    })
    .sort((a, b) => b.count - a.count);
}

export function articlesForStartup(startup: Startup | null, articles: Article[]): Article[] {
  if (!startup) return [];
  return articles.filter(
    (article) =>
      startup.articleIds.includes(article.id) ||
      (article.relatedStartupIds ?? []).includes(startup.id)
  );
}

/* -------------------------------------------------------------------------- */
/*                              RELATED STORIES                               */
/* -------------------------------------------------------------------------- */

export interface RelatedStory {
  article: Article;
  score: number
  reason: string;
}

export function relatedStories(
  article: Article,
  articles: Article[],
  _startups: Startup[] = []
): RelatedStory[] {
  /* Kept in the signature for call-site symmetry; startup overlap is read from
     each article's own `relatedStartupIds`. */
  void _startups;

  const explicit = new Set(article.relatedArticleIds ?? []);
  const articleStartupIds = new Set(article.relatedStartupIds ?? []);

  return articles
    .filter((candidate) => candidate.id !== article.id && candidate.status === "published")
    .map((candidate) => {
      const sharedTags = overlapScore(candidate.tags ?? [], article.tags ?? []);
      const sameCategory = taxonomyKey(candidate.category) === taxonomyKey(article.category);
      const sharedStartups = (candidate.relatedStartupIds ?? []).filter((id) =>
        articleStartupIds.has(id)
      ).length;
      const linked = explicit.has(candidate.id);

      const score =
        (linked ? 3 : 0) +
        sharedStartups * 2 +
        sharedTags * 1.5 +
        (sameCategory ? 1 : 0);

      const reasons: string[] = [];
      if (linked) reasons.push("linked in the editor");
      if (sharedStartups) reasons.push(`${sharedStartups} shared startup`);
      if (sharedTags) reasons.push(`${sharedTags} shared tag${sharedTags === 1 ? "" : "s"}`);
      if (sameCategory) reasons.push(`same section (${candidate.category})`);

      return {
        article: candidate,
        score,
        reason: reasons.length ? reasons.join(", ") : "same section",
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

/* -------------------------------------------------------------------------- */
/*                                 MEDIA USAGE                                */
/* -------------------------------------------------------------------------- */

export interface MediaUsageEntry {
  entityType: "article" | "startup" | "person" | "campaign";
  id: string;
  label: string;
}

export function mediaUsage(
  mediaId: string,
  mediaUrl: string,
  input: {
    articles: Article[];
    startups: Startup[];
    people: Person[];
    campaigns: Array<{ id: string; name: string; articleIds: string[] }>;
  }
): MediaUsageEntry[] {
  const usage: MediaUsageEntry[] = [];

  for (const article of input.articles) {
    if (
      article.featuredMediaId === mediaId ||
      article.image === mediaUrl ||
      article.coverImageUrl === mediaUrl
    ) {
      usage.push({ entityType: "article", id: article.id, label: article.title });
    }
  }

  for (const startup of input.startups) {
    if (startup.logoUrl === mediaUrl) {
      usage.push({ entityType: "startup", id: startup.id, label: startup.name });
    }
  }

  for (const person of input.people) {
    if (person.photoUrl && person.photoUrl === mediaUrl) {
      usage.push({ entityType: "person", id: person.id, label: person.name });
    }
  }

  return usage;
}

/* -------------------------------------------------------------------------- */
/*                            INTERNAL LINKING                                */
/* -------------------------------------------------------------------------- */

export interface InternalLinkOption {
  label: string;
  href: string;
  description: string;
  type: EntityType | "external";
}

/**
 * Build the internal-linking picker: NexTake entities resolve to site URLs so
 * editors never copy/paste them by hand (brief §10).
 */
export function internalLinkOptions(
  index: EntityNode[],
  siteOrigin = ""
): InternalLinkOption[] {
  return index.map((node) => ({
    label: node.label,
    href: publicHrefFor(node, siteOrigin),
    description: node.subtitle,
    type: node.type,
  }));
}

export function publicHrefFor(node: EntityNode, siteOrigin = ""): string {
  const base = siteOrigin.replace(/\/$/, "");
  switch (node.type) {
    case "article":
      return `${base}/articles/${node.id}`;
    case "startup":
      return `${base}/startups/${node.id}`;
    case "person":
      return `${base}/people/${node.id}`;
    case "industry":
      return `${base}/industries/${node.id}`;
    case "event":
      return `${base}/events/${node.id}`;
    case "source":
      return `${base}/sources/${node.id}`;
    default:
      return `${base}/${node.id}`;
  }
}

/** Markdown link snippet inserted by the editor toolbar. */
export function markdownLink(label: string, href: string): string {
  return `[${label}](${href})`;
}

/**
 * Rewrite markdown links to internal entities when the public host changes,
 * and report any links pointing at records that no longer exist.
 */
export function auditInternalLinks(
  content: string,
  index: EntityNode[]
): { broken: string[]; internal: number; external: number } {
  const ids = new Set(index.map((node) => `${node.type}:${node.id}`));
  const links = Array.from(content.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g));

  const broken: string[] = [];
  let internal = 0;
  let external = 0;

  for (const [, , href] of links) {
    if (!/^https?:/i.test(href)) {
      internal += 1;
      continue;
    }
    external += 1;
    const match = href.match(/\/(articles|startups|people|industries|events|sources)\/([^/?#]+)/);
    if (match) {
      const singular: Record<string, string> = {
        articles: "article",
        startups: "startup",
        people: "person",
        industries: "industry",
        events: "event",
        sources: "source",
      };
      const candidate = `${singular[match[1]] ?? match[1]}:${match[2]}`;
      if (!ids.has(candidate)) broken.push(href);
    }
  }

  return { broken, internal, external };
}
