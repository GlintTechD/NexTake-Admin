import { createContext, useContext } from "react";
import type { Article, SiteSettings } from "../../types";
import type {
  AuditAction,
  AuditEvent,
  CampaignStatus,
  Claim,
  CollectionHealth,
  Company,
  EngagementEvent,
  EntityOrigin,
  HomepageConfig,
  Industry,
  MediaAsset,
  NewsletterCampaign,
  NewsletterSubscriber,
  NexTakeEvent,
  Person,
  RelationshipSuggestion,
  StoredRoleDefinition,
  Source,
  Startup,
  TaxonomyKind,
  TaxonomyTerm,
  WorkspaceCollection,
  WorkspaceUser,
} from "./types";
import type { EngagementKind, TrafficSource } from "./types";

/** Input accepted by `create` — ids and bookkeeping fields are generated. */
export type NewRecord<T> = Omit<
  T,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "createdBy"
  | "updatedBy"
  | "origin"
  | "slug"
> & {
  id?: string;
  slug?: string;
  origin?: EntityOrigin;
};

export interface CollectionApi<T> {
  items: T[];
  /** Create a record; returns the stored record (with id + timestamps). */
  create(input: NewRecord<T>): T;
  update(id: string, patch: Partial<T>): T | null;
  remove(id: string): void;
  byId(id: string | null | undefined): T | null;
  replaceAll(items: T[]): void;
}

export interface ArticleApi {
  items: Article[];
  byId(id: string | null | undefined): Article | null;
  create(article: Article): Article;
  /** Full save from the editor — reports whether persistence succeeded. */
  save(article: Article): Promise<{ ok: boolean; error?: string }>;
  remove(id: string): Promise<void>;
  duplicate(id: string): Article | null;
  setStatus(id: string, status: Article["status"], publishedAt?: string | null): void;
  submitForReview(id: string): void;
  approve(id: string): void;
  archive(id: string): void;
  restore(id: string): void;
}

export interface SuggestionApi extends CollectionApi<RelationshipSuggestion> {
  /** Run the relationship engine for a host record. Never auto-applies. */
  generate(host: {
    type: "article" | "startup";
    id: string;
    label: string;
    text: string;
    linkedStartupIds?: string[];
    linkedPersonIds?: string[];
    linkedArticleIds?: string[];
    category?: string;
    tags?: string[];
  }): RelationshipSuggestion[];
  decide(id: string, status: "accepted" | "rejected"): void;
  pendingFor(hostId: string): RelationshipSuggestion[];
  acceptedFor(hostId: string): RelationshipSuggestion[];
}

export interface EngagementApi extends CollectionApi<EngagementEvent> {
  track(input: {
    entityType: EngagementEvent["entityType"];
    entityId: string;
    kind: EngagementKind;
    trafficSource?: TrafficSource;
    path?: string;
    context?: EngagementEvent["context"];
    meta?: Record<string, string>;
  }): void;
}

export interface AuditApi extends CollectionApi<AuditEvent> {
  log(input: {
    action: AuditAction;
    entityType: string;
    entityId: string;
    entityLabel: string;
    detail?: string;
    changes?: Array<{ field: string; from: string; to: string }>;
  }): void;
}

export interface TaxonomyApi extends CollectionApi<TaxonomyTerm> {
  /**
   * Resolve a typed value against the controlled vocabulary, registering a new
   * canonical term the first time a concept appears. `FinTech`, `fintech` and
   * `FINTECH` all resolve to the same term.
   */
  resolve(kind: TaxonomyKind, value: string): string;
  canonicalize(kind: TaxonomyKind, values: string[]): string[];
  byKind(kind: TaxonomyKind): TaxonomyTerm[];
  names(kind: TaxonomyKind): string[];
}

export interface HomepageApi {
  config: HomepageConfig;
  save(next: HomepageConfig, detail?: string): void;
}

export interface NewsletterApi extends CollectionApi<NewsletterCampaign> {
  subscribers: CollectionApi<NewsletterSubscriber>;
  setStatus(id: string, status: CampaignStatus): void;
  markSent(id: string, recipients: number): void;
  metrics(): {
    total: number;
    active: number;
    unsubscribed: number;
    bounced: number;
    byFrequency: Record<string, number>;
    newest: NewsletterSubscriber[];
  };
}

export interface WorkspaceContextValue {
  ready: boolean;
  /** Which backing store each collection is using right now. */
  health: CollectionHealth[];
  /** True while the workspace holds shipped sample records. */
  isSampleWorkspace: boolean;
  backendMode: "supabase" | "demo";
  actor: string;

  articles: ArticleApi;
  startups: CollectionApi<Startup>;
  people: CollectionApi<Person>;
  companies: CollectionApi<Company>;
  industries: CollectionApi<Industry>;
  events: CollectionApi<NexTakeEvent>;
  sources: CollectionApi<Source>;
  claims: CollectionApi<Claim>;
  media: CollectionApi<MediaAsset>;
  suggestions: SuggestionApi;
  newsletter: NewsletterApi;
  engagement: EngagementApi;
  audit: AuditApi;
  users: CollectionApi<WorkspaceUser>;
  roles: CollectionApi<StoredRoleDefinition>;
  taxonomy: TaxonomyApi;
  homepage: HomepageApi;

  settings: SiteSettings;
  saveSettings(next: SiteSettings): Promise<void>;

  /** Wipe locally stored workspace records back to the shipped sample set. */
  resetWorkspace(): void;
  /** Snapshot of everything this workspace holds, as JSON. */
  exportWorkspaceJson(): string;
  healthFor(collection: WorkspaceCollection): CollectionHealth | null;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used inside <WorkspaceProvider>.");
  }
  return context;
}
