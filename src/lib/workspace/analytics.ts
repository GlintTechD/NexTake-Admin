/**
 * Analytics aggregation.
 *
 * Rule from the brief (§20): never fabricate analytics. Every number below is
 * derived from records the platform actually holds —
 *
 *   • article views     → the `views` counter the public site reports back
 *   • engagement events → captured by `trackEngagement` (this console + the
 *                         public tracker endpoint documented in
 *                         docs/ADMIN-INTELLIGENCE.md)
 *   • coverage          → count of published stories linked to a startup
 *
 * When a metric has no underlying data the UI shows an explicit "not collected
 * yet" state instead of a placeholder figure.
 */

import type { Article } from "../../types";
import type { EngagementEvent, Startup, TrafficSource } from "./types";

export const REPORTING_PERIODS = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
] as const;

export type ReportingPeriodId = (typeof REPORTING_PERIODS)[number]["id"];

export function periodDays(period: ReportingPeriodId): number {
  return REPORTING_PERIODS.find((entry) => entry.id === period)?.days ?? 30;
}

export interface AnalyticsOptions {
  period: ReportingPeriodId;
  now?: number;
  /** Restrict to events captured by the public site. */
  context?: EngagementEvent["context"] | "all";
}

export interface DailyPoint {
  date: string;
  label: string;
  views: number;
  shares: number;
  reads: number;
}

export interface TopStory {
  articleId: string;
  title: string;
  category: string;
  views: number;
  shares: number;
  /** Views recorded inside the selected window by the tracker. */
  trackedViews: number;
  /** Lifetime counter reported by the public site, when available. */
  lifetimeViews: number;
}

export interface TopStartup {
  startupId: string;
  name: string;
  industry: string;
  coverage: number;
  views: number;
}

export interface TrafficBreakdown {
  source: TrafficSource;
  events: number;
  share: number;
}

export interface AnalyticsSnapshot {
  period: ReportingPeriodId;
  from: string;
  to: string;
  hasTrackedData: boolean;
  trackedEventCount: number;
  totals: {
    views: number;
    shares: number;
    reads: number;
    clicks: number;
    /** Sum of the public site's lifetime counters for published stories. */
    lifetimeViews: number;
    publishedArticles: number;
    engagementRate: number;
  };
  series: DailyPoint[];
  topStories: TopStory[];
  topStartups: TopStartup[];
  traffic: TrafficBreakdown[];
  previous: {
    views: number;
    shares: number;
    /** Percentage change vs the previous window (null when incomparable). */
    viewsDelta: number | null;
    sharesDelta: number | null;
  };
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function aggregateAnalytics(
  events: EngagementEvent[],
  articles: Article[],
  startups: Startup[],
  options: AnalyticsOptions
): AnalyticsSnapshot {
  const now = options.now ?? Date.now();
  const days = periodDays(options.period);
  const windowMs = days * 86_400_000;
  const to = now;
  const from = now - windowMs;
  const context = options.context ?? "all";

  const inWindow = (event: EngagementEvent, start: number, end: number) => {
    const at = new Date(event.at).getTime();
    if (Number.isNaN(at)) return false;
    if (context !== "all" && event.context !== context) return false;
    return at >= start && at < end;
  };

  const current = events.filter((event) => inWindow(event, from, to));
  const previous = events.filter((event) => inWindow(event, from - windowMs, from));

  const sum = (list: EngagementEvent[], kind: EngagementEvent["kind"]) =>
    list.filter((event) => event.kind === kind).length;

  /* Daily series — zero-filled so the chart never implies missing days. */
  const series: DailyPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(to - offset * 86_400_000);
    const key = isoDay(date);
    const dayEvents = current.filter((event) => event.at.slice(0, 10) === key);

    series.push({
      date: key,
      label: date.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      views: sum(dayEvents, "view"),
      shares: sum(dayEvents, "share"),
      reads: sum(dayEvents, "read"),
    });
  }

