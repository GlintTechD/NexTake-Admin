/**
 * Console home (brief §6).
 *
 * Quick actions, the editorial status split, the review/schedule queue, recent
 * activity and performance. Every number here is derived from the workspace —
 * engagement figures only appear once real events exist, otherwise the panel
 * says so instead of showing a made-up trend.
 */

import { useMemo } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  FileWarning,
  FileText,
  Newspaper,
  Plus,
  Share2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useWorkspace } from "../../lib/workspace/context";
import { useAuth } from "../../lib/auth/context";
import { can } from "../../lib/permissions";
import type { AdminRoute } from "../../lib/navigation";
import type { NavPageId } from "../../types";
import { aggregateAnalytics } from "../../lib/workspace/analytics";
import type { ActivityItem, SystemMetric } from "../../types";
import { Badge, Button, Card, EmptyState, Notice, ProgressBar, StatCard, StatusBadge } from "../ui/primitives";
import { PageHeader } from "../ui/layout";

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export default function DashboardPage({
  onNavigate,
  onOpenLiveSite,
  metrics = [],
  activities = [],
}: {
  onNavigate: (route: AdminRoute) => void;
  onOpenLiveSite: () => void;
  /** Live telemetry reported by the deployed public site (existing pipeline). */
  metrics?: SystemMetric[];
  /** Public-site activity feed (existing pipeline). */
  activities?: ActivityItem[];
}) {
  const workspace = useWorkspace();
  const { profile } = useAuth();

  const goto = (page: NavPageId, detail?: { articleId?: string; startupId?: string }) =>
    onNavigate({ page, params: detail ?? {} });

  const articles = workspace.articles.items;
  const live = articles.filter((article) => !article.archived);

  const counts = useMemo(
    () => ({
      drafts: live.filter((article) => article.status === "draft" && article.reviewState !== "in_review")
        .length,
      inReview: live.filter((article) => article.reviewState === "in_review").length,
      scheduled: live.filter((article) => article.status === "scheduled").length,
      published: live.filter((article) => article.status === "published").length,
    }),
    [live]
  );

  const needsReview = useMemo(
    () =>
      live
        .filter((article) => article.reviewState === "in_review")
        .sort((a, b) => (a.submittedForReviewAt ?? "") < (b.submittedForReviewAt ?? "") ? -1 : 1)
        .slice(0, 6),
    [live]
  );

  const scheduledToday = useMemo(
    () =>
      live
        .filter((article) => article.status === "scheduled" && isToday(article.publishedAt))
        .sort((a, b) => (a.publishedAt ?? "") < (b.publishedAt ?? "") ? -1 : 1),
    [live]
  );

  const snapshot = useMemo(
    () => aggregateAnalytics(workspace.engagement.items, articles, workspace.startups.items, { period: "30d" }),
    [articles, workspace.engagement.items, workspace.startups.items]
  );

  const recentActivity = useMemo(
    () => [...workspace.audit.items].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8),
    [workspace.audit.items]
  );

  const pendingSuggestions = workspace.suggestions.items.filter(
    (suggestion) => suggestion.status === "pending"
  ).length;
  const unverifiedClaims = workspace.claims.items.filter(
    (claim) => claim.confidence !== "verified"
  ).length;

  const canCreateArticle = can(profile, "articles.create");
  const canCreateStartup = can(profile, "startups.manage");
  const canCreateSource = can(profile, "sources.manage");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back${profile?.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}`}
        description="Everything waiting on the editorial desk today, plus how the site is performing."
        badge={
          workspace.isSampleWorkspace ? (
            <Badge tone="amber">sample workspace</Badge>
          ) : (
            <Badge tone="mint">live workspace</Badge>
          )
        }
        actions={
          <Button
            size="sm"
            variant="outline"
            icon={<ArrowUpRight className="h-3.5 w-3.5" />}
            onClick={onOpenLiveSite}
          >
            View website
          </Button>
        }
      />

      {workspace.isSampleWorkspace && (
        <Notice tone="info" title="This console ships with an example workspace">
          The records you see are clearly-labelled sample content so every workflow can be
          explored before the production database is connected. Creating, editing or approving
          anything turns it into your own live record.
        </Notice>
      )}

      {/* QUICK ACTIONS */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#7FFFD4]" />
          <h2 className="text-sm font-bold text-[#071A2B]">Quick actions</h2>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {canCreateArticle && (
            <Button
              variant="outline"
              icon={<Plus className="h-4 w-4" />}
              className="justify-start"
              onClick={() => goto("article-editor")}
            >
              Create article
            </Button>
          )}
          {canCreateStartup && (
            <Button
              variant="outline"
              icon={<Building2 className="h-4 w-4" />}
              className="justify-start"
              onClick={() => goto("startups")}
            >
              Add startup
            </Button>
          )}
          {canCreateSource && (
            <Button
              variant="outline"
              icon={<Newspaper className="h-4 w-4" />}
              className="justify-start"
              onClick={() => goto("sources")}
            >
              Add source
            </Button>
          )}
          <Button
            variant="outline"
            icon={<CalendarClock className="h-4 w-4" />}
            className="justify-start"
            onClick={() => goto("homepage")}
          >
            Manage homepage
          </Button>
        </div>
      </Card>

      {/* EDITORIAL STATUS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <button onClick={() => goto("blog")} className="cursor-pointer text-left">
          <StatCard label="Drafts" value={counts.drafts} icon={<FileText className="h-3.5 w-3.5" />} />
        </button>
        <button onClick={() => goto("blog")} className="cursor-pointer text-left">
          <StatCard label="In review" value={counts.inReview} icon={<Clock className="h-3.5 w-3.5" />} />
        </button>
        <button onClick={() => goto("blog")} className="cursor-pointer text-left">
          <StatCard label="Scheduled" value={counts.scheduled} icon={<CalendarClock className="h-3.5 w-3.5" />} />
        </button>
        <button onClick={() => goto("blog")} className="cursor-pointer text-left">
          <StatCard label="Published" value={counts.published} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
        </button>
      </div>

      {/* QUEUE + ATTENTION */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="space-y-4 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-[#7FFFD4]" />
              <h2 className="text-sm font-bold text-[#071A2B]">Needs review</h2>
            </div>
            <Button size="sm" variant="ghost" onClick={() => goto("blog")}>
              Open queue
            </Button>
          </div>

          {needsReview.length === 0 ? (
            <EmptyState
              title="Nothing waiting on review"
              description="Stories appear here the moment a writer submits them."
            />
          ) : (
            <div className="space-y-2">
              {needsReview.map((article) => (
                <button
                  key={article.id}
                  onClick={() => goto("article-editor", { articleId: article.id })}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#071A2B]/12 p-3 text-left transition-colors hover:border-[#7FFFD4] hover:bg-[#7FFFD4]/5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#071A2B]">
                      {article.title}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {article.author} · submitted{" "}
                      {article.submittedForReviewAt
                        ? new Date(article.submittedForReviewAt).toLocaleString()
                        : "recently"}
                    </span>
                  </span>
                  <Badge tone="amber">in review</Badge>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-[#071A2B]/10 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-[#7FFFD4]" />
                <h2 className="text-sm font-bold text-[#071A2B]">Scheduled today</h2>
              </div>
              <span className="text-[11px] text-slate-500">{scheduledToday.length} stories</span>
            </div>
            <div className="mt-3 space-y-2">
              {scheduledToday.length === 0 && (
                <p className="rounded-xl border border-dashed border-[#071A2B]/20 px-4 py-5 text-center text-xs text-slate-500">
                  Nothing scheduled for today.
                </p>
              )}
              {scheduledToday.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#071A2B]/12 p-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#071A2B]">
                      {article.title}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "time not set"}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => goto("article-editor", { articleId: article.id })}
                  >
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-bold text-[#071A2B]">Needs attention</h2>
            <button
              onClick={() => goto("entity-suggestions")}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-[#071A2B]/12 p-3 text-left hover:border-[#7FFFD4]"
            >
              <span className="text-[11px] font-semibold text-[#071A2B]">
                Suggested relationships
              </span>
              <Badge tone={pendingSuggestions > 0 ? "amber" : "neutral"}>{pendingSuggestions}</Badge>
            </button>
            <button
              onClick={() => goto("claims")}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-[#071A2B]/12 p-3 text-left hover:border-[#7FFFD4]"
            >
              <span className="text-[11px] font-semibold text-[#071A2B]">
                Unverified claims
              </span>
              <Badge tone={unverifiedClaims > 0 ? "amber" : "neutral"}>{unverifiedClaims}</Badge>
            </button>
            <button
              onClick={() => goto("people")}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-[#071A2B]/12 p-3 text-left hover:border-[#7FFFD4]"
            >
              <span className="text-[11px] font-semibold text-[#071A2B]">People records</span>
              <Badge tone="neutral">{workspace.people.items.length}</Badge>
            </button>
            <button
              onClick={() => goto("startups")}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-[#071A2B]/12 p-3 text-left hover:border-[#7FFFD4]"
            >
              <span className="text-[11px] font-semibold text-[#071A2B]">Startup dossiers</span>
              <Badge tone="neutral">{workspace.startups.items.length}</Badge>
            </button>
          </Card>

          <Card className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#7FFFD4]" />
              <h2 className="text-sm font-bold text-[#071A2B]">Performance · 30 days</h2>
            </div>

            {!snapshot.hasTrackedData ? (
              <Notice tone="warning" title="No tracked traffic yet">
                The tracker endpoint has not received any events, so no view or engagement figure
                is displayed. Nothing is estimated or invented — connect the public site tracker to
                start filling this panel.
              </Notice>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Views
                    </p>
                    <p className="text-xl font-extrabold text-[#071A2B]">
                      {snapshot.totals.views.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Shares
                    </p>
                    <p className="text-xl font-extrabold text-[#071A2B]">
                      {snapshot.totals.shares.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Engagement rate</span>
                    <span className="font-semibold text-[#071A2B]">
                      {(snapshot.totals.engagementRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar value={Math.min(100, snapshot.totals.engagementRate * 100)} />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Top stories
                  </p>
                  {snapshot.topStories.slice(0, 3).map((story) => (
                    <div key={story.articleId} className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] text-[#071A2B]">{story.title}</span>
                      <span className="flex shrink-0 items-center gap-1 text-[10px] text-slate-500">
                        <Eye className="h-3 w-3" />
                        {story.views.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Button size="sm" variant="outline" onClick={() => goto("analytics")}>
              Open analytics
            </Button>
          </Card>
        </div>
      </div>

      {/* ACTIVITY */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#7FFFD4]" />
            <h2 className="text-sm font-bold text-[#071A2B]">Recent activity</h2>
          </div>
          <Button size="sm" variant="ghost" onClick={() => goto("activity")}>
            Full log
          </Button>
        </div>

        {recentActivity.length === 0 ? (
          <EmptyState
            title="No activity recorded yet"
            description="Every create, edit, publish and approval is written to the audit trail."
          />
        ) : (
          <div className="space-y-2">
            {recentActivity.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-1 rounded-xl border border-[#071A2B]/10 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#071A2B]">
                    {event.entityLabel}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {event.action} · {event.actorEmail}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-slate-400">
                  {new Date(event.at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* LIVE SITE TELEMETRY — the existing /api/public pipeline, unchanged. */}
      {(metrics.length > 0 || activities.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {metrics.length > 0 && (
            <Card className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#7FFFD4]" />
                <h2 className="text-sm font-bold text-[#071A2B]">Live site telemetry</h2>
                <Badge tone="mint">/api/public/metrics</Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-[#071A2B]/12 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-[#071A2B]">{metric.value}</p>
                    <p className="text-[10px] text-slate-500">{metric.change}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activities.length > 0 && (
            <Card className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#7FFFD4]" />
                <h2 className="text-sm font-bold text-[#071A2B]">Public site activity</h2>
                <Badge tone="mint">/api/public/activity</Badge>
              </div>
              <div className="space-y-2">
                {activities.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-0.5 rounded-xl border border-[#071A2B]/10 p-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-semibold text-[#071A2B]">
                        {item.action} · {item.target}
                      </span>
                      <span className="text-[10px] text-slate-500">{item.user}</span>
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-400">{item.timestamp}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* WORKSPACE HEALTH */}
      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-[#7FFFD4]" />
          <h2 className="text-sm font-bold text-[#071A2B]">Workspace storage</h2>
          <Badge tone={workspace.backendMode === "supabase" ? "mint" : "amber"}>
            {workspace.backendMode === "supabase" ? "database connected" : "local workspace"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {workspace.health.map((entry) => (
            <span
              key={entry.collection}
              className="rounded-lg border border-[#071A2B]/12 px-2.5 py-1 text-[10px] text-slate-600"
            >
              {entry.collection}: <strong className="font-semibold">{entry.mode}</strong>
            </span>
          ))}
        </div>
      </Card>

      {/* SAMPLE STATUS KEY — keeps the sample/live distinction legible. */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <StatusBadge status="published" /> published
        </span>
        <span className="flex items-center gap-1.5">
          <StatusBadge status="draft" /> draft
        </span>
        <span className="flex items-center gap-1.5">
          <StatusBadge status="scheduled" /> scheduled
        </span>
        <span className="flex items-center gap-1.5">
          <StatusBadge status="in_review" /> in review
        </span>
      </div>
    </div>
  );
}
