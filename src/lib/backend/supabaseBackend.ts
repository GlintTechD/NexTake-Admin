import { supabase } from "../supabase";
import { STORAGE_BUCKET, VERIFICATION_CODE_TTL_SECONDS } from "../config";
import type {
  ActivityItem,
  AdminProfile,
  Article,
  Company,
  SiteSettings,
} from "../../types";
import {
  DEFAULT_SETTINGS,
  articleInputToRow,
  mapArticleRow,
  mapCompanyRow,
  mapSettings,
  settingsToRow,
} from "./mappers";
import {
  fail,
  ok,
  type Backend,
  type BackendResult,
  type SuperAdminSignUpInput,
  type SuperAdminSignUpOutcome,
  type VerificationDispatch,
} from "./types";
import { relativeTime } from "./utils";

/* ------------------------------------------------------------------ */
/* Error translation — never leak provider internals to the screen      */
/* ------------------------------------------------------------------ */

function authErrorMessage(message: string): string {
  const text = message.toLowerCase();

  if (text.includes("invalid login credentials")) {
    return "That email and password combination is not recognised.";
  }
  if (text.includes("email not confirmed")) {
    return "This address has not been confirmed yet. Check your inbox for the confirmation email.";
  }
  if (text.includes("too many requests") || text.includes("rate limit")) {
    return "Too many attempts. Wait a moment before trying again.";
  }
  if (text.includes("token has expired") || text.includes("otp_expired")) {
    return "That verification code has expired. Request a new one.";
  }
  if (text.includes("invalid token") || text.includes("otp_invalid")) {
    return "That code is incorrect. Check the email and try again.";
  }
  if (text.includes("signups not allowed")) {
    return "New administrator accounts are disabled for this project.";
  }
  if (
    text.includes("already registered") ||
    text.includes("already been registered")
  ) {
    return "That address already has an account. Sign in instead.";
  }
  if (text.includes("super administrator already exists")) {
    return "A super administrator already exists. Sign-up is permanently closed.";
  }
  if (text.includes("failed to send") || text.includes("error sending")) {
    return "We could not deliver the verification email. Try again in a moment.";
  }
  if (text.includes("both auth code and code verifier")) {
    return "That verification link is incomplete. Request a fresh code.";
  }

  return message;
}

function dbErrorMessage(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("schema cache") && (text.includes("content_type") || text.includes("video_url"))) {
    return "Video publishing is not enabled in the database yet. Apply supabase/migrations/20261006_youtube_media_fields.sql, then retry.";
  }
  if (text.includes("violates row-level security")) {
    return "You do not have permission to change this record.";
  }
  if (text.includes("duplicate key") && text.includes("slug")) {
    return "Another story already uses that URL slug. Adjust the headline slightly.";
  }
  if (text.includes("violates check constraint")) {
    return "One of the values is outside the allowed range for that field.";
  }
  if (text.includes("null value in column")) {
    return "A required field is missing. Review the highlighted inputs.";
  }
  return message;
}

/* ------------------------------------------------------------------ */

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }
  return supabase;
}

async function loadAdminProfile(userId: string): Promise<AdminProfile | null> {
  const client = requireClient();
  const { data, error } = await client
    .from("admin_profiles")
    .select("id, email, full_name, role, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: String(data.id),
    email: String(data.email ?? ""),
    fullName: data.full_name ? String(data.full_name) : null,
    role: data.role === "editor" ? "editor" : "admin",
    avatarUrl: data.avatar_url ? String(data.avatar_url) : null,
  };
}

