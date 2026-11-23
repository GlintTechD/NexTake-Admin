import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { relativeTime } from "../../../lib/backend";
import { renderMarkdown } from "../../../lib/markdown";
import { NieError, nieApi } from "../../../lib/nie/client";
import type { NieClaim, NieDecisionKind, NieFull } from "../../../lib/nie/types";
import { Badge, Button, EmptyState, Notice, SectionCard, type BadgeTone } from "../../ui/primitives";
import { PageHeader, SplitLayout } from "../../ui/layout";
import { Field, TextArea, TextInput } from "../../ui/form";
import { ConfirmDialog, Modal } from "../../ui/overlay";
import NieAuthGate, { isNieAdmin } from "./NieAuthGate";
import NieImageUpload from "./NieImageUpload";
import { ACTION_LABEL, Fact, NieStatusBadge, RiskBadge, gateLabel, utc } from "./nieUi";

const CLAIM_TONE: Record<NieClaim["status"], BadgeTone> = {
  verified: "emerald",
  attributed: "sky",
  disputed: "rose",
  insufficient: "amber",
  unverified: "neutral",
};
const CLAIM_LABEL: Record<NieClaim["status"], string> = {
  verified: "Verified",
  attributed: "Attribute to source",
  disputed: "Sources disagree",
  insufficient: "Not enough evidence",
  unverified: "Unchecked",
};
const SEVERITY_TONE: Record<string, BadgeTone> = { low: "emerald", medium: "amber", high: "rose", critical: "rose" };
const IN_PROGRESS = ["DISCOVERED", "CLASSIFIED", "RESEARCHING", "VERIFYING", "WRITING", "IMAGE_RESEARCH", "RISK_ASSESSMENT", "QUALITY_REVIEW"];

type Dialog =
  | { kind: "note"; decision: Extract<NieDecisionKind, "reject" | "escalate" | "more_research" | "rewrite"> }
  | { kind: "edit" }
  | { kind: "publish" }
  | { kind: "unpublish" }
  | { kind: "retract" }
  | null;

const NOTE_COPY = {
  reject: { title: "Reject this draft", label: "Reason", button: "Reject draft", required: false, hint: "Recorded in the audit trail." },
  escalate: { title: "Escalate for legal review", label: "What needs checking", button: "Escalate", required: false, hint: "The draft stays held until someone clears it." },
  more_research: { title: "Request more research", label: "What should be checked", button: "Send back to research", required: false, hint: "The engine will look for more sources and re-verify." },
  rewrite: { title: "Return for rewriting", label: "Instruction for the writer", button: "Send back to writing", required: true, hint: "For example: shorter, lead with the funding amount, attribute the user numbers." },
} as const;

const message = (e: unknown) => (e instanceof NieError ? e.message : "Something went wrong. Try again.");

