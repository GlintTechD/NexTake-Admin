import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "../../ui/primitives";

/** NIE timestamps are naive UTC; make the browser read them as UTC rather than local time. */
export function utc(iso: string | null | undefined): string {
  if (!iso) return "";
  return /(Z|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`;
}

export const STATUS_LABEL: Record<string, string> = {
  DISCOVERED: "Queued",
  CLASSIFIED: "Classified",
  RESEARCHING: "Researching",
  VERIFYING: "Verifying",
  WRITING: "Writing",
  IMAGE_RESEARCH: "Finding image",
  RISK_ASSESSMENT: "Risk screening",
  QUALITY_REVIEW: "Quality check",
  READY_TO_PUBLISH: "Ready to publish",
  PUBLISHING: "Publishing",
  PUBLISHED: "Published",
  FLAGGED_DRAFT: "Held for review",
  FAILED: "Failed",
  RETRACTED: "Retracted",
};

const STATUS_TONE: Record<string, BadgeTone> = {
  READY_TO_PUBLISH: "emerald",
  PUBLISHED: "emerald",
  PUBLISHING: "sky",
  FLAGGED_DRAFT: "amber",
  FAILED: "rose",
  RETRACTED: "neutral",
};

export function NieStatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "sky"}>{STATUS_LABEL[status] ?? status}</Badge>;
}

const RISK_TONE: Record<string, BadgeTone> = { low: "emerald", medium: "amber", high: "rose", critical: "rose" };

export function RiskBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-xs text-slate-400">Not screened</span>;
  return <Badge tone={RISK_TONE[level] ?? "neutral"}>{level} risk</Badge>;
}

export const GATE_LABEL: Record<string, string> = {
  image_rights: "Image rights",
  legal_risk: "Legal risk",
  insufficient_evidence: "Not enough evidence",
  contradiction: "Sources disagree",
  human_review: "Needs a human decision",
  writing_checks: "Writing checks failed",
  seo_structure: "Structure and SEO",
  duplicate: "Possible duplicate",
  human_escalation: "Escalated",
  relevant: "Relevant to NexTake",
  sufficient_evidence: "Enough independent evidence",
  claims_verified: "Material claims verified",
  no_contradictions: "No contradictions",
  originality: "Original wording",
  legal_low_risk: "Low legal risk",
  image_verified: "Image licence verified",
  no_duplicate: "No duplicate",
  cms_healthy: "CMS reachable",
  not_paused: "Publishing not paused",
  auto_publish_enabled: "Auto-publish on",
};

export const ACTION_LABEL: Record<string, string> = {
  add_image: "Add an image",
  request_more_research: "Request more research",
  escalate_legal: "Escalate for legal review",
  return_for_rewriting: "Return for rewriting",
  reject_or_merge: "Reject or merge with the existing story",
  block_and_escalate: "Do not publish; escalate",
  human_review: "Review and decide",
};

export const gateLabel = (gate: string) => GATE_LABEL[gate] ?? gate.replace(/_/g, " ");

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-[#071A2B]">{children}</span>
    </div>
  );
}
