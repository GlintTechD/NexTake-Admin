import { Sparkles, Bell, ExternalLink, Menu, X, Shield } from "lucide-react";
import type { NavPageId } from "../types";

interface AdminHeaderProps {
  currentPage?: NavPageId;
  onNavigate: (page: NavPageId) => void;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onOpenLiveSite: () => void;
}

export default function AdminHeader({
  onNavigate,
  mobileMenuOpen,
  onToggleMobileMenu,
  onOpenLiveSite,
}: AdminHeaderProps) {
  return (
    <header 
      id="admin-header" 
      className="sticky top-0 z-40 bg-[#071A2B] border-b border-[#0f2c45] text-white select-none transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Brand Logo & Context */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              id="mobile-menu-toggle-btn"
              onClick={onToggleMobileMenu}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 lg:hidden focus:outline-none cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#7FFFD4]" /> : <Menu className="w-5 h-5" />}
            </button>

            <div 
              onClick={() => onNavigate('home')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#0f2c45] border border-[#7FFFD4]/30 flex items-center justify-center text-[#7FFFD4] shadow-sm shadow-[#7FFFD4]/10 group-hover:border-[#7FFFD4] transition-all">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg text-white tracking-tight">
                    Next<span className="text-[#7FFFD4]">Edit</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#7FFFD4]/15 text-[#7FFFD4] border border-[#7FFFD4]/30">
                    Admin
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">
                  Console & Content Hub
                </span>
              </div>
            </div>
          </div>

          {/* Center / Right Admin Controls */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Live Operational Status */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d263d] border border-[#163857] text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7FFFD4] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7FFFD4]"></span>
              </span>
              <span className="text-slate-300 text-xs font-medium">Production Live</span>
              <span className="text-[#7FFFD4] font-mono text-[11px]">v2.4</span>
            </div>

            {/* Quick action: View live website */}
            <button
              id="view-live-site-btn"
              onClick={onOpenLiveSite}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#071A2B] bg-[#7FFFD4] hover:bg-[#68f0c5] active:scale-[0.98] transition-all shadow-sm cursor-pointer"
            >
              <span>View Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {/* Notifications icon */}
            <div className="relative">
              <button
                id="admin-notifications-btn"
                aria-label="Admin Notifications"
                className="w-9 h-9 rounded-lg bg-[#0d263d] hover:bg-[#163857] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#7FFFD4] ring-2 ring-[#071A2B]" />
              </button>
            </div>

            {/* Admin User Profile Tag */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#13334f]">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"
                  alt="Admin User"
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-[#7FFFD4]/40"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#7FFFD4] ring-2 ring-[#071A2B]" />
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-white leading-tight">NexTake Admin</span>
                  <Shield className="w-3 h-3 text-[#7FFFD4]" />
                </div>
                <span className="text-[10px] text-slate-400 leading-tight">Super Administrator</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
