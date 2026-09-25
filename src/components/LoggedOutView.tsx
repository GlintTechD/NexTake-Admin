import { Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import NexTakeLogo from "./NexTakeLogo";

interface LoggedOutViewProps {
  onLogin: () => void;
}

export default function LoggedOutView({ onLogin }: LoggedOutViewProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-[#071A2B]">
      
      {/* Header in Deep Navy */}
      <header className="bg-[#071A2B] text-white px-6 py-4 border-b border-[#0f2c45]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <NexTakeLogo size="sm" />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Admin Auth Portal
          </span>
        </div>
      </header>

      {/* Center Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#071A2B]/15 p-8 shadow-xl space-y-6">
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#071A2B] text-[#7FFFD4] mx-auto flex items-center justify-center shadow-md">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#071A2B] tracking-tight">
              NexTake Admin Login
            </h1>
            <p className="text-xs text-slate-500">
              Enter your credentials to access the administrative dashboard
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Administrator Email
              </label>
              <input
                type="email"
                readOnly
                value="admin@nexstake.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 bg-slate-50 text-sm font-semibold text-[#071A2B]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Access Token / Passkey
              </label>
              <input
                type="password"
                readOnly
                value="••••••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 bg-slate-50 text-sm font-mono text-slate-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Two-factor authentication verified</span>
            </div>

            <button
              onClick={onLogin}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#7FFFD4] text-[#071A2B] font-extrabold text-sm shadow-md shadow-[#7FFFD4]/25 hover:bg-[#68f0c5] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Sign In to NexTake Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Fork of <span className="font-semibold text-slate-600">Akon-007/TechPulse</span> • NexTake v2.4
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#071A2B] text-slate-400 text-xs py-4 px-6 text-center border-t border-[#0f2c45]">
        © {new Date().getFullYear()} NexTake Systems. All rights reserved.
      </footer>

    </div>
  );
}
