/**
 * Admin navigation ids.
 *
 * The console grew from three screens (dashboard / website / blog) into the
 * Operations Department information architecture. The original ids are kept so
 * existing callers keep working:
 *   `home`    → Insights dashboard
 *   `website` → Publishing › Homepage (public site preview unaffected)
 *   `blog`    → Editorial › Articles
 */
export type NavPageId =
  /* system / shell */
  | 'home'
  | 'logout'
  /* editorial */
  | 'blog'
  | 'articles'
  | 'article-editor'
  | 'interviews'
  | 'shorts'
  | 'sources'
  | 'claims'
  | 'media'
  /* intelligence */
  | 'startups'
  | 'startup-dossier'
  | 'people'
  | 'companies'
  | 'industries'
  | 'events'
  /* relationships */
  | 'related-stories'
  | 'startup-coverage'
  | 'entity-suggestions'
  /* publishing */
  | 'website'
  | 'homepage'
  | 'newsletter'
  /* insights */
  | 'analytics'
  | 'activity'
  /* system */
  | 'users'
  | 'roles'
  | 'settings';

export interface Article {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  status: PublishStatus;
  views: number;
  likes?: number;
  comments?: number;
  saves?: number;
  readTime: string;
  avatar: string;
  image: string;
  isNew?: boolean;

  /* --- Editorial workflow (Operations brief §8–§11) ---------------------- */
  /** Article | interview | short. Video is handled by a separate system. */
  type?: 'article' | 'interview' | 'short';
  /** Reviewer-facing state layered on top of `status`. */
  reviewState?: 'draft' | 'in_review' | 'changes_requested' | 'approved';
  reviewerId?: string | null;
  submittedForReviewAt?: string | null;
  approvedAt?: string | null;
  archived?: boolean;
  archivedAt?: string | null;
  seo?: {
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    ogImageUrl?: string;
  };
  relatedArticleIds?: string[];
  relatedStartupIds?: string[];
  relatedPersonIds?: string[];
  relatedIndustryIds?: string[];
  relatedEventIds?: string[];
  sourceIds?: string[];
  featuredMediaId?: string | null;
  /** Interview-only: the person being interviewed. */
  intervieweeId?: string | null;

  slug?: string;
  sourceUrl?: string;
  sourceName?: string;
  sourceLogoUrl?: string | null;
  originalAuthor?: string | null;
  originalPublishedAt?: string | null;
  linkBehavior?: LinkBehavior;
  summary?: string;
  keyTakeaways?: string[];
  tags?: string[];
  coverImageUrl?: string;
  imageCredit?: string | null;
  canonicalUrl?: string;
  syndicationLicense?: SyndicationLicense | null;
  syndicatedBody?: string | null;
  publishedAt?: string | null;
  isBigStory?: boolean;
  inDailyEdit?: boolean;
  isBreaking?: boolean;
  relatedCompanyIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string | null;
}

export type PublishStatus = 'draft' | 'published' | 'scheduled';
export type LinkBehavior = 'reader' | 'external';
export type SyndicationLicense =
  | 'fair_use_summary'
  | 'full_licensed_syndication'
  | 'press_release';

export interface ArticleInput {
  slug: string;
  title: string;
  summary: string;
  category: string;
  status: PublishStatus;
  publishedAt: string | null;
  heroPriority: number | null;
  inDailyEdit: boolean;
  isBreaking: boolean;
  sourceUrl: string;
  sourceName: string;
  sourceLogoUrl: string | null;
  originalAuthor: string | null;
  originalPublishedAt: string | null;
  linkBehavior: LinkBehavior;
  keyTakeaways: string[];
  tags: string[];
  coverImageUrl: string;
  imageCredit: string | null;
  readTime: string;
  canonicalUrl: string;
  syndicationLicense: SyndicationLicense | null;
  syndicatedBody: string | null;
  relatedCompanyIds: string[];
}

export interface AdminProfile {
  id: string;
  email: string;
  fullName: string | null;
  /**
   * Roles are defined in `lib/permissions.ts`. The original `admin` / `editor`
   * pair is preserved (and still the only pair Supabase rows can hold today),
   * so existing sessions and RLS policies keep working.
   */
  role:
    | 'admin'
    | 'editor'
    | 'editor_in_chief'
    | 'managing_editor'
    | 'writer'
    | 'researcher'
    | 'fact_checker'
    | 'analyst';
  avatarUrl: string | null;
}

export interface Company {
  id: string;
  name: string;
  sector: string | null;
  websiteUrl: string | null;
}

export interface SiteSettings {
  siteName: string;
  slogan: string;
  heroHeadline: string;
  heroSubhead: string;
  navLinks: Array<{ label: string; href: string }>;
  breakingEnabled: boolean;
  breakingLabel: string;
  dailyEditEnabled: boolean;
  dailyEditSubject: string;
  newsletterEnabled: boolean;
  newsletterHeadline: string;
  contactEmail: string;
  updatedAt: string | null;
}

export const CATEGORIES = [
  'AI',
  'Business',
  'Design',
  'Fintech',
  'Hardware',
  'Management',
  'Product',
  'Software Engineering',
  'Other',
] as const;

export interface WebsiteConfig {
  siteName: string;
  tagline: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  searchEnabled: boolean;
  categoryFilterEnabled: boolean;
  newsletterEnabled: boolean;
  dailyEditLabel: string;
  newsletterHeadline: string;
  newsletterDescription: string;
  newsletterInputPlaceholder: string;
  newsletterButtonText: string;
  primaryCtaText: string;
  navLinks: Array<{ label: string; href: string; active?: boolean }>;
}

export interface ActivityItem {
  id: string;
  action: string;
  target: string;
  timestamp: string;
  user: string;
  type: 'publish' | 'edit' | 'subscriber' | 'system';
}

export interface SystemMetric {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  technicalDetail: string;
  progressPercent: number;
}
export interface DailyTip {
  id: string;
  title: string;
  content: string;
  category: string;
  image: string;
  author: string;
  status: "published" | "draft";
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}