/**
 * Insights group (brief §20–§21).
 *
 *   • Analytics   — views / engagement / shares, top stories, top startups,
 *                   traffic sources. Only measured events are shown; when the
 *                   tracker has recorded nothing the screen says so.
 *   • Activity log — the audit trail: who did what, to which record, when.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Eye,
  Filter,
  Globe2,
  MousePointerClick,
  RefreshCw,
  Share2,
  TrendingUp,
} from "lucide-react";
import { useWorkspace } from "../../../lib/workspace/context";
import { useAuth } from "../../../lib/auth/context";
import { can } from "../../../lib/permissions";
import {
  ANALYTICS_ENDPOINT,
  REPORTING_PERIODS,
  TRACKER_ENDPOINT,
  aggregateAnalytics,
  fetchServerAnalytics,
  type ReportingPeriodId,
} from "../../../lib/workspace/analytics";
import type { AuditEvent, EngagementEvent } from "../../../lib/workspace/types";
import { Badge, Button, Card, EmptyState, Notice, ProgressBar, StatCard } from "../../ui/primitives";
import { FilterSelect, SearchInput, SegmentedControl } from "../../ui/data";
import { PageHeader } from "../../ui/layout";

/* -------------------------------------------------------------------------- */
/*                                  ANALYTICS                                 */
/* -------------------------------------------------------------------------- */

/** Whatever the optional aggregates endpoint returned, when it is deployed. */
type ServerAnalyticsResult = { events?: EngagementEvent[] } | null;

