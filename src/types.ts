export type NavPageId = 'home' | 'website' | 'blog' | 'logout';

export interface Article {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  status: 'published' | 'draft' | 'scheduled';
  views: number;
  readTime: string;
  avatar: string;
  image: string;
  isNew?: boolean;
}

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