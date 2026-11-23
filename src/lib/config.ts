/**
 * Runtime configuration.
 *
 * Nothing secret lives in the frontend: the only values read here are the
 * public Supabase project URL and its *anonymous* key. All privileged work
 * (password hashing, token issuance, email delivery, row-level security) is
 * performed by Supabase Auth / Postgres — never by client code.
 */

const env = import.meta.env;

export const SUPABASE_URL = (env.VITE_SUPABASE_URL ?? "").trim();
export const SUPABASE_ANON_KEY = (env.VITE_SUPABASE_ANON_KEY ?? "").trim();
export const NIE_PASSWORD_ONLY_EMAIL = (env.VITE_NIE_PASSWORD_ONLY_EMAIL ?? "")
  .trim()
  .toLowerCase();

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Origin used when building the email verification (magic) link. */
export const APP_ORIGIN =
  (env.VITE_SITE_URL ?? "").trim() ||
  (typeof window !== "undefined" ? window.location.origin : "");

export const BRAND = {
  name: "NexTake",
  slogan: "TECHNOLOGY NEWS. INTELLIGENTLY CURATED.",
  contactEmail: "nextakeafrica@gmail.com",
} as const;

/**
 * Lifetime of the emailed verification code, in seconds. Supabase's default
 * OTP expiry is one hour; override it here if the project is tuned shorter.
 */
export const VERIFICATION_CODE_TTL_SECONDS =
  Number(env.VITE_VERIFICATION_TTL_SECONDS ?? 3600) || 3600;
/** Client-side resend throttle — mirrors Supabase's own rate limiting. */
export const RESEND_COOLDOWN_SECONDS = 45;

export const STORAGE_BUCKET = "nextake-media";
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/avif",
] as const;
