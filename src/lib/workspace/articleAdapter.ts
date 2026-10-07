/**
 * Article <-> storage bridge.
 *
 * The console already stores articles in two shapes:
 *   • Supabase `articles` rows (snake_case, mapped by `lib/backend/mappers`)
 *   • the legacy local mock client (`nextake_articles_db`, snake_case rows)
 *
 * Both are preserved here so production data and any offline drafts survive the
 * extension. The richer editorial fields (review state, SEO, relationships,
 * sources) are additive and optional.
 */

import type { Article, ArticleInput, PublishStatus } from "../../types";
import { INITIAL_ARTICLES } from "../../data/initialData";
import type { Startup } from "./types";

export const LEGACY_ARTICLES_KEY = "nextake_articles_db";

type Row = Record<string, unknown>;

const str = (value: unknown): string => (value == null ? "" : String(value));

const strArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((entry) => str(entry)).filter(Boolean);
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

export function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Fill every optional editorial field so the UI can rely on them. */
export function normalizeArticle(article: Article): Article {
  const mediaPlacement = article.mediaPlacement ?? (
    article.type === "short" || article.type === "interview" || article.type === "video"
      ? article.type
      : null
  );
  const type = mediaPlacement ?? article.type ?? "article";
  return {
    ...article,
    type,
    mediaPlacement,
    reviewState:
      article.reviewState ??
      (article.status === "published"
        ? "approved"
        : article.status === "scheduled"
        ? "approved"
        : "draft"),
    seo: {
      slug: article.seo?.slug || article.slug || slugifyTitle(article.title),
      metaTitle: article.seo?.metaTitle ?? "",
      metaDescription: article.seo?.metaDescription ?? "",
      ogImageUrl: article.seo?.ogImageUrl ?? "",
    },
    tags: article.tags ?? [],
    relatedArticleIds: article.relatedArticleIds ?? [],
    relatedStartupIds: article.relatedStartupIds ?? [],
    relatedPersonIds: article.relatedPersonIds ?? [],
    relatedIndustryIds: article.relatedIndustryIds ?? [],
    relatedEventIds: article.relatedEventIds ?? [],
    sourceIds: article.sourceIds ?? [],
    featuredMediaId: article.featuredMediaId ?? null,
    archived: article.archived ?? false,
    archivedAt: article.archivedAt ?? null,
    reviewerId: article.reviewerId ?? null,
    submittedForReviewAt: article.submittedForReviewAt ?? null,
    approvedAt: article.approvedAt ?? null,
    intervieweeId: article.intervieweeId ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/*                            LEGACY ROW MAPPING                              */
/* -------------------------------------------------------------------------- */

export function rowToArticle(row: Row): Article {
  return normalizeArticle({
    id: str(row.id),
    category: str(row.category) || "Other",
    title: str(row.title),
    excerpt: str(row.excerpt) || str(row.summary),
    content: str(row.content) || str(row.syndicated_body),
    author: str(row.author),
    date: str(row.date) || str(row.created_at),
    status: (str(row.status) || "draft") as PublishStatus,
    views: Number(row.views ?? 0) || 0,
    likes: Number(row.likes ?? 0) || 0,
    comments: Number(row.comments ?? 0) || 0,
    saves: Number(row.saves ?? 0) || 0,
    readTime: str(row.read_time) || "4 min read",
    avatar: str(row.avatar),
    image: str(row.image) || str(row.cover_image_url),
    coverImageUrl: str(row.cover_image_url) || str(row.image),
    isNew: Boolean(row.is_new),
    isBigStory: Number(row.hero_priority ?? 0) > 0,
    isBreaking: Boolean(row.is_breaking) || Boolean(row.is_new),
    slug: str(row.slug) || slugifyTitle(str(row.title)),
    tags: strArray(row.tags),
    type: (str(row.type) || "article") as Article["type"],
    mediaPlacement: (str(row.media_placement) || null) as Article["mediaPlacement"],
    contentType: str(row.content_type) === "media" || str(row.video_url) ? "media" : "article",
    videoUrl: str(row.video_url) || null,
    reviewState: (str(row.review_state) || undefined) as Article["reviewState"],
    publishedAt: row.published_at ? str(row.published_at) : null,
    createdAt: str(row.created_at) || undefined,
    updatedAt: str(row.updated_at) || undefined,
    updatedBy: row.updated_by ? str(row.updated_by) : null,
    seo: {
      slug: str(row.slug) || slugifyTitle(str(row.title)),
      metaTitle: str(row.meta_title),
      metaDescription: str(row.meta_description),
      ogImageUrl: str(row.og_image_url),
    },
    relatedStartupIds: strArray(row.related_startup_ids),
    relatedPersonIds: strArray(row.related_person_ids),
    relatedArticleIds: strArray(row.related_article_ids),
    relatedIndustryIds: strArray(row.related_industry_ids),
    relatedEventIds: strArray(row.related_event_ids),
    sourceIds: strArray(row.source_ids),
    featuredMediaId: row.featured_media_id ? str(row.featured_media_id) : null,
    intervieweeId: row.interviewee_id ? str(row.interviewee_id) : null,
  });
}

export function articleToRow(article: Article): Row {
  return {
    id: article.id,
    category: article.category,
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    author: article.author,
    date: article.date,
    status: article.status,
    views: article.views ?? 0,
    read_time: article.readTime,
    avatar: article.avatar,
    image: article.image,
    cover_image_url: article.coverImageUrl ?? article.image,
    is_new: Boolean(article.isNew),
    hero_priority: article.isBigStory ? 1 : 0,
    slug: article.seo?.slug || article.slug || slugifyTitle(article.title),
    meta_title: article.seo?.metaTitle ?? "",
    meta_description: article.seo?.metaDescription ?? "",
    og_image_url: article.seo?.ogImageUrl ?? "",
    type: article.type ?? "article",
    content_type: article.contentType ?? "article",
    media_placement: article.mediaPlacement ?? null,
    video_url: article.videoUrl ?? null,
    review_state: article.reviewState ?? "draft",
    tags: article.tags ?? [],
    related_startup_ids: article.relatedStartupIds ?? [],
    related_person_ids: article.relatedPersonIds ?? [],
    related_article_ids: article.relatedArticleIds ?? [],
    related_industry_ids: article.relatedIndustryIds ?? [],
    related_event_ids: article.relatedEventIds ?? [],
    source_ids: article.sourceIds ?? [],
    featured_media_id: article.featuredMediaId ?? null,
    interviewee_id: article.intervieweeId ?? null,
    published_at: article.publishedAt ?? null,
    created_at: article.createdAt ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: article.updatedBy ?? "",
  };
}

/* -------------------------------------------------------------------------- */
/*                          LOCAL (OFFLINE) ARTICLE STORE                     */
/* -------------------------------------------------------------------------- */

export function readLocalArticles(): Article[] | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_ARTICLES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((row) => rowToArticle(row as Row));
  } catch {
    return null;
  }
}

