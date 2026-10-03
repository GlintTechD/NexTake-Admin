/**
 * Administrative route protection (brief §24).
 *
 * Uses the authentication architecture that already ships with this project:
 * Supabase Auth performs the password check, then a time-limited one-time code
 * (or secure email link) must be confirmed before any console route renders.
 * No credential is ever hard-coded, and no privileged action runs in the client.
 *
 * Super administrator bootstrap: while (and only while) no super administrator
 * exists, the sign-in screen offers a one-time sign-up. The seat is claimed by
 * the database (trigger + partial unique index, see
 * supabase/migrations/20261004_super_admin_signup.sql), so once it is taken
 * the option disappears from the UI *and* every further attempt is refused
 * server-side — there is no client-side path to create another one.
 *
 * When no Supabase project is configured the local demo backend is used: it
 * accepts any valid email + 8-character password and surfaces the verification
 * code in a clearly-labelled demo panel instead of sending mail. That path is
 * only reachable when the build has no database configured — a production
 * deployment always uses the real two-step flow.
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  Lock,
  MailCheck,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import { useAuth } from "../../lib/auth/context";
import { backend } from "../../lib/backend";
import { isSupabaseConfigured } from "../../lib/config";
import { roleName } from "../../lib/permissions";
import { validateEmail, validatePassword } from "../../lib/validation";
import type { SuperAdminSignUpOutcome } from "../../lib/backend/types";
import NexTakeLogo from "../NexTakeLogo";
import { Button, Notice } from "../ui/primitives";
import { Field, TextInput } from "../ui/form";

export default function AdminGate({ children }: { children: ReactNode }) {
  const { status, profile } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071A2B] text-sm text-slate-300">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#7FFFD4]" />
          Verifying your NexTake session…
        </div>
      </div>
    );
  }

  if (!profile) return <AuthScreen />;

  return <>{children}</>;
}

/* -------------------------------------------------------------------------- */
/*                         Sign-in / sign-up switcher                         */
/* -------------------------------------------------------------------------- */

