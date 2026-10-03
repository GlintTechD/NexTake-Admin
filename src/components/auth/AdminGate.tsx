/**
 * Administrative route protection (brief §24).
 *
 * Uses the authentication architecture that already ships with this project:
 * Supabase Auth performs the password check, then a time-limited one-time code
 * (or secure email link) must be confirmed before any console route renders.
 * No credential is ever hard-coded, and no privileged action runs in the client.
 *
 * When no Supabase project is configured the local demo backend is used: it
 * accepts any valid email + 8-character password and surfaces the verification
 * code in a clearly-labelled demo panel instead of sending mail. That path is
 * only reachable when the build has no database configured — a production
 * deployment always uses the real two-step flow.
 */

import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  Lock,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../lib/auth/context";
import { isSupabaseConfigured } from "../../lib/config";
import { roleName } from "../../lib/permissions";
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

  if (!profile) return <SignInScreen />;

  return <>{children}</>;
}

function SignInScreen() {
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
