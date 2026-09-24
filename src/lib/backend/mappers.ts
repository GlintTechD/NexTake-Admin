import type {
  Article,
  ArticleInput,
  Company,
  LinkBehavior,
  PublishStatus,
  SiteSettings,
  SyndicationLicense,
} from "../../types";

type Row = Record<string, unknown>;

const str = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

const nullableStr = (value: unknown): string | null => {
  const text = str(value).trim();
  return text.length > 0 ? text : null;
};

const num = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (value: unknown): boolean => value === true;

const stringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((entry) => str(entry));
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((entry) => str(entry));
    } catch {
      return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const PUBLISH_STATUS_VALUES: PublishStatus[] = [
  "draft",
  "published",
  "scheduled",
];

const asStatus = (value: unknown): PublishStatus => {
  const text = str(value) as PublishStatus;
  return PUBLISH_STATUS_VALUES.includes(text) ? text : "draft";
};

const asLinkBehavior = (value: unknown): LinkBehavior =>
  str(value) === "external" ? "external" : "reader";

const asLicense = (value: unknown): SyndicationLicense | null => {
  const text = str(value) as SyndicationLicense;
  return text === "fair_use_summary" ||
    text === "full_licensed_syndication" ||
    text === "press_release"
    ? text
    : null;
};

/**
 * Maps a database row onto the shared article model.
 *
 * Tolerant by design: the public blog may still be running against rows
 * written before the editorial CMS fields existed, so every new field falls
 * back to its nearest legacy column (`excerpt` → summary, `content` →
 * syndicated body, `image` → cover image, `read_time` → read time, …).
 */
export function mapArticleRow(row: Row): Article {
  const title = str(row.title);
  const createdAt = str(row.created_at) || new Date().toISOString();

  return {
    id: str(row.id),
    slug: str(row.slug) || slugifyFallback(title),

    sourceUrl: str(row.source_url) || str(row.canonical_url),
    sourceName: str(row.source_name),
    sourceLogoUrl: nullableStr(row.source_logo_url),
    originalAuthor: nullableStr(row.original_author) ?? nullableStr(row.author),
    originalPublishedAt: nullableStr(row.original_published_at),
    linkBehavior: asLinkBehavior(row.link_behavior),

    title,
    excerpt: str(row.excerpt) || str(row.summary),
    content: str(row.content) || str(row.syndicated_body),
    author: str(row.author) || str(row.original_author),
    date: str(row.date) || createdAt,
    summary: str(row.summary) || str(row.excerpt),
    keyTakeaways: stringArray(row.key_takeaways),
    category: str(row.category) || "Other",
    tags: stringArray(row.tags),
    coverImageUrl: str(row.cover_image_url) || str(row.image),
    imageCredit: nullableStr(row.image_credit),
    readTime: str(row.read_time),
    avatar: str(row.avatar),
    image: str(row.image) || str(row.cover_image_url),

    canonicalUrl: str(row.canonical_url) || str(row.source_url),
    syndicationLicense: asLicense(row.syndication_license),
    syndicatedBody: nullableStr(row.syndicated_body) ?? nullableStr(row.content),

    status: asStatus(row.status),
    publishedAt: nullableStr(row.published_at),
    isBigStory: num(row.hero_priority) > 0,
    inDailyEdit: bool(row.in_daily_edit),
    isBreaking: bool(row.is_breaking) || bool(row.is_new),
    relatedCompanyIds: stringArray(row.related_company_ids),

    views: num(row.views),
    createdAt,
    updatedAt: str(row.updated_at) || createdAt,
    updatedBy: nullableStr(row.updated_by),
  };
}

function slugifyFallback(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Maps the shared model back onto database columns. */
export function articleInputToRow(
  input: ArticleInput,
  actor: string
): Record<string, unknown> {
  return {
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    category: input.category,
    status: input.status,
    published_at: input.publishedAt,
    hero_priority: input.heroPriority,
    in_daily_edit: input.inDailyEdit,
    is_breaking: input.isBreaking,

    source_url: input.sourceUrl,
    source_name: input.sourceName,
    source_logo_url: input.sourceLogoUrl,
    original_author: input.originalAuthor,
    original_published_at: input.originalPublishedAt,
    link_behavior: input.linkBehavior,

    key_takeaways: input.keyTakeaways,
    tags: input.tags,
    cover_image_url: input.coverImageUrl,
    image_credit: input.imageCredit,
    read_time: input.readTime,

    canonical_url: input.canonicalUrl,
    syndication_license: input.syndicationLicense,
    syndicated_body: input.syndicatedBody,

    related_company_ids: input.relatedCompanyIds,

    /* Legacy columns kept in sync so an older public blog build keeps working. */
    excerpt: input.summary,
    content: input.syndicatedBody,
    image: input.coverImageUrl,
    is_new: input.isBreaking,

    updated_by: actor,
  };
}

export function mapCompanyRow(row: Row): Company {
  return {
    id: str(row.id),
    name: str(row.name),
    sector: nullableStr(row.sector),
    websiteUrl: nullableStr(row.website_url),
  };
}

export function mapSettings(row: Row | null): SiteSettings {
  if (!row) return DEFAULT_SETTINGS;

  const navLinks = Array.isArray(row.nav_links)
    ? (row.nav_links as Array<{ label?: unknown; href?: unknown }>).map(
        (link) => ({ label: str(link.label), href: str(link.href) })
      )
    : DEFAULT_SETTINGS.navLinks;

  return {
    siteName: str(row.site_name) || DEFAULT_SETTINGS.siteName,
    slogan: str(row.slogan) || DEFAULT_SETTINGS.slogan,
    heroHeadline: str(row.hero_headline) || DEFAULT_SETTINGS.heroHeadline,
    heroSubhead: str(row.hero_subhead) || DEFAULT_SETTINGS.heroSubhead,
    navLinks: navLinks.length > 0 ? navLinks : DEFAULT_SETTINGS.navLinks,
    breakingEnabled: bool(row.breaking_enabled),
    breakingLabel: str(row.breaking_label) || DEFAULT_SETTINGS.breakingLabel,
    dailyEditEnabled: bool(row.daily_edit_enabled),
    dailyEditSubject:
      str(row.daily_edit_subject) || DEFAULT_SETTINGS.dailyEditSubject,
    newsletterEnabled: row.newsletter_enabled !== false,
    newsletterHeadline:
      str(row.newsletter_headline) || DEFAULT_SETTINGS.newsletterHeadline,
    contactEmail: str(row.contact_email) || DEFAULT_SETTINGS.contactEmail,
    updatedAt: nullableStr(row.updated_at),
  };
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "NexTake",
  slogan: "TECHNOLOGY NEWS. INTELLIGENTLY CURATED.",
  heroHeadline: "The signal in technology news.",
  heroSubhead:
    "Every story summarised in three sentences, attributed to the source that broke it.",
  navLinks: [
    { label: "Feed Wire", href: "#feed" },
    { label: "Shorts", href: "#shorts" },
    { label: "Explore", href: "#explore" },
    { label: "Contact Us", href: "#contact" },
  ],
  breakingEnabled: true,
  breakingLabel: "BREAKING",
  dailyEditEnabled: true,
  dailyEditSubject: "The Daily Edit",
  newsletterEnabled: true,
  newsletterHeadline: "Get The Daily Edit in your inbox",
  contactEmail: "nextakeafrica@gmail.com",
  updatedAt: null,
};

export function settingsToRow(settings: SiteSettings): Record<string, unknown> {
  return {
    site_name: settings.siteName,
    slogan: settings.slogan,
    hero_headline: settings.heroHeadline,
    hero_subhead: settings.heroSubhead,
    nav_links: settings.navLinks,
    breaking_enabled: settings.breakingEnabled,
    breaking_label: settings.breakingLabel,
    daily_edit_enabled: settings.dailyEditEnabled,
    daily_edit_subject: settings.dailyEditSubject,
    newsletter_enabled: settings.newsletterEnabled,
    newsletter_headline: settings.newsletterHeadline,
    contact_email: settings.contactEmail,
    updated_at: new Date().toISOString(),
  };
}
