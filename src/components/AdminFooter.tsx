import { Sparkles, ArrowUp, ShieldCheck, Terminal } from "lucide-react";
import type { NavPageId } from "../types";

interface AdminFooterProps {
  onNavigate: (page: NavPageId) => void;
}

export default function AdminFooter({ onNavigate }: AdminFooterProps) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer id="admin-footer" className="bg-[#071A2B] text-slate-300 border-t border-[#0f2c45] py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center pb-8 border-b border-[#0f2c45]">
          
          {/* Brand & Mission */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#0f2c45] border border-[#7FFFD4]/30 flex items-center justify-center text-[#7FFFD4]">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-white text-base tracking-tight">
                Next<span className="text-[#7FFFD4]">Edit</span>
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#7FFFD4]/15 text-[#7FFFD4] border border-[#7FFFD4]/30">
                v2.4-admin
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Centralized administrative workspace for content publishing, real-time website configuration, and traffic telemetry.
            </p>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex flex-wrap items-center justify-start md:justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-400">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-[#7FFFD4] transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <button
              onClick={() => onNavigate('website')}
              className="hover:text-[#7FFFD4] transition-colors cursor-pointer"
            >
              Website Editor
            </button>
            <button
              onClick={() => onNavigate('blog')}
              className="hover:text-[#7FFFD4] transition-colors cursor-pointer"
            >
              Articles
            </button>
            <span className="text-slate-600">•</span>
            <div className="inline-flex items-center gap-1.5 text-[#7FFFD4] font-mono text-[11px]">
              <Terminal className="w-3.5 h-3.5" />
              <span>NextEdit Engine v2.4</span>
            </div>
          </div>

          {/* Status & Back to Top */}
          <div className="flex items-center justify-start md:justify-end gap-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0d263d] border border-[#163857] text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#7FFFD4] animate-pulse" />
              <span>All Systems Operational</span>
            </div>

            <button
              id="admin-footer-scroll-top"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-[#0d263d] hover:bg-[#163857] transition-colors cursor-pointer"
              aria-label="Back to top"
            >
              <span>Top</span>
              <ArrowUp className="w-3.5 h-3.5 text-[#7FFFD4]" />
            </button>
          </div>

        </div>

        {/* Bottom copyright bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#7FFFD4]" />
            <span>Authenticated session: NexTake Admin</span>
          </div>
          <div>
            <span>© {new Date().getFullYear()} NextEdit Management Console. All rights reserved.</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
