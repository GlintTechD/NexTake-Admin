import { useCallback, useEffect, useState } from "react";
import { Bot, LogOut, RefreshCw } from "lucide-react";
import { relativeTime } from "../../../lib/backend";
import { NieError, nieApi } from "../../../lib/nie/client";
import type { NieBrief } from "../../../lib/nie/types";
import { Button, EmptyState, Notice } from "../../ui/primitives";
import { DataTable, SegmentedControl, type Column } from "../../ui/data";
import { PageHeader, Tabs } from "../../ui/layout";
import NieAuthGate, { isNieAdmin } from "./NieAuthGate";
import NieSystemPanel from "./NieSystemPanel";
import { NieStatusBadge, RiskBadge, gateLabel, utc } from "./nieUi";

type Tab = "queue" | "all" | "newsroom";
type Row = NieBrief & { id: number };
type TableRow = { id: string; n: Row };

const FILTERS = [
  { value: "", label: "All" },
  { value: "FLAGGED_DRAFT", label: "Held" },
  { value: "READY_TO_PUBLISH", label: "Ready" },
  { value: "PUBLISHED", label: "Published" },
  { value: "FAILED", label: "Failed" },
];

function whyHeld(n: NieBrief): string {
  const last = n.flag_reasons[n.flag_reasons.length - 1];
  if (last) return `${gateLabel(last.gate)}: ${last.reason}`;
  if (n.status === "READY_TO_PUBLISH") return "Passed all checks — waiting for approval";
  if (n.last_error) return n.last_error;
  return "";
}

function Inner({ onOpenArticle, isAdmin, onSignOut }: { onOpenArticle: (id: number) => void; isAdmin: boolean; onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("queue");
  const [filter, setFilter] = useState("");
  const [rows, setRows] = useState<NieBrief[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (tab === "newsroom") return;
    setLoading(true);
    setError(null);
    try {
      setRows(tab === "queue" ? await nieApi.reviewQueue() : await nieApi.articles(filter || undefined));
    } catch (e) {
      setError(e instanceof NieError ? e.message : "Could not load articles.");
    } finally {
      setLoading(false);
    }
  }, [tab, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<TableRow>[] = [
    {
      key: "story",
      header: "Story",
      render: ({ n }) => (
        <div className="max-w-md">
          <p className="font-bold leading-snug">{n.headline ?? `Draft #${n.id}`}</p>
          <p className="mt-0.5 text-xs text-slate-500">{[n.category, n.geo?.replace(/_/g, " ")].filter(Boolean).join(" · ")}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: ({ n }) => <NieStatusBadge status={n.status} /> },
    { key: "risk", header: "Risk", render: ({ n }) => <RiskBadge level={n.risk_level} />, hideOnMobile: true },
    { key: "why", header: "Why it is here", render: ({ n }) => <p className="max-w-sm text-xs leading-relaxed text-slate-600">{whyHeld(n)}</p>, hideOnMobile: true },
    { key: "when", header: "Updated", render: ({ n }) => <span className="text-xs text-slate-500">{relativeTime(utc(n.updated_at))}</span>, hideOnMobile: true },
  ];

  const tableRows: TableRow[] = (rows ?? []).map((n) => ({ id: String(n.id), n }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI newsroom"
        description="Drafts researched and written by the NexTake Intelligence Engine. Nothing goes live without passing every check or your approval."
        actions={
          <>
            {tab !== "newsroom" && (
              <Button variant="outline" size="sm" loading={loading} icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void load()}>
                Refresh
              </Button>
            )}
            <Button variant="ghost" size="sm" icon={<LogOut className="h-3.5 w-3.5" />} onClick={onSignOut}>Sign out</Button>
          </>
        }
      />
      <Tabs<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "queue", label: "Needs review", count: tab === "queue" ? rows?.length : undefined },
          { id: "all", label: "All articles" },
          { id: "newsroom", label: "Newsroom" },
        ]}
      />

      {tab === "newsroom" ? (
        <NieSystemPanel isAdmin={isAdmin} />
      ) : (
        <div className="space-y-4">
          {tab === "all" && <SegmentedControl value={filter} onChange={setFilter} options={FILTERS} size="sm" />}
          {error && <Notice tone="danger">{error}</Notice>}
          {rows && (
            <DataTable
              rows={tableRows}
              columns={columns}
              onRowClick={(row) => onOpenArticle(row.n.id)}
              renderCard={({ n }) => (
                <div className="space-y-2">
                  <p className="font-bold leading-snug text-[#071A2B]">{n.headline ?? `Draft #${n.id}`}</p>
                  <div className="flex flex-wrap items-center gap-2"><NieStatusBadge status={n.status} /><RiskBadge level={n.risk_level} /></div>
                  <p className="text-xs text-slate-600">{whyHeld(n)}</p>
                </div>
              )}
              emptyState={
                <EmptyState
                  icon={<Bot className="h-8 w-8" />}
                  title={tab === "queue" ? "Nothing is waiting for you" : "No articles match"}
                  description={tab === "queue" ? "Drafts that need a decision will appear here, with the reason they were held." : "Try a different filter."}
                />
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function NieReviewPage({ onOpenArticle }: { onOpenArticle: (id: number) => void }) {
  return (
    <NieAuthGate>
      {(profile, signOut) => <Inner onOpenArticle={onOpenArticle} isAdmin={isNieAdmin(profile)} onSignOut={() => void signOut()} />}
    </NieAuthGate>
  );
}
