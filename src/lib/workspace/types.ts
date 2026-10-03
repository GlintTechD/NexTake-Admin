/**
 * NexTake workspace domain model.
 *
 * These records extend the existing NexTake content models (articles, daily
 * tips, site settings) with the editorial / intelligence / relationship
 * entities described in the Operations Department brief:
 *
 *   EDITORIAL      → sources, claims, media assets
 *   INTELLIGENCE   → startups, dossiers, people, companies, industries, events
 *   RELATIONSHIPS  → related stories, coverage, entity suggestions
 *   PUBLISHING     → homepage placement, newsletter campaigns
 *   INSIGHTS       → audit trail, engagement events
 *   SYSTEM         → admin users, roles
 *
 * Every record carries an `origin` flag so sample workspace content is always
 * distinguishable from data pulled out of the live database — nothing here is
 * ever presented to an editor as if it were verified production data.
 */

/* -------------------------------------------------------------------------- */
/*                                PRIMITIVES                                  */
/* -------------------------------------------------------------------------- */

/** `sample` = shipped example workspace record, `live` = created by a user. */
export type EntityOrigin = "sample" | "live";

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  origin: EntityOrigin;
}

export type PublishState =
  | "draft"
  | "in_review"
  | "approved"
  | "scheduled"
  | "published"
  | "unpublished"
  | "archived";

/** Editorial content types supported by this system (video lives elsewhere). */
export type ContentType = "article" | "interview" | "short";

export type Country =
  | "Nigeria"
  | "Kenya"
  | "South Africa"
  | "Ghana"
  | "Egypt"
  | "Rwanda"
  | "Tanzania"
  | "Uganda"
  | "Senegal"
  | "Morocco"
  | "Ethiopia"
  | "Côte d'Ivoire"
  | "Other";

/* -------------------------------------------------------------------------- */
/*                               INTELLIGENCE                                 */
/* -------------------------------------------------------------------------- */

export type DisclosureStatus =
  | "disclosed"
  | "reported"
  | "estimated"
  | "undisclosed";

export interface FinancialMetric {
  id: string;
  /** "Total funding raised", "Valuation", "Revenue", "Employees", "Latest round" */
  label: string;
  value: string;
  currency?: string | null;
  disclosure: DisclosureStatus;
  sourceId: string | null;
  asOf: string | null;
}

export type FundingRoundType =
  | "pre_seed"
  | "seed"
  | "series_a"
  | "series_b"
  | "series_c_plus"
  | "debt"
  | "grant"
  | "ipo"
  | "acquisition"
  | "undisclosed";

export interface FundingRound {
  id: string;
  roundType: FundingRoundType;
  amount: number | null;
  currency: string;
  announcedAt: string | null;
  leadInvestor: string;
  investors: string[];
  sourceIds: string[];
  notes: string;
}

export type DevelopmentKind =
  | "partnership"
  | "funding"
  | "product"
  | "expansion"
  | "leadership"
  | "award"
  | "regulatory"
  | "other";

export interface Development {
  id: string;
  kind: DevelopmentKind;
  title: string;
  summary: string;
  date: string;
  sourceIds: string[];
}

export interface StartupDossierSeo {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
}

export type CompanyStatus =
  | "active"
  | "acquired"
  | "merged"
  | "ipo"
  | "shut_down"
  | "unknown";

export interface Startup extends BaseRecord {
  name: string;
  slug: string;
  logoUrl: string;
  description: string;
  industry: string;
  foundedYear: string;
  headquarters: string;
  country: Country | string;
  website: string;
  markets: string[];
  businessModel: string;
  companyStatus: CompanyStatus;
  stage: string;

  /** Dossier sections (section 13 of the brief). */
  financials: FinancialMetric[];
  fundingRounds: FundingRound[];
  products: string[];
  market: string;
  traction: string[];
  leadershipIds: string[];
  competitors: string[];
  technology: string[];
  risks: string[];
  developments: Development[];

  sourceIds: string[];
  articleIds: string[];
  tags: string[];
  seo: StartupDossierSeo;
}

export interface Person extends BaseRecord {
  name: string;
  role: string;
  organization: string;
  startupIds: string[];
  location: string;
  biography: string;
  currentRole: string;
  photoUrl: string;
  links: {
    linkedin: string;
    x: string;
    website: string;
  };
  articleIds: string[];
  interviewIds: string[];
}

