import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, PauseCircle, PlayCircle, XCircle } from "lucide-react";
import { relativeTime } from "../../../lib/backend";
import { NieError, nieApi } from "../../../lib/nie/client";
import type { NieAuditRow, NieHealth, NieMetrics } from "../../../lib/nie/types";
import { Button, Notice, SectionCard, StatCard } from "../../ui/primitives";
import { ConfirmDialog } from "../../ui/overlay";
import { STATUS_LABEL, utc } from "./nieUi";

const message = (e: unknown) => (e instanceof NieError ? e.message : "Something went wrong. Try again.");

function Check({ ok, children }: { ok: boolean; children: string }) {
  return (
    <li className="flex items-center gap-2 text-xs text-[#071A2B]">
      {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-500" />}
      {children}
    </li>
  );
}

export default function NieSystemPanel({ isAdmin }: { isAdmin: boolean }) {
  const [health, setHealth] = useState<NieHealth | null>(null);
  const [metrics, setMetrics] = useState<NieMetrics | null>(null);
  const [audit, setAudit] = useState<NieAuditRow[] | null>(null);
  const [chain, setChain] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAuto, setConfirmAuto] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, m] = await Promise.all([nieApi.health(), nieApi.metrics()]);
      setHealth(h);
      setMetrics(m);
      if (isAdmin) setAudit(await nieApi.auditLogs());
    } catch (e) {
      setError(message(e));
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const verifyChain = () =>
    act(async () => {
      const result = await nieApi.verifyAudit();
      setChain(result.intact ? "The audit trail is intact." : `The audit trail was altered at entry ${result.first_broken_id}.`);
    });

  return (
    <div className="space-y-6">
      {error && <Notice tone="danger">{error}</Notice>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Held for review" value={String(metrics?.review_queue ?? "–")} />
        <StatCard label="Stories tracked" value={String(metrics?.stories ?? "–")} hint={`${metrics?.stories_new ?? 0} not yet picked up`} />
        <StatCard label="Published" value={String(metrics?.articles_by_status.PUBLISHED ?? 0)} />
        <StatCard label="AI calls today" value={metrics ? `${metrics.llm_calls_today}/${metrics.llm_daily_limit}` : "–"} />
      </div>

      <SectionCard
        title="Publishing"
        description="Auto-publish is off until you decide the drafts are consistently good enough."
        actions={
          isAdmin && health ? (
            <>
              <Button
                variant={health.publishing_paused ? "primary" : "outline"}
                size="sm"
                loading={busy}
                icon={health.publishing_paused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
                onClick={() => act(health.publishing_paused ? nieApi.resume : nieApi.pause)}
              >
                {health.publishing_paused ? "Resume publishing" : "Pause all auto-publishing"}
              </Button>
              <Button
                variant={health.auto_publish ? "danger" : "secondary"}
                size="sm"
                loading={busy}
                onClick={() => (health.auto_publish ? act(() => nieApi.setAutoPublish(false)) : setConfirmAuto(true))}
              >
                {health.auto_publish ? "Turn auto-publish off" : "Turn auto-publish on"}
              </Button>
            </>
          ) : undefined
        }
      >
        {health ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            <Check ok={health.cms}>Website database reachable</Check>
            <Check ok={health.llm_configured}>AI model configured</Check>
            <Check ok={health.serper_configured}>Corroboration search configured</Check>
            <Check ok={!health.publishing_paused}>Publishing is not paused</Check>
            <Check ok={health.auto_publish}>Auto-publish is on</Check>
            <Check ok={health.unsplash_configured || health.pexels_configured}>Stock-image search configured (optional)</Check>
          </ul>
        ) : (
          <p className="text-xs text-slate-500">Loading…</p>
        )}
        {!isAdmin && <p className="mt-3 text-xs text-slate-500">Only administrators can pause publishing or change auto-publish.</p>}
      </SectionCard>

      {metrics && (
        <SectionCard title="Pipeline" description="Where every article is right now.">
          <div className="flex flex-wrap gap-2">
            {Object.entries(metrics.articles_by_status).map(([status, count]) => (
              <span key={status} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                {STATUS_LABEL[status] ?? status} <span className="ml-1 font-mono opacity-70">{count}</span>
              </span>
            ))}
            {Object.keys(metrics.articles_by_status).length === 0 && <p className="text-xs text-slate-500">No articles yet.</p>}
          </div>
        </SectionCard>
      )}

      {isAdmin && (
        <SectionCard
          title="Audit trail"
          description="Every decision, transition and publish, in order."
          actions={<Button size="sm" variant="outline" loading={busy} onClick={verifyChain}>Check integrity</Button>}
        >
          {chain && <Notice tone={chain.includes("intact") ? "success" : "danger"} className="mb-3">{chain}</Notice>}
          <ul className="divide-y divide-[#071A2B]/10">
            {(audit ?? []).map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-xs">
                <span className="font-semibold text-[#071A2B]">{row.action.replace(/_/g, " ")}{row.article_id ? ` · #${row.article_id}` : ""}</span>
                <span className="text-slate-500">{row.actor} · {relativeTime(utc(row.ts))}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <ConfirmDialog
        isOpen={confirmAuto}
        title="Turn on auto-publish?"
        message="Articles that pass every check will go live without a human approving them. Anything flagged still waits for review. You can pause publishing at any time."
        confirmLabel="Turn on auto-publish"
        tone="primary"
        onCancel={() => setConfirmAuto(false)}
        onConfirm={() => {
          setConfirmAuto(false);
          void act(() => nieApi.setAutoPublish(true));
        }}
      />
    </div>
  );
}
