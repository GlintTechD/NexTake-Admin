/**
 * Admin information architecture.
 *
 * Mirrors the structure in the Operations Department brief exactly:
 *
 *   EDITORIAL / INTELLIGENCE / RELATIONSHIPS / PUBLISHING / INSIGHTS / SYSTEM
 *
 * The public site navigation is defined separately (and untouched) by
 * `SiteSettings.navLinks` and `WebsiteConfig.navLinks`.
 */

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  Camera,
  FileText,
  Globe,
  Handshake,
  Inbox,
  LayoutDashboard,
  Link2,
  ListChecks,
  Mail,
  Mic,
  Newspaper,
  Quote,
  Settings,
  ShieldCheck,
  Tags,
  Users,
  UserSquare2,
  Zap,
} from "lucide-react";
import type { NavPageId } from "../types";
import type { Permission } from "./permissions";

export interface RouteParams {
  articleId?: string;
  startupId?: string;
  personId?: string;
  campaignId?: string;
  sourceId?: string;
  mediaId?: string;
  userId?: string;
}

export interface AdminRoute {
  page: NavPageId;
  params: RouteParams;
}

export interface NavItem {
  id: NavPageId;
  label: string;
  description: string;
  icon: LucideIcon;
  permission?: Permission;
  /** Optional hash segment used for deep links, e.g. `editorial/articles`. */
  path?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  caption: string;
  icon: LucideIcon;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    caption: "What is happening right now",
    icon: LayoutDashboard,
    items: [
      {
        id: "home",
        label: "Dashboard",
        description: "Queue, status & activity",
        icon: LayoutDashboard,
        permission: "dashboard.view",
        path: "dashboard",
      },
    ],
  },
  {
    id: "editorial",
    label: "Editorial",
    caption: "What are we publishing?",
    icon: Newspaper,
    items: [
      {
        id: "blog",
        label: "Articles",
        description: "Draft, review, publish",
        icon: FileText,
        permission: "articles.view",
        path: "editorial/articles",
      },
      {
        id: "interviews",
        label: "Interviews",
        description: "Q&A and profile pieces",
        icon: Mic,
        permission: "articles.view",
        path: "editorial/interviews",
      },
      {
        id: "shorts",
        label: "Shorts",
        description: "Short takes & briefs",
        icon: Quote,
        permission: "articles.view",
        path: "editorial/shorts",
      },
      {
        id: "sources",
        label: "Sources",
        description: "Publications & citations",
        icon: Link2,
        permission: "sources.view",
        path: "editorial/sources",
      },
      {
        id: "claims",
        label: "Claims",
        description: "Verifiable statements",
        icon: BadgeCheck,
        permission: "sources.view",
        path: "editorial/claims",
      },
      {
        id: "media",
        label: "Media library",
        description: "Images & documents",
        icon: Camera,
        permission: "media.view",
        path: "editorial/media",
      },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    caption: "What do we know about the ecosystem?",
    icon: Zap,
    items: [
      {
        id: "startups",
        label: "Startups",
        description: "Dossiers & coverage",
        icon: Zap,
        permission: "startups.view",
        path: "intelligence/startups",
      },
      {
        id: "people",
        label: "People",
        description: "Executives & sources",
        icon: UserSquare2,
        permission: "people.view",
        path: "intelligence/people",
      },
      {
        id: "companies",
        label: "Companies",
        description: "Investors & corporates",
        icon: Building2,
        permission: "companies.manage",
        path: "intelligence/companies",
      },
      {
        id: "industries",
        label: "Industries",
        description: "Controlled sectors",
        icon: Tags,
        permission: "industries.manage",
        path: "intelligence/industries",
      },
      {
        id: "events",
        label: "Events",
        description: "Conferences & launches",
        icon: CalendarDays,
        permission: "events.manage",
        path: "intelligence/events",
      },
    ],
  },
  {
    id: "relationships",
    label: "Relationships",
    caption: "How is everything connected?",
    icon: Handshake,
    items: [
      {
        id: "related-stories",
        label: "Related stories",
        description: "Story-to-story links",
        icon: Newspaper,
        permission: "relationships.view",
        path: "relationships/related-stories",
      },
      {
        id: "startup-coverage",
        label: "Startup coverage",
        description: "Which stories cover which startup",
        icon: ListChecks,
        permission: "relationships.view",
        path: "relationships/startup-coverage",
      },
      {
        id: "entity-suggestions",
        label: "Entity suggestions",
        description: "Approve or reject candidates",
        icon: Inbox,
        permission: "relationships.view",
        path: "relationships/suggestions",
      },
    ],
  },
  {
    id: "publishing",
    label: "Publishing",
    caption: "How does it reach readers?",
    icon: Globe,
    items: [
      {
        id: "homepage",
        label: "Homepage",
        description: "Hero, trending, picks",
        icon: LayoutDashboard,
        permission: "homepage.manage",
        path: "publishing/homepage",
      },
      {
        id: "website",
        label: "Website structure",
        description: "Hero copy, nav & daily tips",
        icon: Globe,
        permission: "homepage.manage",
        path: "publishing/website",
      },
      {
        id: "newsletter",
        label: "Newsletter",
        description: "Campaigns & subscribers",
        icon: Mail,
        permission: "newsletter.view",
        path: "publishing/newsletter",
      },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    caption: "What is the data telling us?",
    icon: BarChart3,
    items: [
      {
        id: "analytics",
        label: "Analytics",
        description: "Views, engagement, sources",
        icon: BarChart3,
        permission: "analytics.view",
        path: "insights/analytics",
      },
      {
        id: "activity",
        label: "Activity log",
        description: "Administrative audit trail",
        icon: Activity,
        permission: "activity.view",
        path: "insights/activity",
      },
    ],
  },
  {
    id: "system",
    label: "System",
    caption: "Who can do what?",
    icon: Settings,
    items: [
      {
        id: "users",
        label: "Users",
        description: "Team access & status",
        icon: Users,
        permission: "users.view",
        path: "system/users",
      },
      {
        id: "roles",
        label: "Roles & permissions",
        description: "Capability matrix",
        icon: ShieldCheck,
        permission: "roles.manage",
        path: "system/roles",
      },
      {
        id: "settings",
        label: "Settings",
        description: "Site, publishing, SEO",
        icon: Settings,
        permission: "settings.view",
        path: "system/settings",
      },
    ],
  },
];

/** Pages reachable from other pages (not shown in the sidebar navigation). */
export const SECONDARY_ROUTES: Partial<Record<NavPageId, string>> = {
  "article-editor": "editorial/articles/edit",
  "startup-dossier": "intelligence/startups/dossier",
};

export const PAGE_LABELS: Record<NavPageId, string> = (() => {
  const labels = {} as Record<NavPageId, string>;
  for (const group of NAV_GROUPS) {
    for (const item of group.items) labels[item.id] = item.label;
  }
  labels["article-editor"] = "Article editor";
  labels["startup-dossier"] = "Startup dossier";
  return labels;
})();

export function groupForPage(page: NavPageId): NavGroup | null {
  return NAV_GROUPS.find((group) => group.items.some((item) => item.id === page)) ?? null;
}

export function itemForPage(page: NavPageId): NavItem | null {
  for (const group of NAV_GROUPS) {
    const match = group.items.find((item) => item.id === page);
    if (match) return match;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*                                HASH ROUTING                                */
/* -------------------------------------------------------------------------- */

/** Deep-link hash for a route, e.g. `#/intelligence/startups/startup-m-kopa`. */
export function toHash(route: AdminRoute): string {
  const path =
    route.page === "article-editor" && route.params.articleId
      ? `editorial/articles/${route.params.articleId}/edit`
      : route.page === "startup-dossier" && route.params.startupId
      ? `intelligence/startups/${route.params.startupId}`
      : itemForPage(route.page)?.path ?? route.page;

  const suffix = route.params.personId
    ? `/${route.params.personId}`
    : route.params.campaignId
    ? `/${route.params.campaignId}`
    : "";

  return `#/${path}${suffix}`;
}

interface RoutePattern {
  page: NavPageId;
  pattern: RegExp;
  params: (match: RegExpMatchArray) => RouteParams;
}

const ROUTE_PATTERNS: RoutePattern[] = [
  {
    page: "article-editor",
    pattern: /^editorial\/articles\/([^/]+)\/edit$/,
    params: (match) => ({ articleId: match[1] }),
  },
  {
    page: "startup-dossier",
    pattern: /^intelligence\/startups\/([^/]+)$/,
    params: (match) => ({ startupId: match[1] }),
  },
  {
    page: "newsletter",
    pattern: /^publishing\/newsletter\/([^/]+)$/,
    params: (match) => ({ campaignId: match[1] }),
  },
  ...NAV_GROUPS.flatMap((group) =>
    group.items
      .filter((item) => item.path)
      .map<RoutePattern>((item) => ({
        page: item.id,
        pattern: new RegExp(`^${item.path!.replace(/[/]/g, "\\/")}$`),
        params: () => ({}),
      }))
  ),
];

export function fromHash(hash: string): AdminRoute | null {
  const cleaned = hash.replace(/^#\/?/, "").replace(/\/$/, "");
  if (!cleaned) return null;

  for (const route of ROUTE_PATTERNS) {
    const match = cleaned.match(route.pattern);
    if (match) return { page: route.page, params: route.params(match) };
  }

  const direct = NAV_GROUPS.flatMap((group) => group.items).find(
    (item) => item.id === cleaned
  );
  if (direct) return { page: direct.id, params: {} };

  return null;
}