export function writeLocalArticles(articles: Article[]): void {
  try {
    window.localStorage.setItem(
      LEGACY_ARTICLES_KEY,
      JSON.stringify(articles.map(articleToRow))
    );
  } catch {
    /* storage unavailable */
  }
}

/* -------------------------------------------------------------------------- */
/*                                 SAMPLE SEED                                */
/* -------------------------------------------------------------------------- */

/**
 * The sample workspace ships the original NexTake articles plus the editorial
 * fields the new console works with (types, tags, SEO, relationships, sources).
 */
export function seedArticles(): Article[] {
  const baseArticles = INITIAL_ARTICLES.map(normalizeArticle);

  const extra: Article[] = [
    normalizeArticle({
      id: "art-7",
      category: "Funding",
      title: "African fintech funding reset: what the $1.4bn H1 number means",
      excerpt:
        "Funding is down from the 2021 peak, but the composition has changed — fewer megadeals, more revenue-linked rounds.",
      content:
        "African fintech startups raised $1.4bn in the first half of 2026 according to CB Insights. Flutterwave and Paystack continue to anchor the payments segment, while Nairobi emerges as the default hiring market for Nigerian teams.",
      author: "Amara Nwosu",
      date: "1 Oct 2026",
      status: "published",
      views: 3120,
      readTime: "6 min read",
      avatar: "https://i.pravatar.cc/64?img=45",
      image:
        "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&h=500&fit=crop",
      type: "article",
      tags: ["fintech", "venture capital", "Nigeria", "Kenya"],
      reviewState: "approved",
      relatedStartupIds: ["startup-flutterwave", "startup-paystack"],
      sourceIds: ["src-1", "src-3"],
      publishedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    }),
    normalizeArticle({
      id: "art-8",
      category: "Startups",
      title: "Interview: inside M-KOPA's pay-as-you-go solar playbook",
      excerpt:
        "Jesse Moore on why consumer asset financing — not hardware — is the moat in African energy access.",
      content:
        "NexTake sat down with Jesse Moore to unpack M-KOPA's credit model, the mobile-money collection rails, and what changes when smartphone financing overtakes solar kits.",
      author: "Zainab Yusuf",
      date: "29 Sep 2026",
      status: "published",
      views: 1840,
      readTime: "9 min read",
      avatar: "https://i.pravatar.cc/64?img=32",
      image:
        "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=500&fit=crop",
      type: "interview",
      tags: ["climate tech", "Kenya", "venture capital"],
      reviewState: "approved",
      relatedStartupIds: ["startup-m-kopa"],
      relatedPersonIds: ["person-jesse-moore"],
      intervieweeId: "person-jesse-moore",
      sourceIds: ["src-6"],
      publishedAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    }),
    normalizeArticle({
      id: "art-9",
      category: "Cybersecurity",
      title: "West African banks are buying managed detection, not tools",
      excerpt:
        "Security budgets in Lagos and Accra are shifting from product licences to 24/7 monitoring retainers.",
      content:
        "UCI Digital's Lagos SOC is one of a handful of local operations bidding for bank security contracts that used to go to global MSSPs.",
      author: "Brian Kimani",
      date: "27 Sep 2026",
      status: "published",
      views: 960,
      readTime: "5 min read",
      avatar: "https://i.pravatar.cc/64?img=15",
      image:
        "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=500&fit=crop",
      type: "article",
      tags: ["Nigeria", "venture capital"],
      reviewState: "approved",
      relatedStartupIds: ["startup-uci-digital"],
      sourceIds: ["src-10"],
      publishedAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
    }),
    normalizeArticle({
      id: "art-10",
      category: "Markets",
      title: "Why East African freight startups stalled",
      excerpt:
        "Sendy's wind-down exposes the unit economics problem in B2B freight marketplaces across the region.",
      content:
        "Freight marketplaces in East Africa struggled to convert transaction volume into contribution margin as fuel and asset costs climbed.",
      author: "Amara Nwosu",
      date: "25 Sep 2026",
      status: "published",
      views: 1420,
      readTime: "7 min read",
      avatar: "https://i.pravatar.cc/64?img=20",
      image:
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=500&fit=crop",
      type: "article",
      tags: ["Kenya", "venture capital"],
      reviewState: "approved",
      relatedStartupIds: ["startup-sendy"],
      sourceIds: ["src-7"],
      publishedAt: new Date(Date.now() - 8 * 86_400_000).toISOString(),
    }),
    normalizeArticle({
      id: "art-11",
      category: "Policy",
      title: "Kenya's licensing registry is becoming the region's credibility filter",
      excerpt:
        "Payment providers are increasingly judged by whether they appear on the CMA registry.",
      content:
        "Short take: licensing disclosure is now a diligence input for investors pricing East African payment risk.",
      author: "Chioma Eze",
      date: "2 Oct 2026",
      status: "draft",
      views: 0,
      readTime: "2 min read",
      avatar: "https://i.pravatar.cc/64?img=48",
      image:
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=500&fit=crop",
      type: "short",
      reviewState: "in_review",
      tags: ["Kenya", "payments"],
      relatedStartupIds: ["startup-paystack"],
      sourceIds: ["src-5"],
      submittedForReviewAt: new Date(Date.now() - 86_400_000).toISOString(),
    }),
    normalizeArticle({
      id: "art-12",
      category: "Innovation",
      title: "Nairobi's engineering hiring pool is now Nigeria's talent strategy",
      excerpt:
        "Short take: cost and timezone arbitrage are pushing West African scale-ups to open Kenyan engineering hubs.",
      content:
        "Short take: Kenyan engineering salaries and English-language delivery maturity make Nairobi the default expansion city.",
      author: "Lerato Dube",
      date: "3 Oct 2026",
      status: "scheduled",
      views: 0,
      readTime: "3 min read",
      avatar: "https://i.pravatar.cc/64?img=27",
      image:
        "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&h=500&fit=crop",
      type: "short",
      reviewState: "approved",
      tags: ["Kenya", "Nigeria"],
      sourceIds: ["src-7"],
      publishedAt: new Date(Date.now() + 86_400_000).toISOString(),
      relatedStartupIds: ["startup-flutterwave"],
    }),
  ];

  return [...baseArticles, ...extra];
}

