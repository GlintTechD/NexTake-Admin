export type NavPageId = 'home' | 'website' | 'blog' | 'logout';

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
  readTime: string;
  avatar: string;
  image: string;
  isNew?: boolean;

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
  role: 'admin' | 'editor';
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