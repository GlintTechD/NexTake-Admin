import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { backend } from "../../../lib/backend";
import { NIE_PASSWORD_ONLY_EMAIL } from "../../../lib/config";
import type { AdminProfile } from "../../../types";
import { Button, Notice, SectionCard } from "../../ui/primitives";
import { Field, TextInput } from "../../ui/form";

const NIE_ROLES: AdminProfile["role"][] = ["admin", "editor", "editor_in_chief", "managing_editor"];

/** True for roles the proxy treats as administrators (pause/resume, auto-publish, retract, audit log). */
export const isNieAdmin = (profile: AdminProfile) => profile.role === "admin" || profile.role === "editor_in_chief";

/**
 * The console itself has no sign-in screen, but the newsroom tools publish to the live site, so they require a
 * real Supabase session. By default this uses password plus emailed code; one configured email may use password only.
 */
export default function NieAuthGate({
  children,
}: {
  children: (profile: AdminProfile, signOut: () => Promise<void>) => ReactNode;
}) {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<"password" | "code">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    backend.auth
      .getProfile()
      .then((existing) => {
        if (!cancelled) setProfile(existing);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    const unsubscribe = backend.auth.onChange((next) => {
      if (!cancelled) setProfile(next);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (backend.mode !== "supabase") {
    return (
      <Notice tone="warning" title="Newsroom review needs the live backend">
        This console is running in demo mode. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use it.
      </Notice>
    );
  }

  if (checking) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking your session…
      </div>
    );
  }

  if (profile && !NIE_ROLES.includes(profile.role)) {
    return (
      <Notice tone="warning" title="Your role cannot review newsroom drafts">
        Ask an administrator to give you the editor role.
      </Notice>
    );
  }

  if (profile) {
    return <>{children(profile, () => backend.auth.signOut())}</>;
  }

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    if (NIE_PASSWORD_ONLY_EMAIL && email.trim().toLowerCase() === NIE_PASSWORD_ONLY_EMAIL) {
      const signedIn = await backend.auth.signInWithPasswordOnly(email, password);
      setBusy(false);
      if (signedIn.error || !signedIn.data) {
        setError(signedIn.error ?? "Sign-in failed.");
        return;
      }
      if (!NIE_ROLES.includes(signedIn.data.role)) {
        await backend.auth.signOut();
        setError("Your role cannot review newsroom drafts.");
        return;
      }
      setPassword("");
      setProfile(signedIn.data);
      return;
    }

    const signedIn = await backend.auth.signInWithPassword(email, password);
    if (signedIn.error) {
      setError(signedIn.error);
      setBusy(false);
      return;
    }
    const sent = await backend.auth.sendVerificationCode(email);
    setBusy(false);
    if (sent.error) return setError(sent.error);
    setPassword("");
    setStep("code");
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const verified = await backend.auth.verifyCode(email, code);
    setBusy(false);
    if (verified.error || !verified.data) return setError(verified.error ?? "Verification failed.");
    setProfile(verified.data);
  };

  return (
    <div className="mx-auto max-w-md py-10">
      <SectionCard
        title="Sign in to review newsroom drafts"
        description="These tools publish to the live site, so they need a verified editor account."
      >
        {step === "password" ? (
          <form onSubmit={submitPassword} className="space-y-4">
            <Field label="Email" htmlFor="nie-email">
              <TextInput id="nie-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" htmlFor="nie-password">
              <TextInput id="nie-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {error && <Notice tone="danger">{error}</Notice>}
            <Button type="submit" loading={busy} className="w-full">
              {NIE_PASSWORD_ONLY_EMAIL && email.trim().toLowerCase() === NIE_PASSWORD_ONLY_EMAIL
                ? "Sign in"
                : "Send me a code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="space-y-4">
            <p className="text-sm text-slate-600">We emailed a code to {email}. Enter it to finish signing in.</p>
            <Field label="Code" htmlFor="nie-code">
              <TextInput id="nie-code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
            {error && <Notice tone="danger">{error}</Notice>}
            <div className="flex gap-2">
              <Button type="submit" loading={busy} className="flex-1">Sign in</Button>
              <Button type="button" variant="outline" onClick={() => { setStep("password"); setCode(""); setError(null); }}>Back</Button>
            </div>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
