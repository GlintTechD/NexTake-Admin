/**
 * Vercel serverless proxy: admin console -> NexTake Intelligence Engine (NIE).
 *
 * Why this exists: the console is a static SPA, so it must never hold an NIE API key. This function
 *   1. verifies the caller's Supabase session (access token),
 *   2. checks their role in `admin_profiles`,
 *   3. allow-lists the NIE routes (method + path) and the role level each one needs,
 *   4. calls NIE with a server-side key and tells it which human acted (X-NIE-Actor → NIE's audit log).
 *
 * Env (Vercel project settings, NOT VITE_-prefixed for the NIE ones):
 *   NIE_API_URL        e.g. https://nie.example.com   (HTTPS, reverse-proxied to the NIE service)
 *   NIE_EDITOR_KEY     NIE key with the `editor` role
 *   NIE_ADMIN_KEY      NIE key with the `admin` role (pause/resume, auto-publish, retract, audit log)
 *   SUPABASE_URL / SUPABASE_ANON_KEY   (falls back to the VITE_ ones the console already uses)
 */

type Header = string | string[] | undefined;

interface Req {
  method?: string;
  url?: string;
  headers: Record<string, Header>;
  body?: unknown;
}

interface Res {
  status(code: number): Res;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

type Level = "editor" | "admin";

const ROUTES: Array<{ method: string; pattern: RegExp; level: Level }> = [
  { method: "GET", pattern: /^\/reviews$/, level: "editor" },
  { method: "GET", pattern: /^\/articles$/, level: "editor" },
  { method: "GET", pattern: /^\/articles\/\d+$/, level: "editor" },
  { method: "GET", pattern: /^\/articles\/\d+\/(images|risk)$/, level: "editor" },
  { method: "POST", pattern: /^\/articles\/\d+\/(review|approve|reject|revise|publish|unpublish|reassess|retry)$/, level: "editor" },
  { method: "POST", pattern: /^\/articles\/\d+\/images\/(upload|search)$/, level: "editor" },
  { method: "POST", pattern: /^\/images\/\d+\/verify$/, level: "editor" },
  { method: "GET", pattern: /^\/stories(\/\d+)?$/, level: "editor" },
  { method: "POST", pattern: /^\/stories\/\d+\/(research|ignore)$/, level: "editor" },
  { method: "GET", pattern: /^\/system\/(health|metrics)$/, level: "editor" },
  { method: "GET", pattern: /^\/system\/settings$/, level: "admin" },
  { method: "PATCH", pattern: /^\/system\/settings$/, level: "admin" },
  { method: "POST", pattern: /^\/system\/publishing\/(pause|resume)$/, level: "admin" },
  { method: "POST", pattern: /^\/system\/ingest$/, level: "admin" },
  { method: "POST", pattern: /^\/articles\/\d+\/retract$/, level: "admin" },
  { method: "GET", pattern: /^\/audit-logs(\/verify)?$/, level: "admin" },
];

// admin_profiles.role -> NIE access level. Anything else (writer, researcher, ...) gets no access.
const ROLE_LEVEL: Record<string, Level> = {
  admin: "admin",
  editor_in_chief: "admin",
  editor: "editor",
  managing_editor: "editor",
};

const first = (value: Header): string => (Array.isArray(value) ? value[0] ?? "" : value ?? "");

async function timedFetch(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function identify(token: string): Promise<{ email: string; level: Level } | { error: string; status: number }> {
  const base = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!base || !anon) return { error: "Supabase is not configured on the server.", status: 500 };

  const headers = { apikey: anon, Authorization: `Bearer ${token}` };
  const userResponse = await timedFetch(`${base}/auth/v1/user`, { headers }, 8000);
  if (!userResponse.ok) return { error: "Your session has expired. Sign in again.", status: 401 };
  const user = (await userResponse.json()) as { id?: string };
  if (!user.id || !/^[0-9a-f-]{36}$/i.test(user.id)) return { error: "Invalid session.", status: 401 };

  // RLS lets a signed-in user read their own profile row, so the user's own token is enough here.
  const profileResponse = await timedFetch(
    `${base}/rest/v1/admin_profiles?id=eq.${user.id}&select=role,email&limit=1`,
    { headers },
    8000,
  );
  const rows = profileResponse.ok ? ((await profileResponse.json()) as Array<{ role?: string; email?: string }>) : [];
  const profile = rows[0];
  const level = profile?.role ? ROLE_LEVEL[profile.role] : undefined;
  if (!profile || !level) return { error: "Your role cannot use the newsroom review tools.", status: 403 };
  return { email: profile.email || user.id, level };
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "no-store");

  const url = new URL(req.url ?? "/", "http://local");
  const path = url.pathname.replace(/^\/api\/nie/, "") || "/";
  const method = (req.method ?? "GET").toUpperCase();

  const route = ROUTES.find((r) => r.method === method && r.pattern.test(path));
  if (!route) return res.status(404).json({ detail: "Unknown newsroom route." });

  const nieUrl = (process.env.NIE_API_URL || "").replace(/\/$/, "");
  const keys: Record<Level, string> = {
    editor: process.env.NIE_EDITOR_KEY || "",
    admin: process.env.NIE_ADMIN_KEY || "",
  };
  if (!nieUrl || !keys.editor || !keys.admin) {
    return res.status(503).json({ detail: "The newsroom service is not configured on the server." });
  }

  const bearer = first(req.headers.authorization).replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return res.status(401).json({ detail: "Sign in required." });

  try {
    const who = await identify(bearer);
    if ("error" in who) return res.status(who.status).json({ detail: who.error });
    if (route.level === "admin" && who.level !== "admin") {
      return res.status(403).json({ detail: "Only an administrator can do that." });
    }

    const hasBody = method !== "GET" && req.body !== undefined && req.body !== null && req.body !== "";
    const upstream = await timedFetch(
      `${nieUrl}${path}${url.search}`,
      {
        method,
        headers: {
          "X-API-Key": keys[route.level],
          "X-NIE-Actor": who.email,
          ...(hasBody ? { "Content-Type": "application/json" } : {}),
        },
        body: hasBody ? (typeof req.body === "string" ? req.body : JSON.stringify(req.body)) : undefined,
      },
      25000,
    );

    const text = await upstream.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { detail: "Unexpected response from the newsroom service." };
    }
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(502).json({ detail: "The newsroom service is not reachable right now." });
  }
}