function AuthScreen() {
  const [screen, setScreen] = useState<"signin" | "signup">("signin");
  /**
   * `null` while the probe is in flight — the sign-up entry is hidden until
   * the database confirms the seat is still unclaimed.
   */
  const [signupAvailable, setSignupAvailable] = useState<boolean | null>(null);

  /** Reads the one-time-seat probe and stores the verdict. */
  const applyAvailability = useCallback(async () => {
    const result = await backend.auth.superAdminAvailable();
    setSignupAvailable(result.error ? false : result.data === true);
  }, []);

  /* Initial probe; the promise defers the state write past the first render. */
  useEffect(() => {
    let active = true;
    void backend.auth.superAdminAvailable().then((result) => {
      if (active) setSignupAvailable(result.error ? false : result.data === true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (screen === "signup") {
    return (
      <SignUpScreen
        onBack={() => {
          setScreen("signin");
          void applyAvailability();
        }}
      />
    );
  }

  return (
    <SignInScreen
      signupAvailable={signupAvailable}
      onOpenSignUp={() => setScreen("signup")}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Sign in                                   */
/* -------------------------------------------------------------------------- */

function SignInScreen({
  signupAvailable,
  onOpenSignUp,
}: {
  signupAvailable: boolean | null;
  onOpenSignUp: () => void;
}) {
  const {
    status,
    error,
    notice,
    verification,
    resendCooldown,
    signIn,
    verifyCode,
    resendCode,
    cancelVerification,
    clearMessages,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const awaitingCode =
    status === "awaiting_verification" || status === "verifying";

  const submitCredentials = async () => {
    setLocalError(null);
    clearMessages();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setLocalError("Enter a valid work email address.");
      return;
    }
    if (password.length < 8) {
      setLocalError("Passwords are at least 8 characters.");
      return;
    }

    await signIn(email.trim(), password);
  };

  /**
   * Demo-only shortcut. No credential is stored or hard-coded: a throwaway
   * address and password are generated in the browser, and the local demo
   * backend accepts them because no database is configured. Production builds
   * never render this button (`isSupabaseConfigured` gates it).
   */
  const enterDemoWorkspace = async () => {
    const handle = `demo-${Math.random().toString(36).slice(2, 7)}`;
    const email = `${handle}@nextake.demo`;
    const password = `demo-workspace-${Math.random().toString(36).slice(2, 10)}`;
    setEmail(email);
    setPassword(password);
    await signIn(email, password);
  };

  const submitCode = async () => {
    setLocalError(null);
    if (!/^\d{6}$/.test(code.replace(/\D/g, ""))) {
      setLocalError("The verification code is 6 digits.");
      return;
    }
    await verifyCode(code.replace(/\D/g, ""));
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 text-[#071A2B]">
      <header className="border-b border-[#0f2c45] bg-[#071A2B] px-6 py-4 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <NexTakeLogo size="sm" />
          <span className="font-mono text-xs text-slate-400">Admin authentication</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#071A2B]/15 bg-white p-8 shadow-xl">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#071A2B] text-[#7FFFD4] shadow-md">
              {awaitingCode ? <MailCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#071A2B]">
              {awaitingCode ? "Enter your verification code" : "NexTake Admin"}
            </h1>
            <p className="text-xs text-slate-500">
              {awaitingCode
                ? `We sent a 6-digit code to ${verification?.email ?? email}.`
                : isSupabaseConfigured
                ? "Sign in with your NexTake administrator account."
                : "No database is configured for this build, so the local demo workspace is used."}
            </p>
          </div>

          {!isSupabaseConfigured && (
            <Notice tone="warning" title="Demo workspace">
              Credentials are verified locally: use any valid email and an 8+ character
              password. The verification code appears on screen instead of being emailed.
              {!awaitingCode && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    loading={status === "authenticating"}
                    icon={<FlaskConical className="h-3.5 w-3.5" />}
                    onClick={() => void enterDemoWorkspace()}
                  >
                    Use a demo identity
                  </Button>
                </div>
              )}
            </Notice>
          )}

          {error && <Notice tone="danger">{error}</Notice>}
          {localError && <Notice tone="danger">{localError}</Notice>}
          {notice && <Notice tone="success">{notice}</Notice>}
          {verification?.devCode && (
            <Notice tone="info" title="Demo verification code">
              <p className="flex items-center gap-2 font-mono text-lg font-bold tracking-[0.3em] text-[#071A2B]">
                <FlaskConical className="h-4 w-4 text-[#7FFFD4]" />
                {verification.devCode}
              </p>
            </Notice>
          )}

          {!awaitingCode ? (
            <div className="space-y-4">
              <Field label="Administrator email" htmlFor="admin-email">
                <TextInput
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@nextake.africa"
                />
              </Field>

              <Field label="Password" htmlFor="admin-password">
                <TextInput
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void submitCredentials();
                  }}
                  placeholder="••••••••"
                />
              </Field>

              <Button
                className="w-full"
                loading={status === "authenticating"}
                icon={<ArrowRight className="h-4 w-4" />}
                onClick={() => void submitCredentials()}
              >
                Continue
              </Button>

              {/*
               * The super administrator seat is one-time. The entry below is
               * rendered only after the database confirms the seat is still
               * unclaimed; once taken it disappears for good.
               */}
              {signupAvailable === true && (
                <div className="border-t border-slate-100 pt-4 text-center">
                  <p className="pb-2 text-[11px] text-slate-500">
                    First console on this project?
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    icon={<UserRoundPlus className="h-3.5 w-3.5" />}
                    onClick={onOpenSignUp}
                  >
                    Create the super administrator
                  </Button>
                </div>
              )}

              <p className="flex items-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Passwords are verified by the auth provider — never in this app.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="6-digit code" htmlFor="admin-code">
                <TextInput
                  id="admin-code"
                  inputMode="numeric"
                  value={code}
                  maxLength={6}
                  onChange={(event) => setCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void submitCode();
                  }}
                  placeholder="000000"
                  className="text-center font-mono text-lg tracking-[0.4em]"
                />
              </Field>

              <Button
                className="w-full"
                loading={status === "verifying"}
                icon={<CheckCircle2 className="h-4 w-4" />}
                onClick={() => void submitCode()}
              >
                Verify & open console
              </Button>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <button
                  onClick={() => void resendCode()}
                  disabled={resendCooldown > 0}
                  className="cursor-pointer font-semibold text-[#071A2B] underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
                <button
                  onClick={cancelVerification}
                  className="cursor-pointer font-semibold text-[#071A2B] underline"
                >
                  Use a different account
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-[#0f2c45] bg-[#071A2B] px-6 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} NexTake Systems · {roleName("admin")} console
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                    One-time super administrator sign-up                    */
/* -------------------------------------------------------------------------- */

function SignUpScreen({ onBack }: { onBack: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<SuperAdminSignUpOutcome | null>(null);

  const submit = async () => {
    setLocalError(null);

    if (fullName.trim().length < 2) {
      setLocalError("Enter the administrator's full name.");
      return;
    }
    const emailError = validateEmail(email);
    if (emailError) {
      setLocalError(emailError);
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setLocalError(passwordError);
      return;
    }
    if (password !== confirm) {
      setLocalError("The two passwords do not match.");
      return;
    }

    setSubmitting(true);
    const result = await backend.auth.signUpSuperAdmin({
      fullName,
      email,
      password,
    });
    setSubmitting(false);

    if (result.error || !result.data) {
      setLocalError(result.error ?? "Sign-up failed. Try again in a moment.");
      return;
    }

    setCreated(result.data);
  };

  if (created) {
    return (
      <div className="flex min-h-screen flex-col justify-between bg-slate-50 text-[#071A2B]">
        <header className="border-b border-[#0f2c45] bg-[#071A2B] px-6 py-4 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <NexTakeLogo size="sm" />
            <span className="font-mono text-xs text-slate-400">Admin authentication</span>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#071A2B]/15 bg-white p-8 shadow-xl">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-md">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#071A2B]">
                Super administrator created
              </h1>
              <p className="text-xs text-slate-500">
                {created.needsEmailConfirmation
                  ? `We sent a confirmation email to ${email.trim()}. Confirm it, then sign in here with your new credentials.`
                  : `You can now sign in with ${email.trim()} and the password you just set.`}
              </p>
            </div>

            <Notice tone="info" title="Sign-up is now closed">
              The single super administrator seat has been claimed. From this point on,
              additional team members are invited from inside the console — this page
              will never create another super administrator.
            </Notice>

            <Button
              className="w-full"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={onBack}
            >
              Return to sign in
            </Button>
          </div>
        </main>

        <footer className="border-t border-[#0f2c45] bg-[#071A2B] px-6 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} NexTake Systems · {roleName("admin")} console
        </footer>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 text-[#071A2B]">
      <header className="border-b border-[#0f2c45] bg-[#071A2B] px-6 py-4 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <NexTakeLogo size="sm" />
          <span className="font-mono text-xs text-slate-400">Admin authentication</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#071A2B]/15 bg-white p-8 shadow-xl">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#071A2B] text-[#7FFFD4] shadow-md">
              <UserRoundPlus className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#071A2B]">
              Create the super administrator
            </h1>
            <p className="text-xs text-slate-500">
              {isSupabaseConfigured
                ? "This one-time step sets up the single account that owns the console."
                : "Demo workspace: the super administrator is recorded locally in this browser."}
            </p>
          </div>

          <Notice tone="warning" title="One-time operation">
            There can only ever be one super administrator. Once this account exists,
            sign-up closes permanently and every later attempt is refused by the
            database. Further team members are invited from the console afterwards.
          </Notice>

          {localError && <Notice tone="danger">{localError}</Notice>}

          <div className="space-y-4">
            <Field label="Full name" htmlFor="signup-name">
              <TextInput
                id="signup-name"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ada Obi"
              />
            </Field>

            <Field label="Work email" htmlFor="signup-email">
              <TextInput
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@nextake.africa"
              />
            </Field>

            <Field label="Password" htmlFor="signup-password">
              <TextInput
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
              />
            </Field>

            <Field label="Confirm password" htmlFor="signup-confirm">
              <TextInput
                id="signup-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submit();
                }}
                placeholder="Repeat the password"
              />
            </Field>

            <Button
              className="w-full"
              loading={submitting}
              icon={<ShieldCheck className="h-4 w-4" />}
              onClick={() => void submit()}
            >
              Create super administrator
            </Button>

            <button
              onClick={onBack}
              className="mx-auto flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-slate-500 underline hover:text-[#071A2B]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#0f2c45] bg-[#071A2B] px-6 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} NexTake Systems · {roleName("admin")} console
      </footer>
    </div>
  );
}