/* -------------------------------------------------------------------------- */
/*                              BACKEND BRIDGE                                */
/* -------------------------------------------------------------------------- */

/**
 * Convert a console article into the `ArticleInput` shape the existing
 * Supabase/demo backends accept, so production writes keep flowing through the
 * same code path as before this extension.
 */
export function articleToInput(article: Article): ArticleInput {
  const slug = article.seo?.slug || article.slug || slugifyTitle(article.title);
  const isValidUuid =
    typeof article.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(article.id);

  return {
    id: isValidUuid ? article.id : undefined,
    slug,
    title: article.title,
    summary: article.excerpt,
    category: article.category,
    status: article.status,
    publishedAt: article.publishedAt ?? null,
    heroPriority: article.isBigStory ? 1 : null,
    inDailyEdit: !!article.inDailyEdit,
    isBreaking: !!article.isBreaking,
    sourceUrl: article.sourceUrl ?? "",
    sourceName: article.sourceName ?? "",
    sourceLogoUrl: article.sourceLogoUrl ?? null,
    originalAuthor: article.originalAuthor ?? article.author,
    originalPublishedAt: article.originalPublishedAt ?? null,
    linkBehavior: article.linkBehavior ?? "reader",
    keyTakeaways: article.keyTakeaways ?? [],
    tags: article.tags ?? [],
    coverImageUrl: article.coverImageUrl ?? article.image,
    imageCredit: article.imageCredit ?? null,
    readTime: article.readTime,
    canonicalUrl: article.canonicalUrl ?? "",
    syndicationLicense: article.syndicationLicense ?? null,
    syndicatedBody: article.syndicatedBody ?? article.content,
    relatedCompanyIds: article.relatedCompanyIds ?? [],
    contentType: article.contentType ?? "article",
    mediaPlacement: article.mediaPlacement ?? null,
    videoUrl: article.videoUrl ?? null,
  };
}

