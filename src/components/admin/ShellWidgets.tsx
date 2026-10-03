/**
 * Shell widgets: workspace data-health banner, notifications and the global
 * create menu. They sit in the admin header/sidebar — the public site chrome is
 * untouched.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Database,
  FileText,
  FlaskConical,
  Inbox,
  Mail,
  Megaphone,
  Plus,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useWorkspace } from "../../lib/workspace/context";
import { Badge, Button } from "../ui/primitives";
import type { AdminRoute } from "../../lib/navigation";

/* -------------------------------------------------------------------------- */
/*                            DATA HEALTH BANNER                              */
/* -------------------------------------------------------------------------- */

export function DataHealthBanner({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  const workspace = useWorkspace();
  const [dismissed, setDismissed] = useState(false);

  const fallbacks = workspace.health.filter((entry) => entry.mode === "local-fallback");

  if (dismissed) return null;
  if (!workspace.isSampleWorkspace && fallbacks.length === 0) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50/70 px-4 py-2.5 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 text-[11px] text-amber-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="leading-relaxed">
            {workspace.backendMode === "demo" ? (
              <>
                <strong>Local workspace.</strong> No database is configured for this
                environment, so records are stored in this browser. Workspace content is
                the shipped sample set — analytics labels it accordingly.
              </>
            ) : fallbacks.length > 0 ? (
              <>
                <strong>{fallbacks.length} collection(s) are not backed by the database yet.</strong>{" "}
                {fallbacks[0]?.message}
              </>
            ) : (
              <>
                <strong>Sample workspace data.</strong> Replace the shipped example records
                with real reporting before publishing derived figures.
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" icon={<Database className="h-3 w-3" />} onClick={onOpenSettings}>
            Data & settings
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="cursor-pointer rounded-lg px-2 py-1 font-semibold text-amber-900 hover:bg-amber-100"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              NOTIFICATIONS                                 */
/* -------------------------------------------------------------------------- */

interface Notification {
  id: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  route: AdminRoute;
  tone: "amber" | "mint" | "neutral" | "sky";
}

export function NotificationBell({
  onNavigate,
}: {
  onNavigate: (route: AdminRoute) => void;
}) {
  const workspace = useWorkspace();
  const [open, setOpen] = useState(false);

  const notifications = useMemo<Notification[]>(() => {
    const items: Notification[] = [];

    const inReview = workspace.articles.items.filter(
      (article) => article.reviewState === "in_review" && !article.archived
    );
    if (inReview.length > 0) {
      items.push({
        id: "review",
        icon: <Inbox className="h-3.5 w-3.5" />,
        title: `${inReview.length} stor${inReview.length === 1 ? "y" : "ies"} awaiting review`,
        detail: inReview
          .slice(0, 3)
          .map((article) => article.title)
          .join(" · "),
        route: { page: "blog", params: {} },
        tone: "amber",
      });
    }

    const scheduledToday = workspace.articles.items.filter((article) => {
      if (article.status !== "scheduled" || !article.publishedAt) return false;
      const when = new Date(article.publishedAt);
      const now = new Date();
      return (
        when.getFullYear() === now.getFullYear() &&
        when.getMonth() === now.getMonth() &&
        when.getDate() === now.getDate()
      );
    });
    if (scheduledToday.length > 0) {
      items.push({
        id: "scheduled",
        icon: <CalendarClock className="h-3.5 w-3.5" />,
        title: `${scheduledToday.length} scheduled for release today`,
        detail: scheduledToday.map((article) => article.title).join(" · "),
        route: { page: "blog", params: {} },
        tone: "sky",
      });
    }

    const pendingSuggestions = workspace.suggestions.items.filter(
      (suggestion) => suggestion.status === "pending"
    );
    if (pendingSuggestions.length > 0) {
      items.push({
        id: "suggestions",
        icon: <Zap className="h-3.5 w-3.5" />,
        title: `${pendingSuggestions.length} relationship suggestion${
          pendingSuggestions.length === 1 ? "" : "s"
        } to review`,
        detail: "Suggested links stay unpublished until an editor approves them.",
        route: { page: "entity-suggestions", params: {} },
        tone: "mint",
      });
    }

    const scheduledCampaigns = workspace.newsletter.items.filter(
      (campaign) => campaign.status === "scheduled"
    );
    if (scheduledCampaigns.length > 0) {
      items.push({
        id: "campaigns",
        icon: <Mail className="h-3.5 w-3.5" />,
        title: `${scheduledCampaigns.length} newsletter${
          scheduledCampaigns.length === 1 ? "" : "s"
        } scheduled`,
        detail: scheduledCampaigns.map((campaign) => campaign.subject).join(" · "),
        route: { page: "newsletter", params: {} },
        tone: "neutral",
      });
    }

    return items;
  }, [
    workspace.articles.items,
    workspace.newsletter.items,
    workspace.suggestions.items,
  ]);

  return (
    <div className="relative">
      <button
        id="admin-notifications-btn"
        aria-label="Admin notifications"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-[#0d263d] text-slate-300 transition-colors hover:bg-[#163857] hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {notifications.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7FFFD4] px-1 text-[9px] font-extrabold text-[#071A2B] ring-2 ring-[#071A2B]">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-[#071A2B]/15 bg-white p-2 shadow-2xl">
            <div className="flex items-center justify-between px-2.5 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Editorial notifications
              </span>
              <Badge tone="neutral">{notifications.length}</Badge>
            </div>

            {notifications.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-slate-500">
                Nothing needs your attention right now.
              </p>
            )}

            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => {
                  onNavigate(notification.route);
                  setOpen(false);
                }}
                className="flex w-full cursor-pointer items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-slate-50"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#071A2B] text-[#7FFFD4]">
                  {notification.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-[#071A2B]">
                    {notification.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                    {notification.detail || "Open the queue"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                CREATE MENU                                 */
/* -------------------------------------------------------------------------- */

export function CreateMenu({
  onNavigate,
  canCreateArticle,
  canCreateStartup,
  canCreateSource,
  canCreateCampaign,
}: {
  onNavigate: (route: AdminRoute) => void;
  canCreateArticle: boolean;
  canCreateStartup: boolean;
  canCreateSource: boolean;
  canCreateCampaign: boolean;
}) {
  const [open, setOpen] = useState(false);

  const options = [
    canCreateArticle && {
      id: "article",
      label: "Create article",
      icon: <FileText className="h-3.5 w-3.5" />,
      route: { page: "article-editor" as const, params: {} },
    },
    canCreateStartup && {
      id: "startup",
      label: "Add startup",
      icon: <FlaskConical className="h-3.5 w-3.5" />,
      route: { page: "startups" as const, params: {} },
    },
    canCreateSource && {
      id: "source",
      label: "Add source",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      route: { page: "sources" as const, params: {} },
    },
    canCreateCampaign && {
      id: "campaign",
      label: "New newsletter",
      icon: <Megaphone className="h-3.5 w-3.5" />,
      route: { page: "newsletter" as const, params: {} },
    },
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    route: AdminRoute;
  }>;

  if (options.length === 0) return null;

  return (
    <div className="relative">
      <button
        id="admin-create-menu-btn"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#7FFFD4] px-3 py-1.5 text-xs font-bold text-[#071A2B] shadow-sm transition-all hover:bg-[#68f0c5] active:scale-[0.98]"
      >
        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
        <span className="hidden sm:inline">Create</span>
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close create menu"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-[#071A2B]/15 bg-white p-1.5 shadow-2xl">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onNavigate(option.route);
                  setOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[#071A2B] transition-colors hover:bg-slate-50"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#071A2B] text-[#7FFFD4]">
                  {option.icon}
                </span>
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              WORKSPACE PILL                                */
/* -------------------------------------------------------------------------- */

export function WorkspaceModePill({ onRefresh }: { onRefresh: () => void }) {
  const workspace = useWorkspace();
  const isDemo = workspace.backendMode === "demo";

  return (
    <button
      onClick={onRefresh}
      title={
        isDemo
          ? "Local workspace — data lives in this browser"
          : "Connected to the NexTake database"
      }
      className="hidden items-center gap-1.5 rounded-full border border-[#7FFFD4]/30 bg-[#0d263d] px-2.5 py-1 font-mono text-[10px] font-semibold text-[#7FFFD4] lg:inline-flex"
    >
      {isDemo ? <RefreshCw className="h-3 w-3" /> : <Database className="h-3 w-3" />}
      {isDemo ? "Local workspace" : "Database"}
    </button>
  );
}

export function HeaderIconButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-[#0d263d] text-slate-300 transition-colors hover:bg-[#163857] hover:text-white"
    >
      {icon}
    </button>
  );
}
