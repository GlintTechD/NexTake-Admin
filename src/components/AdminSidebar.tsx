/**
 * Admin sidebar — the Operations Department information architecture.
 *
 * Groups: Overview / Editorial / Intelligence / Relationships / Publishing /
 * Insights / System. This is the *administrative* navigation only: the public
 * NexTake navigation is unchanged and still driven by site settings.
 */

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_GROUPS, type AdminRoute } from "../lib/navigation";
import { can } from "../lib/permissions";
import { useAuth } from "../lib/auth/context";
import { useWorkspace } from "../lib/workspace/context";
import { editorialStateLabel } from "../lib/workspace/articleAdapter";
import type { NavPageId } from "../types";

interface AdminSidebarProps {
  currentPage: NavPageId;
  onNavigate: (route: AdminRoute) => void;
  mobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
}

export default function AdminSidebar({
  currentPage,
  onNavigate,
  mobileMenuOpen,
  onCloseMobileMenu,
}: AdminSidebarProps) {
  const { profile } = useAuth();
  const workspace = useWorkspace();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const counts = useMemo(() => {
    const articles = workspace.articles.items;
    return {
      blog: articles.filter((article) => !article.archived).length,
      interviews: articles.filter(
        (article) => (article.type ?? "article") === "interview" && !article.archived
      ).length,
      shorts: articles.filter(
        (article) => (article.type ?? "article") === "short" && !article.archived
      ).length,
      sources: workspace.sources.items.length,
      startups: workspace.startups.items.length,
      people: workspace.people.items.length,
      media: workspace.media.items.length,
      newsletter: workspace.newsletter.items.length,
      entitySuggestions: workspace.suggestions.items.filter(
        (suggestion) => suggestion.status === "pending"
      ).length,
      activity: workspace.audit.items.length,
      users: workspace.users.items.length,
      review: articles.filter((article) => editorialStateLabel(article) === "In review").length,
      claims: workspace.claims.items.filter((claim) => !claim.verifiedAt).length,
    } as Record<string, number>;
  }, [workspace]);

  const handleItemClick = (page: NavPageId) => {
    onNavigate({ page, params: {} });
    onCloseMobileMenu();
  };

  return (
    <>
      {mobileMenuOpen && (
        <div
          id="mobile-sidebar-backdrop"
          onClick={onCloseMobileMenu}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      <aside
        id="admin-sidebar"
        className={`fixed bottom-0 left-0 top-16 z-35 flex w-64 flex-col justify-between border-r border-[#0f2c45] bg-[#071A2B] transition-transform duration-200 ease-in-out sm:top-18 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Management portal
            </span>
            <span className="rounded bg-[#0f2c45] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#7FFFD4]">
              v2.6
            </span>
          </div>

          {NAV_GROUPS.map((group) => {
            const items = group.items.filter(
              (item) => !item.permission || can(profile, item.permission)
            );
            if (items.length === 0) return null;

            const isCollapsed = collapsed[group.id] ?? false;
            const hasActive = items.some((item) => item.id === currentPage);

            return (
              <div key={group.id}>
                <button
                  onClick={() =>
                    setCollapsed((current) => ({ ...current, [group.id]: !isCollapsed }))
                  }
                  className="mb-1.5 flex w-full cursor-pointer items-center justify-between px-3 text-left"
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-[0.15em] ${
                      hasActive ? "text-[#7FFFD4]" : "text-slate-500"
                    }`}
                  >
                    {group.label}
                  </span>
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-slate-500" />
                  )}
                </button>

                {!isCollapsed && (
                  <nav aria-label={group.label} className="space-y-1">
                    {items.map((item) => {
                      const isActive = currentPage === item.id;
                      const Icon = item.icon;
                      const count = counts[item.id];
                      const badge =
                        item.id === "entity-suggestions" && counts.entitySuggestions > 0
                          ? counts.entitySuggestions
                          : item.id === "blog" && counts.review > 0
                          ? counts.review
                          : item.id === "claims" && counts.claims > 0
                          ? counts.claims
                          : typeof count === "number" && count > 0 && item.id !== "activity"
                          ? null
                          : null;

                      return (
                        <button
                          key={item.id}
                          id={`sidebar-nav-${item.id}`}
                          onClick={() => handleItemClick(item.id)}
                          title={item.description}
                          className={`group flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all ${
                            isActive
                              ? "bg-[#7FFFD4]/12 font-semibold text-[#7FFFD4] ring-1 ring-[#7FFFD4]/30"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                isActive
                                  ? "bg-[#7FFFD4] text-[#071A2B]"
                                  : "bg-[#0f2c45] text-slate-300 group-hover:bg-[#163857] group-hover:text-white"
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="truncate text-[13px] tracking-tight">
                              {item.label}
                            </span>
                          </span>

                          <span className="flex shrink-0 items-center gap-1.5">
                            {typeof badge === "number" && badge > 0 && (
                              <span className="rounded bg-[#7FFFD4] px-1.5 py-0.5 text-[9px] font-extrabold text-[#071A2B]">
                                {badge}
                              </span>
                            )}
                            {isActive && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#7FFFD4]" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-3 border-t border-[#0f2c45] p-4">
          <div className="rounded-xl border border-[#10314d] bg-[#092238] p-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold uppercase text-slate-400">Workspace</span>
              <span className="font-mono text-[10px] text-[#7FFFD4]">
                {workspace.backendMode === "supabase" ? "Database" : "Local"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
              <span>{workspace.articles.items.length} stories</span>
              <span>{workspace.startups.items.length} dossiers</span>
            </div>
          </div>

          <p className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
            {mobileMenuOpen ? (
              <PanelLeftClose className="h-3 w-3" />
            ) : (
              <PanelLeftOpen className="h-3 w-3" />
            )}
            Public site navigation is unchanged
          </p>
        </div>
      </aside>
    </>
  );
}
