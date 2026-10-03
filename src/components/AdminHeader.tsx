/**
 * Admin header — brand, global search, notifications, quick create and the
 * signed-in administrator's identity. The public site header is untouched.
 */

import { ExternalLink, Menu, Shield, X } from "lucide-react";
import type { AdminRoute } from "../lib/navigation";
import { can } from "../lib/permissions";
import { useAuth } from "../lib/auth/context";
import NexTakeLogo from "./NexTakeLogo";
import GlobalSearch from "./admin/GlobalSearch";
import { CreateMenu, NotificationBell, WorkspaceModePill } from "./admin/ShellWidgets";

interface AdminHeaderProps {
  onNavigate: (route: AdminRoute) => void;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onOpenLiveSite: () => void;
  breadcrumbs?: string[];
}

export default function AdminHeader({
  onNavigate,
  mobileMenuOpen,
  onToggleMobileMenu,
  onOpenLiveSite,
}: AdminHeaderProps) {
  const { profile } = useAuth();
  const roleLabel =
    profile?.role === "admin"
      ? "Super Administrator"
      : profile?.role === "editor"
      ? "Editor"
      : (profile?.role ?? "editor").replace(/_/g, " ");

  return (
    <header
      id="admin-header"
      className="sticky top-0 z-40 select-none border-b border-[#0f2c45] bg-[#071A2B] text-white transition-colors"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3 sm:h-18">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
            <button
              id="mobile-menu-toggle-btn"
              onClick={onToggleMobileMenu}
              className="shrink-0 cursor-pointer rounded-lg p-2 text-slate-300 hover:bg-white/5 hover:text-white focus:outline-none lg:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-[#7FFFD4]" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            <button
              onClick={() => onNavigate({ page: "home", params: {} })}
              className="group flex cursor-pointer items-center py-1"
            >
              <NexTakeLogo size="header" className="transition-transform group-hover:scale-[1.01]" />
            </button>

            <span className="hidden rounded border border-[#7FFFD4]/30 bg-[#0d263d] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#7FFFD4] xl:inline">
              Admin
            </span>
          </div>

          <GlobalSearch onNavigate={onNavigate} />

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <WorkspaceModePill onRefresh={onOpenLiveSite} />

            <button
              id="view-live-site-btn"
              onClick={onOpenLiveSite}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#7FFFD4] px-3 py-1.5 text-xs font-semibold text-[#071A2B] shadow-sm transition-all hover:bg-[#68f0c5] active:scale-[0.98]"
            >
              <span className="hidden sm:inline">View website</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>

            <NotificationBell onNavigate={onNavigate} />

            <CreateMenu
              onNavigate={onNavigate}
              canCreateArticle={can(profile, "articles.create")}
              canCreateStartup={can(profile, "startups.manage")}
              canCreateSource={can(profile, "sources.manage")}
              canCreateCampaign={can(profile, "newsletter.manage")}
            />

            <div className="flex items-center gap-2.5 border-l border-[#13334f] pl-2 sm:pl-3">
              <div className="relative">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName ?? profile.email}
                    className="h-8 w-8 rounded-lg object-cover ring-1 ring-[#7FFFD4]/40"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0d263d] text-xs font-bold text-[#7FFFD4] ring-1 ring-[#7FFFD4]/40">
                    {(profile?.fullName ?? profile?.email ?? "NA")
                      .split(/[\s@.]/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part: string) => part[0]?.toUpperCase())
                      .join("")}
                  </span>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#7FFFD4] ring-2 ring-[#071A2B]" />
              </div>
              <div className="hidden text-left xl:flex xl:flex-col">
                <span className="flex items-center gap-1 text-xs font-semibold leading-tight text-white">
                  {profile?.fullName ?? profile?.email?.split("@")[0] ?? "Admin"}
                  <Shield className="h-3 w-3 text-[#7FFFD4]" />
                </span>
                <span className="text-[10px] capitalize leading-tight text-slate-400">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
