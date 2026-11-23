/**
 * Browser client for the NIE review API.
 *
 * The browser never holds an NIE key: every request goes to the same-origin `/api/nie/*` function with the
 * signed-in editor's Supabase access token, and that server-side function (api/nie/[...path].ts) verifies the
 * token + role before calling NIE.
 */

import { isSupabaseConfigured, supabase } from "../supabase";
import type {
  NieAuditRow,
  NieBrief,
  NieDecisionKind,
  NieEdits,
  NieFull,
  NieHealth,
  NieImage,
  NieImageUploadInput,
  NieMetrics,
} from "./types";

export class NieError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "NieError";
    this.status = status;
  }
}

async function accessToken(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function detailMessage(data: unknown, status: number): string {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: unknown; loc?: unknown };
      const where = Array.isArray(first.loc) ? ` (${first.loc.slice(1).join(".")})` : "";
      if (typeof first.msg === "string") return `${first.msg}${where}`;
    }
  }
  if (status === 401) return "Your session has expired. Sign in again.";
  if (status === 403) return "Your role is not allowed to do that.";
  if (status === 502 || status === 504) return "The newsroom service is not reachable right now.";
  return `Request failed (${status}).`;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await accessToken();
  if (!token) throw new NieError("Sign in required.", 401);

  let response: Response;
  try {
    response = await fetch(`/api/nie${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new NieError("Could not reach the admin server. Check your connection.", 0);
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) throw new NieError(detailMessage(data, response.status), response.status);
  return data as T;
}

export const nieApi = {
  reviewQueue: () => call<NieBrief[]>("GET", "/reviews?limit=100"),
  articles: (status?: string) =>
    call<NieBrief[]>("GET", `/articles?limit=100${status ? `&status=${encodeURIComponent(status)}` : ""}`),
  article: (id: number) => call<NieFull>("GET", `/articles/${id}`),

  review: (id: number, decision: NieDecisionKind, notes?: string, edits?: NieEdits, publish = false) =>
    call<NieBrief>("POST", `/articles/${id}/review`, { decision, notes: notes ?? null, edits: edits ?? null, publish }),
  publish: (id: number) => call<NieBrief>("POST", `/articles/${id}/publish`),
  unpublish: (id: number, notes?: string) => call<NieBrief>("POST", `/articles/${id}/unpublish`, { notes: notes ?? null }),
  retract: (id: number, notes?: string) => call<NieBrief>("POST", `/articles/${id}/retract`, { notes: notes ?? null }),
  retry: (id: number) => call<NieBrief>("POST", `/articles/${id}/retry`),
  reassess: (id: number) => call<unknown>("POST", `/articles/${id}/reassess`),

  uploadImage: (id: number, input: NieImageUploadInput) =>
    call<NieImage & { article_status: string }>("POST", `/articles/${id}/images/upload`, input),

  health: () => call<NieHealth>("GET", "/system/health"),
  metrics: () => call<NieMetrics>("GET", "/system/metrics"),
  settings: () => call<{ auto_publish: boolean; publishing_paused: boolean }>("GET", "/system/settings"),
  setAutoPublish: (value: boolean) =>
    call<{ auto_publish: boolean; publishing_paused: boolean }>("PATCH", "/system/settings", { auto_publish: value }),
  pause: () => call<{ publishing_paused: boolean }>("POST", "/system/publishing/pause"),
  resume: () => call<{ publishing_paused: boolean }>("POST", "/system/publishing/resume"),
  auditLogs: () => call<NieAuditRow[]>("GET", "/audit-logs?limit=60"),
  verifyAudit: () => call<{ intact: boolean; first_broken_id: number | null }>("GET", "/audit-logs/verify"),
};