function Inner({ articleId, isAdmin, onBack }: { articleId: number; isAdmin: boolean; onBack: () => void }) {
  const [a, setA] = useState<NieFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [note, setNote] = useState("");
  const [edit, setEdit] = useState({ headline: "", summary: "", body_md: "", meta_description: "", tags: "" });

  const load = useCallback(async () => {
    try {
      setA(await nieApi.article(articleId));
      setError(null);
    } catch (e) {
      setError(message(e));
    }
  }, [articleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (success: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await fn();
      setDialog(null);
      setNote("");
      setDone(success);
      await load();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const hasImage = !!a?.images.some((i) => i.verified && i.editorial_ok);
  const reviewable = a ? ["FLAGGED_DRAFT", "READY_TO_PUBLISH"].includes(a.status) : false;
  const approved = a?.human_decision === "approved";
  const evidenceByClaim = useMemo(() => {
    const map = new Map<number, NieFull["evidence"]>();
    a?.evidence.forEach((e) => map.set(e.claim_id, [...(map.get(e.claim_id) ?? []), e]));
    return map;
  }, [a]);
  const docById = useMemo(() => new Map((a?.documents ?? []).map((d) => [d.id, d])), [a]);
  const latestAssessment = a?.assessments[a.assessments.length - 1];

  const openEdit = () => {
    if (!a) return;
    setEdit({ headline: a.headline ?? "", summary: a.summary ?? "", body_md: a.body_md ?? "", meta_description: a.meta_description ?? "", tags: (a.tags ?? []).join(", ") });
    setDialog({ kind: "edit" });
  };

  if (!a) {
    return error ? (
      <div className="space-y-4"><Notice tone="danger">{error}</Notice><Button variant="outline" onClick={onBack}>Back to the queue</Button></div>
    ) : (
      <div className="flex items-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading draft…</div>
    );
  }

  const lastFlag = a.flag_reasons[a.flag_reasons.length - 1];

  return (
    <div className="space-y-6">
      <PageHeader
        title={a.headline ?? `Draft #${a.id}`}
        breadcrumbs={[{ label: "AI newsroom", onClick: onBack }, { label: `#${a.id}` }]}
        badge={<><NieStatusBadge status={a.status} /><RiskBadge level={a.risk_level} /></>}
        actions={<Button variant="outline" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void load()}>Refresh</Button>}
      />

      {error && <Notice tone="danger">{error}</Notice>}
      {done && <Notice tone="success">{done}</Notice>}

      {a.status === "FLAGGED_DRAFT" && (
        <Notice tone="warning" title={a.human_decision === "rejected" ? "Rejected" : "Held for review"}>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {a.flag_reasons.slice(-4).map((f, i) => (
              <li key={i}><span className="font-semibold">{gateLabel(f.gate)}.</span> {f.reason} <span className="text-amber-700">Next: {ACTION_LABEL[f.next_action] ?? f.next_action}.</span></li>
            ))}
          </ul>
        </Notice>
      )}
      {a.status === "READY_TO_PUBLISH" && (
        <Notice tone="success" title={approved ? "Approved — ready to publish" : "Passed every check"}>
          {approved ? "Publish it when you are ready." : "Auto-publish is off, so it is waiting for your approval."}
        </Notice>
      )}
      {a.status === "FAILED" && <Notice tone="danger" title="This draft failed">{a.last_error ?? "A technical error stopped the pipeline."}</Notice>}
      {IN_PROGRESS.includes(a.status) && <Notice tone="info" title="Still being prepared">The engine is working on this draft. Refresh in a minute.</Notice>}
      {a.status === "PUBLISHED" && <Notice tone="success" title="Live on the site">{a.cms_url ? <a className="underline" href={a.cms_url} target="_blank" rel="noopener noreferrer">Open the article</a> : "Published to the website database."}</Notice>}

      <SplitLayout
        main={
          <>
            <SectionCard title="Article" description={a.body_md ? `Version ${a.version}` : undefined}>
              {a.body_md ? (
                <article className="space-y-3">
                  <p className="text-sm font-semibold text-slate-600">{a.summary}</p>
                  <div className="space-y-3 text-sm leading-relaxed text-[#071A2B] [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc" dangerouslySetInnerHTML={{ __html: renderMarkdown(a.body_md) }} />
                </article>
              ) : (
                <EmptyState title="Nothing written yet" description="The article appears here once research and verification are finished." />
              )}
            </SectionCard>

            {a.decision.gates && a.decision.gates.length > 0 && (
              <SectionCard title="Publishing checks" description="Every check must pass before anything is published automatically.">
                <ul className="grid gap-2 sm:grid-cols-2">
                  {a.decision.gates.map((g) => (
                    <li key={g.gate} className="flex items-start gap-2 text-xs">
                      {g.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />}
                      <span><span className="font-semibold text-[#071A2B]">{gateLabel(g.gate)}</span>{!g.ok && g.reason ? <span className="block text-slate-500">{g.reason}</span> : null}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            <SectionCard title="Claims and evidence" description="Each statement the article relies on, with the passage that supports it.">
              {a.claims.length === 0 ? <p className="text-xs text-slate-500">No claims extracted yet.</p> : (
                <ul className="space-y-4">
                  {a.claims.map((c) => (
                    <li key={c.id} className="space-y-2 rounded-xl border border-[#071A2B]/10 p-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={CLAIM_TONE[c.status]}>{CLAIM_LABEL[c.status]}</Badge>
                        <Badge>{c.type}</Badge>
                        {!c.material && <Badge>minor</Badge>}
                      </div>
                      <p className="text-sm font-semibold text-[#071A2B]">{c.text}</p>
                      {c.note && <p className="text-xs text-slate-500">{c.note}</p>}
                      {(evidenceByClaim.get(c.id) ?? []).map((e) => {
                        const d = docById.get(e.doc_id);
                        return (
                          <blockquote key={e.id} className={`border-l-2 pl-3 text-xs ${e.stance === "contradicts" ? "border-rose-400 text-rose-800" : "border-[#7FFFD4] text-slate-600"}`}>
                            “{e.excerpt}”
                            {d && <a href={d.url} target="_blank" rel="noopener noreferrer" className="ml-2 font-semibold underline">{d.publisher}</a>}
                            {e.stance === "contradicts" && <span className="ml-2 font-semibold">contradicts</span>}
                          </blockquote>
                        );
                      })}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title="Risk screening"
              description={latestAssessment ? `Policy ${latestAssessment.policy_version}` : "Not screened yet."}
              actions={a.body_md ? <Button size="sm" variant="outline" loading={busy} onClick={() => void run("Screening re-run.", () => nieApi.reassess(a.id))}>Re-run screening</Button> : undefined}
            >
              {latestAssessment && latestAssessment.findings.length === 0 && <p className="text-xs text-slate-600">No findings.</p>}
              <ul className="space-y-3">
                {(latestAssessment?.findings ?? []).map((f, i) => (
                  <li key={i} className="flex gap-2.5 text-xs">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-semibold text-[#071A2B]"><Badge tone={SEVERITY_TONE[f.severity] ?? "neutral"}>{f.severity}</Badge> <span className="ml-1">{f.type.replace(/_/g, " ")}</span></p>
                      <p className="mt-1 text-slate-600">{f.explanation}</p>
                      {f.evidence && f.evidence.length > 0 && <p className="mt-1 text-slate-500">Matched: {f.evidence.join(", ")}</p>}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-slate-400">This screening is a safety net, not legal advice.</p>
            </SectionCard>

            <SectionCard title="Sources read" description="Pages the engine retrieved. Their text is treated as data, never as instructions.">
              <ul className="space-y-2">
                {a.documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#071A2B] underline">{d.publisher}<ExternalLink className="h-3 w-3" /></a>
                    {d.role === "lead" && <Badge tone="mint">lead source</Badge>}
                    {d.is_primary && <Badge tone="violet">primary</Badge>}
                    {d.kind === "summary" && <Badge>summary only</Badge>}
                    {d.injection_suspected && <Badge tone="rose"><AlertTriangle className="mr-1 inline h-3 w-3" />contains instruction-like text</Badge>}
                  </li>
                ))}
              </ul>
            </SectionCard>
          </>
        }
        side={
          <>
            <SectionCard title="Decide">
              <div className="space-y-2">
                {reviewable && (
                  <>
                    {!approved && (
                      <Button className="w-full" disabled={busy || !a.body_md || !hasImage} onClick={() => void run("Approved and published.", () => nieApi.review(a.id, "approve", undefined, undefined, true))}>
                        Approve and publish
                      </Button>
                    )}
                    {approved && a.status === "READY_TO_PUBLISH" && (
                      <Button className="w-full" disabled={busy || !hasImage} onClick={() => setDialog({ kind: "publish" })}>Publish now</Button>
                    )}
                    {!approved && (
                      <Button className="w-full" variant="secondary" disabled={busy || !a.body_md} onClick={() => void run("Approved. Publish it when ready.", () => nieApi.review(a.id, "approve"))}>
                        Approve without publishing
                      </Button>
                    )}
                    {!hasImage && <p className="text-[11px] text-amber-700">Add an image with a verified licence before publishing.</p>}
                    <Button className="w-full" variant="outline" disabled={busy || !a.body_md} onClick={openEdit}>Edit and approve</Button>
                    <Button className="w-full" variant="outline" disabled={busy} onClick={() => { setNote(""); setDialog({ kind: "note", decision: "more_research" }); }}>Request more research</Button>
                    <Button className="w-full" variant="outline" disabled={busy} onClick={() => { setNote(""); setDialog({ kind: "note", decision: "rewrite" }); }}>Return for rewriting</Button>
                    <Button className="w-full" variant="outline" disabled={busy} onClick={() => { setNote(""); setDialog({ kind: "note", decision: "escalate" }); }}>Escalate for legal review</Button>
                    <Button className="w-full" variant="danger" disabled={busy} onClick={() => { setNote(""); setDialog({ kind: "note", decision: "reject" }); }}>Reject</Button>
                  </>
                )}
                {a.status === "FAILED" && <Button className="w-full" loading={busy} onClick={() => void run("Retrying.", () => nieApi.retry(a.id))}>Retry from the start</Button>}
                {a.status === "PUBLISHED" && (
                  <>
                    <Button className="w-full" variant="outline" disabled={busy} onClick={() => setDialog({ kind: "unpublish" })}>Unpublish</Button>
                    {isAdmin && <Button className="w-full" variant="danger" disabled={busy} onClick={() => setDialog({ kind: "retract" })}>Retract permanently</Button>}
                  </>
                )}
                {!reviewable && !["FAILED", "PUBLISHED"].includes(a.status) && <p className="text-xs text-slate-500">No decision needed right now.</p>}
              </div>
            </SectionCard>

            <SectionCard title="Image" description="Real photographs only. AI-generated images are never used.">
              <ul className="space-y-3">
                {a.images.map((img) => (
                  <li key={img.id} className="space-y-1.5">
                    <img src={img.url} alt="" className="max-h-44 w-full rounded-xl border border-[#071A2B]/10 object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    <p className="text-xs font-semibold text-[#071A2B]">{img.attribution_text}</p>
                    <p className="text-[11px] text-slate-500">{img.licence_id}{img.is_illustrative ? " · illustrative" : ""} · checked by {img.verified_by.replace(/^human:/, "")}</p>
                  </li>
                ))}
              </ul>
              {!hasImage && <Notice tone="warning" className="mb-3">No image yet. Upload one to continue.</Notice>}
              {!["PUBLISHED", "PUBLISHING", "RETRACTED"].includes(a.status) && (
                <NieImageUpload articleId={a.id} onUploaded={(status) => { setDone(status === "RISK_ASSESSMENT" ? "Image attached. The draft is being re-screened." : "Image attached."); void load(); }} />
              )}
            </SectionCard>

            <SectionCard title="Details">
              <Fact label="Relevance score">{a.relevance_score ?? "–"}</Fact>
              <Fact label="Category">{a.category ?? "–"}</Fact>
              <Fact label="Last flagged">{lastFlag ? gateLabel(lastFlag.gate) : "–"}</Fact>
              <Fact label="Updated">{relativeTime(utc(a.updated_at))}</Fact>
              {a.reviews.length > 0 && (
                <ul className="mt-3 space-y-2 border-t border-[#071A2B]/10 pt-3">
                  {a.reviews.slice(-6).map((r, i) => (
                    <li key={i} className="text-xs text-slate-600"><span className="font-semibold text-[#071A2B]">{r.decision.replace(/_/g, " ")}</span> by {r.reviewer.replace(/^human:/, "")} · {relativeTime(utc(r.at))}{r.notes ? ` — ${r.notes}` : ""}</li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </>
        }
      />

      {dialog?.kind === "note" && (
        <Modal
          isOpen
          onClose={() => setDialog(null)}
          title={NOTE_COPY[dialog.decision].title}
          footer={
            <>
              <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button
                variant={dialog.decision === "reject" ? "danger" : "primary"}
                loading={busy}
                disabled={NOTE_COPY[dialog.decision].required && note.trim().length < 3}
                onClick={() => void run("Done.", () => nieApi.review(a.id, dialog.decision, note.trim() || undefined))}
              >
                {NOTE_COPY[dialog.decision].button}
              </Button>
            </>
          }
        >
          <Field label={NOTE_COPY[dialog.decision].label} hint={NOTE_COPY[dialog.decision].hint}>
            <TextArea rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </Modal>
      )}

      {dialog?.kind === "edit" && (
        <Modal
          isOpen
          size="xl"
          onClose={() => setDialog(null)}
          title="Edit and approve"
          description="Your edits are saved as a new version and screened again. Approving means you accept the result."
          footer={
            <>
              <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button
                loading={busy}
                onClick={() =>
                  void run("Edited and approved.", () =>
                    nieApi.review(a.id, "edit_approve", undefined, {
                      headline: edit.headline.trim(),
                      summary: edit.summary.trim(),
                      body_md: edit.body_md,
                      meta_description: edit.meta_description.trim(),
                      tags: edit.tags.split(",").map((t) => t.trim()).filter(Boolean),
                    }),
                  )
                }
              >
                Save and approve
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Headline"><TextInput value={edit.headline} onChange={(e) => setEdit({ ...edit, headline: e.target.value })} /></Field>
            <Field label="Summary"><TextArea rows={2} value={edit.summary} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} /></Field>
            <Field label="Body" hint="Markdown. Keep the Sources section at the end."><TextArea rows={14} value={edit.body_md} onChange={(e) => setEdit({ ...edit, body_md: e.target.value })} /></Field>
            <Field label="Search description" hint="50–160 characters."><TextInput value={edit.meta_description} onChange={(e) => setEdit({ ...edit, meta_description: e.target.value })} /></Field>
            <Field label="Tags" hint="Separate with commas."><TextInput value={edit.tags} onChange={(e) => setEdit({ ...edit, tags: e.target.value })} /></Field>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={dialog?.kind === "publish"}
        title="Publish this article?"
        message="It goes live on the website immediately."
        confirmLabel="Publish now"
        tone="primary"
        onCancel={() => setDialog(null)}
        onConfirm={() => void run("Publishing. It appears on the site in a moment.", () => nieApi.publish(a.id))}
      />
      <ConfirmDialog
        isOpen={dialog?.kind === "unpublish"}
        title="Unpublish this article?"
        message="It is taken off the website and returned to the review queue. You can publish it again later."
        confirmLabel="Unpublish"
        tone="danger"
        onCancel={() => setDialog(null)}
        onConfirm={() => void run("Unpublished.", () => nieApi.unpublish(a.id))}
      />
      <ConfirmDialog
        isOpen={dialog?.kind === "retract"}
        title="Retract this article?"
        message="It is taken off the website and marked retracted for good. Use this when the story was wrong."
        confirmLabel="Retract"
        tone="danger"
        requirePhrase="retract"
        onCancel={() => setDialog(null)}
        onConfirm={() => void run("Retracted.", () => nieApi.retract(a.id))}
      />
    </div>
  );
}

export default function NieArticlePage({ articleId, onBack }: { articleId: number; onBack: () => void }) {
  return <NieAuthGate>{(profile) => <Inner articleId={articleId} isAdmin={isNieAdmin(profile)} onBack={onBack} />}</NieAuthGate>;
}
