import { useEffect, useRef, useState } from "react";
import { ArrowRight, Lock, Sparkles } from "lucide-react";

type AuthStage = "username" | "otp";

interface AuthViewProps {
  onAuthenticated: () => void;
}

export default function AuthView({ onAuthenticated }: AuthViewProps) {
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<AuthStage>("username");
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("Enter your administrator username to begin.");
  const [isLoading, setIsLoading] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const request = async (path: string, body: Record<string, string>) => {
    const response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || "Authentication failed.") as Error & { retryAfter?: number };
      const retryAfter = Number(response.headers.get("Retry-After"));
      if (Number.isFinite(retryAfter) && retryAfter > 0) error.retryAfter = retryAfter;
      throw error;
    }
    return payload;
  };

  const handleUsername = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    try {
      await request("/api/auth/start", { username });
      setStage("otp");
      setOtp("");
      setCooldown(60);
      setMessage("A six-digit OTP was sent to the configured administrator email.");
    } catch (error) {
      const authError = error as Error & { retryAfter?: number };
      if (authError.retryAfter) setCooldown(authError.retryAfter);
      setMessage(authError.message || "Unable to start authentication right now. Please try again shortly.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await request("/api/auth/verify", { otp });
      setOtp("");
      onAuthenticated();
    } catch (error) {
      setOtp("");
      const nextMessage = error instanceof Error ? error.message : "Authentication failed.";
      if (nextMessage.includes("new OTP")) setStage("username");
      setMessage(nextMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    await handleUsername({ preventDefault: () => undefined } as React.FormEvent);
  };

  const updateOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextOtp = otp.split("");
    nextOtp[index] = digit;
    setOtp(nextOtp.join("").slice(0, 6));
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedOtp = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    setOtp(pastedOtp);
    otpRefs.current[Math.min(pastedOtp.length, 5)]?.focus();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-[#071A2B]">
      <header className="bg-[#071A2B] text-white px-6 py-4 border-b border-[#0f2c45]">
        <div className="max-w-7xl mx-auto flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0f2c45] border border-[#7FFFD4]/30 flex items-center justify-center text-[#7FFFD4]"><Sparkles className="w-4 h-4" /></div>
          <span className="font-extrabold text-lg tracking-tight">Next<span className="text-[#7FFFD4]">Edit</span> Admin</span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <section className="w-full max-w-md bg-white rounded-2xl border border-[#071A2B]/15 p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#071A2B] text-[#7FFFD4] mx-auto flex items-center justify-center shadow-md"><Lock className="w-5 h-5" /></div>
            <h1 className="text-2xl font-extrabold tracking-tight">Admin authentication</h1>
            <p className="text-xs text-slate-500">Verify your administrator identity to continue.</p>
          </div>
          {stage === "username" ? (
            <form onSubmit={handleUsername} className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Username
                <input autoFocus value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 bg-white text-sm" autoComplete="username" />
              </label>
              <button disabled={isLoading || username.length === 0} className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#7FFFD4] text-[#071A2B] font-extrabold text-sm disabled:opacity-60">
                {isLoading ? "Checking..." : "Continue"}<ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <fieldset>
                <legend className="block text-xs font-bold uppercase tracking-wider text-slate-600">Six-digit OTP</legend>
                <div className="mt-2 flex justify-center gap-2 sm:gap-3">
                  {Array.from({ length: 6 }, (_, index) => (
                    <input
                      key={index}
                      ref={(element) => { otpRefs.current[index] = element; }}
                      value={otp[index] ?? ""}
                      onChange={(event) => updateOtpDigit(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      onPaste={handleOtpPaste}
                      autoFocus={index === 0}
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      aria-label={`OTP digit ${index + 1}`}
                      className="h-14 w-10 sm:w-12 rounded-xl border border-[#071A2B]/20 bg-white text-center text-xl font-extrabold text-[#071A2B] outline-none transition focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/50"
                    />
                  ))}
                </div>
              </fieldset>
              <button disabled={isLoading || otp.length !== 6} className="w-full py-3 px-4 rounded-xl bg-[#7FFFD4] text-[#071A2B] font-extrabold text-sm disabled:opacity-60">{isLoading ? "Verifying..." : "Verify and unlock"}</button>
              <button type="button" onClick={resend} disabled={isLoading || cooldown > 0} className="w-full text-xs font-bold text-slate-600 disabled:opacity-50">{cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend OTP"}</button>
            </form>
          )}
          {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
        </section>
      </main>
      <footer className="bg-[#071A2B] text-slate-400 text-xs py-4 text-center">© {new Date().getFullYear()} NextEdit Systems.</footer>
    </div>
  );
}