export interface Company extends BaseRecord {
  name: string;
  sector: string;
  description: string;
  websiteUrl: string;
  country: string;
  relatedStartupIds: string[];
}

export interface Industry extends BaseRecord {
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  aliases: string[];
}

export type EventKind =
  | "conference"
  | "summit"
  | "launch"
  | "award"
  | "webinar"
  | "meetup"
  | "other";

export interface NexTakeEvent extends BaseRecord {
  name: string;
  kind: EventKind;
  startDate: string;
  endDate: string;
  location: string;
  url: string;
  description: string;
  organizer: string;
  startupIds: string[];
  personIds: string[];
  articleIds: string[];
}

/* -------------------------------------------------------------------------- */
/*                                 EDITORIAL                                  */
/* -------------------------------------------------------------------------- */

export type SourceType =
  | "news"
  | "press_release"
  | "report"
  | "interview"
  | "filing"
  | "database"
  | "social"
  | "other";

export type SourceReliability = "primary" | "secondary" | "tertiary";

export interface Source extends BaseRecord {
  publisher: string;
  title: string;
  url: string;
  publishedAt: string | null;
  author: string;
  type: SourceType;
  reliability: SourceReliability;
  accessedAt: string | null;
  notes: string;
  /** Claims this source substantiates (reusable across entities). */
  claimIds: string[];
}

export type ClaimType =
  | "funding_amount"
  | "leadership_change"
  | "market_expansion"
  | "metrics"
  | "product"
  | "other";

export type ConfidenceLevel = "verified" | "reported" | "unverified";

export interface EntityRef {
  type: "startup" | "person" | "company" | "article" | "industry" | "event";
  id: string;
  label: string;
}

export interface Claim extends BaseRecord {
  statement: string;
  claimType: ClaimType;
  value: string;
  confidence: ConfidenceLevel;
  sourceIds: string[];
  entityRefs: EntityRef[];
  verifiedBy: string;
  verifiedAt: string | null;
  notes: string;
}

export type MediaKind = "image" | "document" | "graphic" | "other";

export interface MediaAsset extends BaseRecord {
  filename: string;
  url: string;
  alt: string;
  caption: string;
  credit: string;
  kind: MediaKind;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  uploadedBy: string;
  folder: string;
}

/* -------------------------------------------------------------------------- */
/*                              RELATIONSHIPS                                 */
/* -------------------------------------------------------------------------- */

export type SuggestionTarget =
  | "startup"
  | "person"
  | "article"
  | "industry"
  | "tag"
  | "source";

export type SuggestionStatus = "pending" | "accepted" | "rejected";

export interface RelationshipSuggestion extends BaseRecord {
  /** The record being edited, e.g. `article:art-1` or `startup:st-1`. */
  hostType: "article" | "startup";
  hostId: string;
  hostLabel: string;
  targetType: SuggestionTarget;
  targetId: string;
  targetLabel: string;
  /** 0–1 heuristic score. Never a guarantee — the editor approves it. */
  confidence: number;
  reason: string;
  detectedEntities: string[];
  status: SuggestionStatus;
  decidedAt: string | null;
  decidedBy: string;
}

/* -------------------------------------------------------------------------- */
/*                                PUBLISHING                                  */
/* -------------------------------------------------------------------------- */

export interface HomepageSlot {
  id: string;
  articleId: string;
}

export interface HomepageConfig {
  heroMainId: string | null;
  heroSecondaryIds: string[];
  trendingIds: string[];
  editorsPickIds: string[];
  startupSpotlightId: string | null;
  /** "Latest" ordering replaces manual order when enabled, per section. */
  autoSort: {
    hero: "manual" | "latest";
    trending: "manual" | "latest";
    editorsPicks: "manual" | "latest";
  };
  updatedAt: string;
  updatedBy: string;
}

export type CampaignStatus =
  | "draft"
  | "in_review"
  | "scheduled"
  | "sent"
  | "paused";

export interface CampaignStats {
  delivered: number;
  opens: number;
  clicks: number;
  unsubscribes: number;
}

export interface NewsletterCampaign extends BaseRecord {
  name: string;
  subject: string;
  previewText: string;
  template: string;
  status: CampaignStatus;
  audience: "all" | "daily" | "weekly";
  articleIds: string[];
  content: string;
  scheduledFor: string | null;
  sentAt: string | null;
  /** Recipients at the moment the campaign was queued (0 until resolved). */
  recipients: number;
  stats: CampaignStats | null;
}