  const publishedArticles = articles.filter((article) => article.status === "published");
  const lifetimeViews = publishedArticles.reduce(
    (total, article) => total + (article.views ?? 0),
    0
  );

  const topStories: TopStory[] = articles
    .map((article) => {
      const articleEvents = current.filter(
        (event) => event.entityType === "article" && event.entityId === article.id
      );
      return {
        articleId: article.id,
        title: article.title,
        category: article.category,
        views: (article.views ?? 0) + sum(articleEvents, "view"),
        shares: sum(articleEvents, "share"),
        trackedViews: sum(articleEvents, "view"),
        lifetimeViews: article.views ?? 0,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  const topStartups: TopStartup[] = startups
    .map((startup) => {
      const coverage = articles.filter(
        (article) =>
          article.status === "published" &&
          (startup.articleIds.includes(article.id) ||
            (article.relatedStartupIds ?? []).includes(startup.id))
      );
      const startupEvents = current.filter(
        (event) => event.entityType === "startup" && event.entityId === startup.id
      );

      return {
        startupId: startup.id,
        name: startup.name,
        industry: startup.industry,
        coverage: coverage.length,
        views: startupEvents.length,
      };
    })
    .sort((a, b) => b.coverage - a.coverage || b.views - a.views)
    .slice(0, 6);

  const sources: TrafficSource[] = ["direct", "search", "social", "referral", "internal"];
  const traffic: TrafficBreakdown[] = sources
    .map((source) => {
      const count = current.filter((event) => event.trafficSource === source).length;
      return {
        source,
        events: count,
        share: current.length > 0 ? count / current.length : 0,
      };
    })
    .filter((entry) => entry.events > 0)
    .sort((a, b) => b.events - a.events);

  const views = sum(current, "view");
  const shares = sum(current, "share");
  const reads = sum(current, "read");
  const clicks = sum(current, "click");
  const previousViews = sum(previous, "view");
  const previousShares = sum(previous, "share");

  const delta = (currentValue: number, previousValue: number): number | null => {
    if (previousValue === 0) return currentValue === 0 ? 0 : null;
    return ((currentValue - previousValue) / previousValue) * 100;
  };

  return {
    period: options.period,
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    hasTrackedData: current.length > 0,
    trackedEventCount: current.length,
    totals: {
      views,
      shares,
      reads,
      clicks,
      lifetimeViews,
      publishedArticles: publishedArticles.length,
      engagementRate: views === 0 ? 0 : (reads + shares) / views,
    },
    series,
    topStories,
    topStartups,
    traffic,
    previous: {
      views: previousViews,
      shares: previousShares,
      viewsDelta: delta(views, previousViews),
      sharesDelta: delta(shares, previousShares),
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                            TRACKER INTEGRATION                             */
/* -------------------------------------------------------------------------- */

/**
 * Shape the public NexTake site should POST to `/api/public/track` so traffic
 * sources and shares start flowing into this console. Documented in
 * docs/ADMIN-INTELLIGENCE.md; the console reads aggregated events back through
 * the same collection.
 */
export interface TrackerPayload {
  entityType: EngagementEvent["entityType"];
  entityId: string;
  kind: EngagementEvent["kind"];
  trafficSource: TrafficSource;
  path: string;
  referrer?: string;
}

/** Endpoint the public site reports engagement to (proxied by Vite). */
export const TRACKER_ENDPOINT = "/api/public/track";
/** Endpoint that returns aggregates when the public API service is deployed. */
export const ANALYTICS_ENDPOINT = "/api/public/analytics";

/**
 * Best-effort fetch of server-side analytics. Returns `null` when the endpoint
 * is not deployed yet so the UI can fall back to locally captured events
 * instead of inventing numbers.
 */
export async function fetchServerAnalytics(
  period: ReportingPeriodId
): Promise<{ events?: EngagementEvent[] } | null> {
  try {
    const response = await fetch(`${ANALYTICS_ENDPOINT}?period=${period}`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { events?: EngagementEvent[] };
    return payload;
  } catch {
    return null;
  }
}
