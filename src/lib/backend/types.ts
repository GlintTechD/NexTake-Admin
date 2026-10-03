import type {
  ActivityItem,
  AdminProfile,
  Article,
  ArticleInput,
  Company,
  SiteSettings,
} from "../../types";

export type BackendMode = "supabase" | "demo";

export interface BackendResult<T> {
  data: T | null;
  error: string | null;
}

export const ok = <T,>(data: T): BackendResult<T> => ({ data, error: null });
export const fail = <T,>(error: string): BackendResult<T> => ({
  data: null,
  error,
});

export type NewsletterFrequency = "daily" | "weekend" | "all";

export interface VerificationDispatch {
  expiresInSeconds: number;
  /** Only ever populated by the local demo backend (no real email is sent). */
  devCode?: string;
}

export interface SuperAdminSignUpInput {
  fullName: string;
  email: string;
  password: string;
}

export interface SuperAdminSignUpOutcome {
  /**
   * True when the auth provider requires an email confirmation before the
   * new super administrator can sign in (the usual production setting).
   */
  needsEmailConfirmation: boolean;
}

export interface Backend {
  mode: BackendMode;

  auth: {
    /** Restores a persisted session (page refresh) and returns the admin. */
    getProfile(): Promise<AdminProfile | null>;
    /** Step 1 — verifies credentials with the auth provider. No session yet. */
    signInWithPassword(
      email: string,
      password: string
    ): Promise<BackendResult<null>>;
    /** Step 2 — emails a time-limited code (or secure link) to the admin. */
    sendVerificationCode(
      email: string
    ): Promise<BackendResult<VerificationDispatch>>;
    /** Step 3 — exchanges the code for an authenticated session. */
    verifyCode(email: string, code: string): Promise<BackendResult<AdminProfile>>;
    /** Alternative to step 3 — completes a secure email-link verification. */
    verifyEmailLink(tokenHash: string): Promise<BackendResult<AdminProfile>>;
    signOut(): Promise<void>;
    /** Fires on sign-in, sign-out and session expiry. */
    onChange(listener: (profile: AdminProfile | null) => void): () => void;
    /**
     * Whether the single super-administrator seat can still be claimed.
     * Returns `false` (never throws) once a super administrator exists — the
     * database itself refuses a second one regardless of what the UI shows.
     */
    superAdminAvailable(): Promise<BackendResult<boolean>>;
    /**
     * One-time bootstrap: creates the super administrator account. Fails
     * after a super administrator exists — enforced by the database, not by
     * this client.
     */
    signUpSuperAdmin(
      input: SuperAdminSignUpInput
    ): Promise<BackendResult<SuperAdminSignUpOutcome>>;
  };

  articles: {
    list(): Promise<BackendResult<Article[]>>;
    /** Public feed: published + released, ordered for the blog. */
    listPublished(): Promise<BackendResult<Article[]>>;
    create(
      input: ArticleInput,
      actor: string
    ): Promise<BackendResult<Article>>;
    update(
      id: string,
      input: ArticleInput,
      actor: string
    ): Promise<BackendResult<Article>>;
    remove(id: string): Promise<BackendResult<null>>;
  };

  companies: {
    list(): Promise<BackendResult<Company[]>>;
  };

  settings: {
    get(): Promise<BackendResult<SiteSettings>>;
    update(settings: SiteSettings): Promise<BackendResult<SiteSettings>>;
  };

  activity: {
    list(): Promise<BackendResult<ActivityItem[]>>;
  };

  newsletter: {
    subscribe(email: string, frequency: NewsletterFrequency): Promise<BackendResult<null>>;
    count(): Promise<BackendResult<number>>;
  };

  storage: {
    upload(
      file: File,
      folder: "covers" | "logos"
    ): Promise<BackendResult<{ url: string }>>;
  };
}