export const supabaseBackend: Backend = {
  mode: "supabase",

  auth: {
    async getProfile() {
      const client = requireClient();
      const { data } = await client.auth.getSession();
      const user = data.session?.user;
      if (!user) return null;
      return loadAdminProfile(user.id);
    },

    /**
     * Step 1 of identity verification.
     *
     * The password is checked by Supabase Auth (bcrypt-hashed server side —
     * no credential ever touches this bundle). A session is briefly minted by
     * the provider, so we drop it immediately: dashboard access is only
     * granted after the emailed code is confirmed in step 3.
     */
    async signInWithPassword(email, password): Promise<BackendResult<null>> {
      const client = requireClient();
      const { error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) return fail(authErrorMessage(error.message));

      await client.auth.signOut();
      return ok(null);
    },

    /** Step 2 — email a time-limited one-time code / secure link. */
    async sendVerificationCode(
      email
    ): Promise<BackendResult<VerificationDispatch>> {
      const client = requireClient();
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Never create accounts from the admin console.
          shouldCreateUser: false,
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) return fail(authErrorMessage(error.message));

      return ok({ expiresInSeconds: VERIFICATION_CODE_TTL_SECONDS });
    },

    /** Step 3 — exchange the emailed code for a persisted session. */
    async verifyCode(email, code): Promise<BackendResult<AdminProfile>> {
      const client = requireClient();
      const { data, error } = await client.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });

      if (error) return fail(authErrorMessage(error.message));
      if (!data.user) return fail("Verification failed. Request a new code.");

      const profile = await loadAdminProfile(data.user.id);
      if (!profile) {
        // Authenticated, but not on the editorial team — revoke immediately.
        await client.auth.signOut();
        return fail(
          "This account is not registered as a NexTake administrator."
        );
      }
      return ok(profile);
    },

    /** Completes verification from the secure emailed link. */
    async verifyEmailLink(tokenHash) {
      const client = requireClient();
      const { data, error } = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type: "email",
      });

      if (error) return fail(authErrorMessage(error.message));
      if (!data.user) return fail("That verification link is no longer valid.");

      const profile = await loadAdminProfile(data.user.id);
      if (!profile) {
        await client.auth.signOut();
        return fail(
          "This account is not registered as a NexTake administrator."
        );
      }
      return ok(profile);
    },

    async signOut() {
      const client = requireClient();
      await client.auth.signOut();
    },

    /**
     * Asks the database — through the SECURITY DEFINER probe installed by the
     * super-admin migration — whether the seat is still unclaimed. Any error
     * (e.g. migration not applied yet) resolves to "unavailable": the safe
     * default, since claiming is impossible server-side anyway.
     */
    async superAdminAvailable(): Promise<BackendResult<boolean>> {
      const client = requireClient();
      const { data, error } = await client.rpc("nextake_super_admin_exists");

      if (error || typeof data !== "boolean") {
        return ok(false);
      }
      return ok(!data);
    },

    /**
     * One-time bootstrap of the super administrator.
     *
     * The auth account is created by Supabase Auth; the database trigger from
     * the super-admin migration attaches the `admin` profile to the new user
     * ONLY while no super administrator exists yet. A partial unique index
     * guarantees a second one can never be created, whatever the client does.
     *
     * Any session minted by the provider is dropped immediately: console
     * access still requires the normal two-step verification.
     */
    async signUpSuperAdmin(
      input: SuperAdminSignUpInput
    ): Promise<BackendResult<SuperAdminSignUpOutcome>> {
      const client = requireClient();

      const { data, error } = await client.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: {
            // Read by nextake_claim_super_admin_seat() in the migration.
            nextake_super_admin: "true",
            full_name: input.fullName.trim(),
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) return fail(authErrorMessage(error.message));
      if (!data.user) return fail("Sign-up failed. Try again in a moment.");

      if (data.session) {
        // Email confirmation is disabled on this project — the provider just
        // minted a session. Drop it: a console session only follows the
        // two-step verification, never a raw sign-up.
        await client.auth.signOut();
        return ok({ needsEmailConfirmation: false });
      }

      return ok({ needsEmailConfirmation: true });
    },

    onChange(listener) {
      const client = requireClient();
      const { data } = client.auth.onAuthStateChange(async (_event, session) => {
        if (!session?.user) {
          listener(null);
          return;
        }
        listener(await loadAdminProfile(session.user.id));
      });
      return () => data.subscription.unsubscribe();
    },
  },

  articles: {
    async list(): Promise<BackendResult<Article[]>> {
      const client = requireClient();
      const { data, error } = await client
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return fail(dbErrorMessage(error.message));
      return ok((data ?? []).map(mapArticleRow));
    },

    /** Same query shape the public blog uses. */
    async listPublished(): Promise<BackendResult<Article[]>> {
      const client = requireClient();
      const { data, error } = await client
        .from("articles")
        .select("*")
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) return fail(dbErrorMessage(error.message));
      return ok((data ?? []).map(mapArticleRow));
    },

    async create(input, actor): Promise<BackendResult<Article>> {
      const client = requireClient();
      const { data, error } = await client
        .from("articles")
        .insert(articleInputToRow(input, actor))
        .select()
        .single();

      if (error) return fail(dbErrorMessage(error.message));
      return ok(mapArticleRow(data as Record<string, unknown>));
    },

    async update(id, input, actor): Promise<BackendResult<Article>> {
      const client = requireClient();
      const { data, error } = await client
        .from("articles")
        .update(articleInputToRow(input, actor))
        .eq("id", id)
        .select()
        .single();

      if (error) return fail(dbErrorMessage(error.message));
      return ok(mapArticleRow(data as Record<string, unknown>));
    },

    async remove(id): Promise<BackendResult<null>> {
      const client = requireClient();
      const { error } = await client.from("articles").delete().eq("id", id);
      if (error) return fail(dbErrorMessage(error.message));
      return ok(null);
    },
  },

  companies: {
    async list(): Promise<BackendResult<Company[]>> {
      const client = requireClient();
      const { data, error } = await client
        .from("companies")
        .select("*")
        .order("name", { ascending: true });

      if (error) return fail(dbErrorMessage(error.message));
      return ok((data ?? []).map(mapCompanyRow));
    },
  },

  settings: {
    async get(): Promise<BackendResult<SiteSettings>> {
      const client = requireClient();
      const { data, error } = await client
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) return fail(dbErrorMessage(error.message));
      return ok(mapSettings((data as Record<string, unknown> | null) ?? null));
    },

    async update(settings): Promise<BackendResult<SiteSettings>> {
      const client = requireClient();
      const row = settingsToRow(settings);

      const existing = await client
        .from("site_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing.error) return fail(dbErrorMessage(existing.error.message));

      const query = existing.data?.id
        ? client
            .from("site_settings")
            .update(row)
            .eq("id", existing.data.id)
            .select()
            .single()
        : client.from("site_settings").insert(row).select().single();

      const { data, error } = await query;
      if (error) return fail(dbErrorMessage(error.message));
      return ok(mapSettings((data as Record<string, unknown> | null) ?? null));
    },
  },

  activity: {
    async list(): Promise<BackendResult<ActivityItem[]>> {
      const client = requireClient();
      const { data, error } = await client
        .from("admin_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);

      if (error) return fail(dbErrorMessage(error.message));

      const items = (data ?? []).map(
        (row: Record<string, unknown>): ActivityItem => ({
          id: String(row.id),
          action: String(row.action ?? ""),
          target: String(row.target ?? ""),
          timestamp: relativeTime(String(row.created_at ?? "")),
          user: String(row.actor_email ?? "system"),
          type:
            row.type === "publish" ||
            row.type === "edit" ||
            row.type === "subscriber" ||
            row.type === "system"
              ? row.type
              : "system",
        })
      );

      return ok(items);
    },
  },

  newsletter: {
    async subscribe(email, frequency) {
      const client = requireClient();
      const { error } = await client
        .from("newsletter_subscribers")
        .upsert(
          { email: email.trim().toLowerCase(), frequency },
          { onConflict: "email" }
        );

      if (error) return fail(dbErrorMessage(error.message));
      return ok(null);
    },

    async count() {
      const client = requireClient();
      const { count, error } = await client
        .from("newsletter_subscribers")
        .select("id", { count: "exact", head: true });

      if (error) return fail(dbErrorMessage(error.message));
      return ok(count ?? 0);
    },
  },

  storage: {
    async upload(file, folder) {
      const client = requireClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${folder}/${Date.now()}-${safeName}`;

      const { error } = await client.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { cacheControl: "31536000", upsert: false });

      if (error) return fail(dbErrorMessage(error.message));

      const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      return ok({ url: data.publicUrl });
    },
  },
};

export const DEFAULT_SITE_SETTINGS = DEFAULT_SETTINGS;