export function applyInputToArticle(article: Article, input: ArticleInput): Article {
  return normalizeArticle({
    ...article,
    title: input.title,
    excerpt: input.summary,
    category: input.category,
    type: input.mediaPlacement ?? article.type,
    status: input.status,
    mediaPlacement: input.mediaPlacement,
    publishedAt: input.publishedAt,
    isBigStory: (input.heroPriority ?? 0) > 0,
    inDailyEdit: input.inDailyEdit,
    isBreaking: input.isBreaking,
    tags: input.tags,
    content: input.syndicatedBody ?? article.content,
    coverImageUrl: input.coverImageUrl,
    image: input.coverImageUrl,
    readTime: input.readTime,
    seo: { ...article.seo, slug: input.slug },
    relatedStartupIds: article.relatedStartupIds,
    updatedBy: article.updatedBy,
  });
}

/** Human label for the derived editorial state shown in listings. */
export function editorialStateLabel(article: Article): string {
  if (article.archived) return "Archived";
  if (article.status === "scheduled") return "Scheduled";
  if (article.status === "published") return "Published";
  if (article.reviewState === "in_review") return "In review";
  if (article.reviewState === "changes_requested") return "Changes requested";
  if (article.reviewState === "approved") return "Approved";
  return "Draft";
}

/** Reading time derived from the rendered body copy. */
export function readingTimeLabel(content: string): string {
  const words = `${content}`.match(/[A-Za-z0-9'\u2019-]+/g)?.length ?? 0;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

export function articleWordCount(article: Article): number {
  const text = `${article.title} ${article.excerpt} ${article.content}`;
  return text.split(/\s+/).filter(Boolean).length;
}

/** Startups linked to an article, in either direction. */
export function linkedStartupIds(article: Article, startups: Startup[]): string[] {
  const ids = new Set(article.relatedStartupIds ?? []);
  for (const startup of startups) {
    if (startup.articleIds.includes(article.id)) ids.add(startup.id);
  }
  return Array.from(ids);
}
