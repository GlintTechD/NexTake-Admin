import { Bell, ExternalLink, Menu, X, Shield } from "lucide-react";
import type { NavPageId } from "../types";
import NexTakeLogo from "./NexTakeLogo";

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
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo - Implemented as Full Header Brand */}
          <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0 mr-4">
            <button
              id="mobile-menu-toggle-btn"
              onClick={onToggleMobileMenu}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 lg:hidden focus:outline-none cursor-pointer shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#7FFFD4]" /> : <Menu className="w-5 h-5" />}
            </button>

            <div 
              onClick={() => onNavigate('home')}
              className="flex items-center cursor-pointer group py-1"
            >
              <NexTakeLogo size="header" className="transition-transform group-hover:scale-[1.01]" />
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
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
                  <span className="text-xs font-semibold text-white leading-tight">Admin</span>
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