export interface NewsletterSubscriber extends BaseRecord {
  email: string;
  frequency: "daily" | "weekend" | "all";
  status: "subscribed" | "unsubscribed" | "bounced";
  source: string;
  subscribedAt: string;
}

/* -------------------------------------------------------------------------- */
/*                                  INSIGHTS                                  */
/* -------------------------------------------------------------------------- */

export type EngagementKind = "view" | "read" | "share" | "click" | "search";
export type TrafficSource =
  | "direct"
  | "search"
  | "social"
  | "referral"
  | "internal";

export interface EngagementEvent extends BaseRecord {
  at: string;
  entityType: "article" | "startup" | "person" | "page";
  entityId: string;
  kind: EngagementKind;
  trafficSource: TrafficSource;
  path: string;
  /** Where the event was captured — admin previews are tracked separately. */
  context: "public" | "admin";
  meta: Record<string, string>;
}

export type AuditAction =
  | "article.created"
  | "article.updated"
  | "article.published"
  | "article.scheduled"
  | "article.unpublished"
  | "article.archived"
  | "article.duplicated"
  | "article.deleted"
  | "article.review_requested"
  | "article.approved"
  | "startup.created"
  | "startup.updated"
  | "startup.deleted"
  | "person.created"
  | "person.updated"
  | "source.created"
  | "source.updated"
  | "claim.created"
  | "claim.updated"
  | "media.uploaded"
  | "media.updated"
  | "media.deleted"
  | "homepage.updated"
  | "newsletter.created"
  | "newsletter.updated"
  | "newsletter.scheduled"
  | "newsletter.sent"
  | "suggestion.accepted"
  | "suggestion.rejected"
  | "suggestion.detected"
  | "user.invited"
  | "user.updated"
  | "user.suspended"
  | "role.updated"
  | "settings.updated"
  | "taxonomy.created"
  | "taxonomy.updated"
  | "workspace.reseeded";

export interface AuditEvent extends BaseRecord {
  at: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  entityLabel: string;
  detail: string;
  changes: Array<{ field: string; from: string; to: string }>;
}

/* -------------------------------------------------------------------------- */
/*                                   SYSTEM                                   */
/* -------------------------------------------------------------------------- */

export type AdminRole =
  | "admin"
  | "editor_in_chief"
  | "managing_editor"
  | "editor"
  | "writer"
  | "researcher"
  | "fact_checker"
  | "analyst";

export type AccountStatus = "active" | "invited" | "suspended";

export interface WorkspaceUser extends BaseRecord {
  email: string;
  fullName: string;
  role: AdminRole;
  status: AccountStatus;
  invitedAt: string | null;
  lastActiveAt: string | null;
  avatarUrl: string;
  notes: string;
}

export interface RoleDefinition {
  id: AdminRole;
  name: string;
  description: string;
  /** Permission keys from `lib/permissions.ts`. `*` grants everything. */
  permissions: string[];
  isSystem: boolean;
}

/** Role definitions as stored in the workspace (editable permissions). */
export interface StoredRoleDefinition extends BaseRecord {
  /** Role key — also the record id. */
  role: AdminRole;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

/* -------------------------------------------------------------------------- */
/*                                 TAXONOMY                                   */
/* -------------------------------------------------------------------------- */

export type TaxonomyKind = "category" | "tag" | "industry";

export interface TaxonomyTerm extends BaseRecord {
  kind: TaxonomyKind;
  name: string;
  slug: string;
  aliases: string[];
  description: string;
}

/* -------------------------------------------------------------------------- */
/*                            WORKSPACE COLLECTIONS                           */
/* -------------------------------------------------------------------------- */

export type WorkspaceCollection =
  | "startups"
  | "people"
  | "companies"
  | "industries"
  | "events"
  | "sources"
  | "claims"
  | "media"
  | "suggestions"
  | "campaigns"
  | "subscribers"
  | "engagement"
  | "audit"
  | "users"
  | "roles"
  | "taxonomy";

export type PersistenceMode = "database" | "local" | "local-fallback";

export interface CollectionHealth {
  collection: WorkspaceCollection;
  mode: PersistenceMode;
  message: string;
}
