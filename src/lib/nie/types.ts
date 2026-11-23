/** Shapes returned by the NexTake Intelligence Engine (NIE) API, via the /api/nie proxy. */

export interface NieFlag {
  gate: string;
  reason: string;
  evidence_ids: number[];
  next_action: string;
}

export interface NieGate {
  gate: string;
  ok: boolean;
  reason: string;
  ops: boolean;
}

export interface NieBrief {
  id: number;
  story_id: number | null;
  status: string;
  headline: string | null;
  category: string | null;
  geo: string | null;
  relevance_score: number | null;
  risk_level: string | null;
  human_decision: string | null;
  flag_reasons: NieFlag[];
  cms_id: string | null;
  cms_url: string | null;
  published_at: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  /** Only on /reviews rows. */
  decision?: NieDecision;
}

export interface NieDecision {
  evaluated?: boolean;
  would_publish?: boolean;
  gates?: NieGate[];
  at?: string;
}

export interface NieClaim {
  id: number;
  text: string;
  type: string;
  material: boolean;
  status: "unverified" | "verified" | "attributed" | "disputed" | "insufficient";
  note: string | null;
}

export interface NieEvidence {
  id: number;
  claim_id: number;
  doc_id: number;
  stance: "supports" | "contradicts";
  excerpt: string;
  note: string | null;
}

export interface NieDoc {
  id: number;
  url: string;
  publisher: string;
  title: string;
  kind: string;
  role: string;
  is_primary: boolean;
  injection_suspected: boolean;
}

export interface NieImage {
  id: number;
  provider: string;
  source_url: string;
  url: string;
  creator: string;
  licence_id: string;
  licence_url: string;
  attribution_text: string;
  editorial_ok: boolean;
  commercial_ok: boolean;
  is_illustrative: boolean;
  verified: boolean;
  verified_by: string;
  width: number;
  height: number;
}

export interface NieFinding {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  explanation: string;
  source?: string;
  action?: string;
  evidence?: string[];
}

export interface NieAssessment {
  id: number;
  policy_version: string;
  risk_level: string;
  score: number;
  findings: NieFinding[];
  human_review_required: boolean;
  decision: string;
  at: string;
}

export interface NieReview {
  reviewer: string;
  decision: string;
  notes: string | null;
  at: string;
}

export interface NieFull extends NieBrief {
  summary: string | null;
  body_md: string | null;
  meta_description: string | null;
  slug: string | null;
  tags: string[];
  sources: Array<{ publisher: string; title: string; url: string; primary: boolean }>;
  decision: NieDecision;
  meta: Record<string, unknown>;
  version: number;
  claims: NieClaim[];
  evidence: NieEvidence[];
  documents: NieDoc[];
  images: NieImage[];
  assessments: NieAssessment[];
  reviews: NieReview[];
  versions: Array<{ version: number; author: string; at: string }>;
}

export interface NieMetrics {
  articles_by_status: Record<string, number>;
  stories: number;
  stories_new: number;
  llm_calls_today: number;
  llm_daily_limit: number;
  review_queue: number;
}

export interface NieHealth {
  db: boolean;
  cms: boolean;
  llm_configured: boolean;
  serper_configured: boolean;
  unsplash_configured: boolean;
  pexels_configured: boolean;
  publishing_paused: boolean;
  auto_publish: boolean;
  scraper: string;
}

export interface NieAuditRow {
  id: number;
  ts: string;
  actor: string;
  action: string;
  article_id: number | null;
  detail: Record<string, unknown> | null;
}

export type NieDecisionKind =
  | "approve"
  | "edit_approve"
  | "more_research"
  | "reject"
  | "rewrite"
  | "escalate";

export interface NieEdits {
  headline?: string;
  summary?: string;
  body_md?: string;
  meta_description?: string;
  tags?: string[];
}

export interface NieImageUploadInput {
  data_base64: string;
  creator: string;
  licence_id: string;
  licence_url: string;
  attribution_text: string;
  source_url: string;
  is_illustrative: boolean;
  alt: string;
}
