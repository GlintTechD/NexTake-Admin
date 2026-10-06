import { ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/auth/context";
import NexTakeLogo from "./NexTakeLogo";

export default function AdminFooter() {
  const { profile } = useAuth();

  return (
    <footer id="admin-footer" className="bg-[#071A2B] text-slate-300 border-t border-[#0f2c45] py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="pb-8 border-b border-[#0f2c45]">
          
          {/* Brand & Mission */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <NexTakeLogo size="sm" />
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Centralized administrative workspace for content publishing, real-time website configuration, and traffic telemetry.
            </p>
          </div>

        </div>

        {/* Bottom copyright bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#7FFFD4]" />
            <span>
              Authenticated session:{" "}
              {profile ? `${profile.fullName ?? "Console user"} (${profile.email})` : "unknown"}
            </span>
          </div>
          <div>
            <span>© {new Date().getFullYear()} NexTake Management Console. All rights reserved.</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