export function AnalyticsPage() {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const allowed = can(profile, "analytics.view");

  const [period, setPeriod] = useState<ReportingPeriodId>("30d");
  const [context, setContext] = useState<"public" | "admin" | "all">("public");
  const [serverNote, setServerNote] = useState<string | null>(null);
  const [serverEvents, setServerEvents] = useState<ServerAnalyticsResult>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchServerAnalytics(period);
      if (cancelled) return;
      setServerEvents(result);
      setServerNote(
        result
          ? "Server analytics endpoint responded — aggregates below include reported events."
          : null
      );
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const events = useMemo(() => {
    if (serverEvents !== null) return serverEvents.events ?? [];
    return workspace.engagement.items.filter(
      (event) => event.origin === "live" && event.meta.origin !== "sample"
    );
  }, [serverEvents, workspace.engagement.items]);

  const snapshot = useMemo(
    () =>
      aggregateAnalytics(events, workspace.articles.items, workspace.startups.items, {
        period,
        context,
      }),
    [context, events, period, workspace.articles.items, workspace.startups.items]
  );

  const maxDaily = Math.max(1, ...snapshot.series.map((point) => point.views));
  const liveEvents = events.length;

  if (!allowed) {
    return (
      <EmptyState
        title="Analytics restricted"
        description="Your role does not include analytics access. Ask an administrator to grant the analytics permission."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Traffic and engagement measured on the NexTake website. Defaults to the last 30 days."
        badge={<Badge tone="mint">{REPORTING_PERIODS.find((p) => p.id === period)?.label}</Badge>}
        actions={
          <SegmentedControl
            value={period}
            onChange={setPeriod}
            size="sm"
            options={REPORTING_PERIODS.map((entry) => ({ value: entry.id, label: entry.label }))}
          />
        }
      />

      {!snapshot.hasTrackedData ? (
        <Notice tone="warning" title="No measurement data for this window">
          Nothing has been recorded by the tracker yet, so this screen intentionally shows zeros
          and no trend lines. Point the public site at <code>{TRACKER_ENDPOINT}</code> (see{" "}
          <code>docs/ADMIN-INTELLIGENCE.md</code>) and the panels fill in automatically — NexTake
          never displays estimated figures as if they were measured.
        </Notice>
      ) : (
        <Notice tone={liveEvents > 0 ? "success" : "info"} title="Source of these numbers">
          {liveEvents > 0
            ? `${liveEvents.toLocaleString()} events were captured by this console or reported back through the tracker.`
            : "No public-site events have been collected for this window yet. The dashboard will show only verified public tracker data; it will not substitute sample figures."}
          {serverNote ? ` ${serverNote}` : ""}
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          value={context}
          onChange={setContext}
          size="sm"
          options={[
            { value: "public", label: "Public site" },
            { value: "admin", label: "Admin previews" },
            { value: "all", label: "Combined" },
          ]}
        />
        <Button
          size="sm"
          variant="outline"
          loading={checking}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={() => {
            setChecking(true);
            void fetchServerAnalytics(period).then((result) => {
              setServerEvents(result);
              setChecking(false);
            });
          }}
        >
          Re-check endpoint
        </Button>
        <span className="text-[10px] text-slate-400">
          Aggregates endpoint: {ANALYTICS_ENDPOINT}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Views"
          value={snapshot.totals.views.toLocaleString()}
          icon={<Eye className="h-3.5 w-3.5" />}
          hint={
            snapshot.previous.viewsDelta === null
              ? undefined
              : `${snapshot.previous.viewsDelta >= 0 ? "+" : ""}${snapshot.previous.viewsDelta.toFixed(1)}% vs previous`
          }
          tone={snapshot.previous.viewsDelta !== null && snapshot.previous.viewsDelta < 0 ? "amber" : "mint"}
        />
        <StatCard
          label="Reads"
          value={snapshot.totals.reads.toLocaleString()}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          hint={`${(snapshot.totals.engagementRate * 100).toFixed(1)}% engagement`}
        />
        <StatCard
          label="Shares"
          value={snapshot.totals.shares.toLocaleString()}
          icon={<Share2 className="h-3.5 w-3.5" />}
          hint={
            snapshot.previous.sharesDelta === null
              ? undefined
              : `${snapshot.previous.sharesDelta >= 0 ? "+" : ""}${snapshot.previous.sharesDelta.toFixed(1)}% vs previous`
          }
        />
        <StatCard
          label="Outbound clicks"
          value={snapshot.totals.clicks.toLocaleString()}
          icon={<MousePointerClick className="h-3.5 w-3.5" />}
          hint={`${snapshot.trackedEventCount.toLocaleString()} tracked events`}
        />
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#7FFFD4]" />
          <h2 className="text-sm font-bold text-[#071A2B]">Daily views</h2>
          <span className="text-[10px] text-slate-400">
            {snapshot.from.slice(0, 10)} → {snapshot.to.slice(0, 10)}
          </span>
        </div>

        {snapshot.hasTrackedData ? (
          <div className="flex h-40 items-end gap-1">
            {snapshot.series.map((point) => (
              <div key={point.date} className="group flex flex-1 flex-col items-center gap-1">
                <span className="text-[9px] font-semibold text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                  {point.views}
                </span>
                <div
                  className="w-full rounded-t bg-[#071A2B] transition-colors group-hover:bg-[#7FFFD4]"
                  style={{ height: `${Math.max(2, (point.views / maxDaily) * 120)}px` }}
                  title={`${point.label}: ${point.views} views`}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BarChart3 className="h-9 w-9" />}
            title="No daily series to plot"
            description="Charts render only when events exist for the selected window."
          />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-bold text-[#071A2B]">Top stories</h2>
          {snapshot.topStories.length === 0 ? (
            <p className="text-[11px] text-slate-500">No story has recorded views in this window.</p>
          ) : (
            snapshot.topStories.slice(0, 8).map((story) => (
              <div key={story.articleId} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-semibold text-[#071A2B]">
                    {story.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-500">
                    {story.views.toLocaleString()} views · {story.shares} shares
                  </span>
                </div>
                <ProgressBar
                  value={Math.min(100, (story.views / Math.max(1, snapshot.topStories[0].views)) * 100)}
                />
              </div>
            ))
          )}
        </Card>

        <div className="space-y-6">
          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-bold text-[#071A2B]">Top startups</h2>
            {snapshot.topStartups.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                No dossier has recorded engagement in this window.
              </p>
            ) : (
              snapshot.topStartups.slice(0, 6).map((startup) => (
                <div
                  key={startup.startupId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#071A2B]/10 p-2.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-[#071A2B]">
                      {startup.name}
                    </span>
                    <span className="text-[10px] text-slate-500">{startup.industry}</span>
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-500">
                    {startup.views.toLocaleString()} views · {startup.coverage} stories
                  </span>
                </div>
              ))
            )}
          </Card>

          <Card className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-[#7FFFD4]" />
              <h2 className="text-sm font-bold text-[#071A2B]">Traffic sources</h2>
            </div>
            {snapshot.traffic.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                No referrer or source data has been recorded yet.
              </p>
            ) : (
              snapshot.traffic.map((entry) => (
                <div key={entry.source} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold capitalize text-[#071A2B]">{entry.source}</span>
                    <span className="text-slate-500">
                      {entry.events.toLocaleString()} events · {(entry.share * 100).toFixed(0)}%
                    </span>
                  </div>
                  <ProgressBar value={entry.share * 100} tone={entry.source === "direct" ? "navy" : "mint"} />
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                ACTIVITY LOG                                */
/* -------------------------------------------------------------------------- */

export function ActivityLogPage() {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const allowed = can(profile, "activity.view");

  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [actor, setActor] = useState("all");
  const [entityType, setEntityType] = useState("all");

  const actions = useMemo(
    () => Array.from(new Set(workspace.audit.items.map((entry) => entry.action))).sort(),
    [workspace.audit.items]
  );
  const actors = useMemo(
    () => Array.from(new Set(workspace.audit.items.map((entry) => entry.actorEmail))).sort(),
    [workspace.audit.items]
  );
  const entityTypes = useMemo(
    () => Array.from(new Set(workspace.audit.items.map((entry) => entry.entityType))).sort(),
    [workspace.audit.items]
  );

  const rows: AuditEvent[] = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspace.audit.items
      .filter((entry) => (action === "all" ? true : entry.action === action))
      .filter((entry) => (actor === "all" ? true : entry.actorEmail === actor))
      .filter((entry) => (entityType === "all" ? true : entry.entityType === entityType))
      .filter((entry) =>
        query
          ? `${entry.entityLabel} ${entry.detail} ${entry.actorEmail} ${entry.action}`
              .toLowerCase()
              .includes(query)
          : true
      )
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 300);
  }, [action, actor, entityType, search, workspace.audit.items]);

  if (!allowed) {
    return (
      <EmptyState
        title="Activity log restricted"
        description="Your role does not include activity access."
      />
    );
  }

  const today = workspace.audit.items.filter((entry) =>
    entry.at.slice(0, 10) === new Date().toISOString().slice(0, 10)
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity log"
        description="Every editorial and administrative action, in the order it happened. Filters mirror the audit fields."
        badge={<Badge tone="mint">{workspace.audit.items.length} records</Badge>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Events today" value={today} icon={<Activity className="h-3.5 w-3.5" />} />
        <StatCard label="Total records" value={workspace.audit.items.length} />
        <StatCard label="Contributors" value={actors.length} />
        <StatCard label="Action types" value={actions.length} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by record, user or detail…"
          className="lg:max-w-sm lg:flex-1"
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="User"
            value={actor}
            onChange={setActor}
            options={[
              { value: "all", label: "All users" },
              ...actors.map((entry) => ({ value: entry, label: entry })),
            ]}
          />
          <FilterSelect
            label="Action"
            value={action}
            onChange={setAction}
            options={[
              { value: "all", label: "All actions" },
              ...actions.map((entry) => ({ value: entry, label: entry })),
            ]}
          />
          <FilterSelect
            label="Content"
            value={entityType}
            onChange={setEntityType}
            options={[
              { value: "all", label: "All content" },
              ...entityTypes.map((entry) => ({ value: entry, label: entry })),
            ]}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Filter className="h-9 w-9" />}
          title="No activity matches these filters"
          description="Clear a filter to see the rest of the trail."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-2 rounded-xl border border-[#071A2B]/12 p-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="navy">{entry.action}</Badge>
                  <span className="truncate text-xs font-semibold text-[#071A2B]">
                    {entry.entityLabel || entry.entityId}
                  </span>
                  <span className="text-[10px] text-slate-400">{entry.entityType}</span>
                </div>
                {entry.detail && (
                  <p className="mt-0.5 text-[11px] text-slate-500">{entry.detail}</p>
                )}
                {entry.changes.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {entry.changes.slice(0, 4).map((change) => (
                      <li key={change.field} className="text-[10px] text-slate-500">
                        <span className="font-mono">{change.field}</span>: {change.from || "∅"} →{" "}
                        {change.to || "∅"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="shrink-0 text-right text-[10px] text-slate-500">
                <p className="font-semibold text-[#071A2B]">{entry.actorEmail}</p>
                <p>{entry.actorRole}</p>
                <p>{new Date(entry.at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
