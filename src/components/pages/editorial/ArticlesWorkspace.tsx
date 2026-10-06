/**
 * Editorial content workspace (brief §8).
 *
 * One reusable management surface for Articles, Interviews and Shorts:
 * search, status/type/author/category/date filtering, sorting, pagination,
 * row actions and bulk actions. Destructive operations are permission-gated and
 * always confirmed.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  Copy,
  Eye,
  FileText,
  Filter,
  Plus,
  Send,
  Trash2,
  Upload,
  Pencil,
} from "lucide-react";
import type { Article } from "../../../types";
import { useWorkspace } from "../../../lib/workspace/context";
import { can } from "../../../lib/permissions";
import { useAuth } from "../../../lib/auth/context";
import { editorialStateLabel } from "../../../lib/workspace/articleAdapter";
import { isoToLocalDateTime, localDateTimeToIso } from "../../../lib/validation";
import {
  Badge,
  Button,
  EmptyState,
  Notice,
  OriginBadge,
  StatusBadge,
} from "../../ui/primitives";
import { DataTable, FilterSelect, IconAction, Pagination, RowActions, SearchInput, SegmentedControl } from "../../ui/data";
import { Modal, ConfirmDialog } from "../../ui/overlay";
import type { Column } from "../../ui/data";
import { Field, TextInput } from "../../ui/form";
import ArticlePreviewModal from "./ArticlePreviewModal";
import YouTubeVideoPublisher from "./YouTubeVideoPublisher";
import { sortPublishedMedia } from "../../../lib/publishing/youtube";

const PAGE_SIZE = 12;

type SortKey = "updated" | "created" | "title" | "views" | "status";

export default function ArticlesWorkspace({
  typeLock,
  onOpenEditor,
  onOpenBoard,
  onOpenLiveSite,
}: {
  /** Restrict the workspace to one content type (interviews / shorts). */
  typeLock?: "interview" | "short";
  onOpenEditor: (articleId?: string) => void;
  onOpenBoard?: () => void;
  onOpenLiveSite?: () => void;
}) {
  const workspace = useWorkspace();
  const { profile } = useAuth();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState(typeLock ?? "all");
  const [author, setAuthor] = useState("all");
  const [category, setCategory] = useState("all");
  const [dateWindow, setDateWindow] = useState("all");

  /**
   * "Now" is captured once per mount and refreshed on a timer, so filtering by
   * date stays pure during rendering while still rolling over during a session.
   */
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const [preview, setPreview] = useState<Article | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<Article | null>(null);
  const [scheduleValue, setScheduleValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [bulkAction, setBulkAction] = useState<null | "archive" | "delete" | "publish">(null);
  const [flash, setFlash] = useState<string | null>(null);

  const canPublish = can(profile, "articles.publish");
  const canSchedule = can(profile, "articles.schedule");
  const canDelete = can(profile, "articles.delete");
  const canArchive = can(profile, "articles.archive");
  const canCreate = can(profile, "articles.create");

  const authors = useMemo(() => {
    const set = new Set(workspace.articles.items.map((article) => article.author));
    return Array.from(set).sort();
  }, [workspace.articles.items]);

  const categories = useMemo(() => {
    const set = new Set(workspace.articles.items.map((article) => article.category));
    return Array.from(set).sort();
  }, [workspace.articles.items]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = clock;
    const windowMs =
      dateWindow === "7" ? 7 * 86_400_000 : dateWindow === "30" ? 30 * 86_400_000 : dateWindow === "90" ? 90 * 86_400_000 : null;

    const filtered = workspace.articles.items.filter((article) => {
      if (typeLock && (article.type ?? "article") !== typeLock) return false;
      if (type !== "all" && (article.type ?? "article") !== type) return false;
      if (status !== "all" && editorialStateLabel(article).toLowerCase() !== status) return false;
      if (author !== "all" && article.author !== author) return false;
      if (category !== "all" && article.category !== category) return false;

      if (windowMs) {
        const stamp = new Date(article.updatedAt ?? article.createdAt ?? article.date).getTime();
        if (!Number.isNaN(stamp) && now - stamp > windowMs) return false;
      }

      if (!query) return true;
      const haystack = [
        article.title,
        article.excerpt,
        article.author,
        article.category,
        (article.tags ?? []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    if (typeLock && (sortKey === "updated" || sortKey === "created")) {
      return sortPublishedMedia(filtered);
    }

    return filtered.sort((a, b) => {
      switch (sortKey) {
        case "title":
          return a.title.localeCompare(b.title);
        case "views":
          return (b.views ?? 0) - (a.views ?? 0);
        case "created":
          return (
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
          );
        case "status":
          return editorialStateLabel(a).localeCompare(editorialStateLabel(b));
        default:
          return (
            new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
            new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
          );
      }
    });
  }, [author, category, clock, dateWindow, search, sortKey, status, type, typeLock, workspace.articles.items]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = useMemo(() => {
    const scoped = typeLock
      ? workspace.articles.items.filter((article) => (article.type ?? "article") === typeLock)
      : workspace.articles.items;
    const byState = (label: string) =>
      scoped.filter((article) => editorialStateLabel(article).toLowerCase() === label).length;
    return {
      all: scoped.length,
      draft: byState("draft"),
      "in review": byState("in review"),
      approved: byState("approved"),
      scheduled: byState("scheduled"),
      published: byState("published"),
      archived: byState("archived"),
    };
  }, [typeLock, workspace.articles.items]);

  const notify = (message: string) => {
    setFlash(message);
    window.setTimeout(() => setFlash(null), 4000);
  };

  const toggleSelected = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );

  const runBulk = () => {
    if (!bulkAction) return;
    for (const id of selected) {
      if (bulkAction === "archive") workspace.articles.archive(id);
      if (bulkAction === "publish") workspace.articles.setStatus(id, "published");
    }
    if (bulkAction === "delete") {
      for (const id of selected) void workspace.articles.remove(id);
    }
    notify(
      `${selected.length} record${selected.length === 1 ? "" : "s"} ${
        bulkAction === "archive" ? "archived" : bulkAction === "publish" ? "published" : "deleted"
      }.`
    );
    setSelected([]);
    setBulkAction(null);
  };

  const columns: Column<Article>[] = [
    {
      key: "title",
      header: "Title",
      render: (article) => (
        <div className="flex items-start gap-3">
          {article.image && (
            <img
              src={article.image}
              alt=""
              className="h-10 w-14 shrink-0 rounded-lg border border-[#071A2B]/10 object-cover"
            />
          )}
          <div className="min-w-0">
            <button
              onClick={() => onOpenEditor(article.id)}
              className="block max-w-md cursor-pointer truncate text-left text-sm font-bold text-[#071A2B] hover:underline"
            >
              {article.title || "Untitled story"}
            </button>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge tone="neutral">{article.type ?? "article"}</Badge>
              <Badge tone="mint">{article.category}</Badge>
              <OriginBadge origin="live" />
              {article.archived && <Badge tone="violet">archived</Badge>}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (article) => (
        <div className="space-y-1">
          <StatusBadge status={editorialStateLabel(article)} />
          {article.status === "scheduled" && article.publishedAt && (
            <p className="text-[10px] text-slate-500">
              {new Date(article.publishedAt).toLocaleString()}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "author",
      header: "Author",
      hideOnMobile: true,
      render: (article) => (
        <span className="text-xs text-slate-600">{article.author || "—"}</span>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      hideOnMobile: true,
      render: (article) => (
        <span className="text-[11px] text-slate-500">
          {article.updatedAt
            ? new Date(article.updatedAt).toLocaleDateString()
            : article.date}
          {article.updatedBy ? (
            <span className="block text-[10px] text-slate-400">by {article.updatedBy}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (article) => (
        <RowActions>
          <IconAction
            label="Edit in the full editor"
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => onOpenEditor(article.id)}
          />
          <IconAction
            label="Preview"
            icon={<Eye className="h-4 w-4" />}
            onClick={() => setPreview(article)}
          />
          <IconAction
            label="Duplicate"
            icon={<Copy className="h-4 w-4" />}
            onClick={() => {
              const copy = workspace.articles.duplicate(article.id);
              if (copy) notify(`Duplicated as “${copy.title}”.`);
            }}
          />
          {canSchedule && (
            <IconAction
              label="Schedule"
              icon={<CalendarClock className="h-4 w-4" />}
              onClick={() => {
                setScheduleTarget(article);
                setScheduleValue(
                  isoToLocalDateTime(
                    article.publishedAt ?? new Date(Date.now() + 86_400_000).toISOString()
                  )
                );
              }}
            />
          )}
          {canPublish && article.status !== "published" && (
            <IconAction
              label="Publish now"
              tone="primary"
              icon={<Upload className="h-4 w-4" />}
              onClick={() => {
                workspace.articles.setStatus(article.id, "published", new Date().toISOString());
                notify(`“${article.title}” published.`);
              }}
            />
          )}
          {canPublish && article.status === "published" && (
            <IconAction
              label="Unpublish"
              icon={<Send className="h-4 w-4" />}
              onClick={() => {
                workspace.articles.setStatus(article.id, "unpublished" as Article["status"], null);
                notify(`“${article.title}” unpublished.`);
              }}
            />
          )}
          {canArchive && (
            <IconAction
              label={article.archived ? "Restore" : "Archive"}
              icon={
                article.archived ? (
                  <ArchiveRestore className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )
              }
              onClick={() => {
                if (article.archived) workspace.articles.restore(article.id);
                else workspace.articles.archive(article.id);
                notify(article.archived ? "Restored to draft." : "Archived.");
              }}
            />
          )}
          {canDelete && (
            <IconAction
              label="Delete"
              tone="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setDeleteTarget(article)}
            />
          )}
        </RowActions>
      ),
    },
  ];

  const heading = typeLock === "interview" ? "Interviews" : typeLock === "short" ? "Shorts" : "Articles";

  return (
    <div className="space-y-6">
      {flash && <Notice tone="success">{flash}</Notice>}

      {canCreate && typeLock && <YouTubeVideoPublisher placement={typeLock} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "draft", label: "Drafts", count: counts.draft },
            { value: "in review", label: "In review", count: counts["in review"] },
            { value: "approved", label: "Approved", count: counts.approved },
            { value: "scheduled", label: "Scheduled", count: counts.scheduled },
            { value: "published", label: "Published", count: counts.published },
            { value: "archived", label: "Archived", count: counts.archived },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          {onOpenBoard && !typeLock && (
            <Button variant="outline" size="sm" onClick={onOpenBoard}>
              Board view
            </Button>
          )}
          {onOpenLiveSite && (
            <Button variant="outline" size="sm" icon={<Eye className="h-3.5 w-3.5" />} onClick={onOpenLiveSite}>
              Site preview
            </Button>
          )}
          {canCreate && (
            <Button
              size="sm"
              icon={<Plus className="h-3.5 w-3.5 stroke-[2.5]" />}
              onClick={() => onOpenEditor()}
            >
              New {typeLock ?? "article"}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={`Search ${heading.toLowerCase()} by title, author or tag…`}
          className="lg:max-w-sm lg:flex-1"
        />

        <div className="flex flex-wrap items-center gap-3">
          <span className="hidden items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 xl:flex">
            <Filter className="h-3 w-3" /> Filters
          </span>
          {!typeLock && (
            <FilterSelect
              label="Type"
              value={type}
              onChange={(value) => {
                setType(value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All types" },
                { value: "article", label: "Articles" },
                { value: "interview", label: "Interviews" },
                { value: "short", label: "Shorts" },
              ]}
            />
          )}
          <FilterSelect
            label="Author"
            value={author}
            onChange={(value) => {
              setAuthor(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All authors" },
              ...authors.map((entry) => ({ value: entry, label: entry })),
            ]}
          />
          <FilterSelect
            label="Section"
            value={category}
            onChange={(value) => {
              setCategory(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All sections" },
              ...categories.map((entry) => ({ value: entry, label: entry })),
            ]}
          />
          <FilterSelect
            label="Updated"
            value={dateWindow}
            onChange={(value) => {
              setDateWindow(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "Any time" },
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
              { value: "90", label: "Last 90 days" },
            ]}
          />
          <FilterSelect
            label="Sort"
            value={sortKey}
            onChange={(value) => setSortKey(value as SortKey)}
            options={[
              { value: "updated", label: "Recently updated" },
              { value: "created", label: "Newest first" },
              { value: "title", label: "Title A–Z" },
              { value: "views", label: "Most read" },
              { value: "status", label: "Status" },
            ]}
          />
        </div>
      </div>

      {selected.length > 0 && (
        <Notice
          tone="info"
          title={`${selected.length} selected`}
          actions={
            <>
              {canArchive && (
                <Button size="sm" variant="outline" onClick={() => setBulkAction("archive")}>
                  Archive
                </Button>
              )}
              {canPublish && (
                <Button size="sm" variant="secondary" onClick={() => setBulkAction("publish")}>
                  Publish
                </Button>
              )}
              {canDelete && (
                <Button size="sm" variant="danger" onClick={() => setBulkAction("delete")}>
                  Delete
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                Clear
              </Button>
            </>
          }
        >
          Bulk actions apply to every selected record and are written to the activity log.
        </Notice>
      )}

      <DataTable
        rows={paged}
        columns={columns}
        selectedIds={selected}
        onToggleSelect={toggleSelected}
        onRowClick={(article) => setPreview(article)}
        renderCard={(article) => (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              {article.image && (
                <img
                  src={article.image}
                  alt=""
                  className="h-12 w-16 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#071A2B]">
                  {article.title || "Untitled story"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral">{article.type ?? "article"}</Badge>
                  <Badge tone="mint">{article.category}</Badge>
                  <StatusBadge status={editorialStateLabel(article)} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {article.author} ·{" "}
                {article.updatedAt
                  ? new Date(article.updatedAt).toLocaleDateString()
                  : article.date}
              </span>
              <div className="flex items-center gap-1">
                <IconAction
                  label="Edit"
                  icon={<Pencil className="h-4 w-4" />}
                  onClick={() => onOpenEditor(article.id)}
                />
                <IconAction
                  label="Preview"
                  icon={<Eye className="h-4 w-4" />}
                  onClick={() => setPreview(article)}
                />
                {canDelete && (
                  <IconAction
                    label="Delete"
                    tone="danger"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setDeleteTarget(article)}
                  />
                )}
              </div>
            </div>
          </div>
        )}
        emptyState={
          <EmptyState
            icon={<FileText className="h-9 w-9" />}
            title={`No ${heading.toLowerCase()} match these filters`}
            description="Adjust the search term or reset the filters to see the whole queue."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatus("all");
                  setType(typeLock ?? "all");
                  setAuthor("all");
                  setCategory("all");
                  setDateWindow("all");
                }}
              >
                Reset filters
              </Button>
            }
          />
        }
        footer={
          <Pagination
            page={page}
            pageCount={pageCount}
            total={rows.length}
            onPageChange={setPage}
          />
        }
      />

      <ArticlePreviewModal
        article={preview}
        isOpen={preview !== null}
        onClose={() => setPreview(null)}
      />

      <Modal
        isOpen={scheduleTarget !== null}
        onClose={() => setScheduleTarget(null)}
        title="Schedule release"
        description="Scheduled stories stay private until the release time passes."
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setScheduleTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!scheduleValue}
              onClick={() => {
                if (!scheduleTarget) return;
                const iso = localDateTimeToIso(scheduleValue);
                if (!iso) return;
                workspace.articles.setStatus(scheduleTarget.id, "scheduled", iso);
                notify(`“${scheduleTarget.title}” scheduled.`);
                setScheduleTarget(null);
              }}
            >
              Schedule
            </Button>
          </>
        }
      >
        <Field label="Release date & time" hint="NexTake publishes in the visitor's local time.">
          <TextInput
            type="datetime-local"
            value={scheduleValue}
            onChange={(event) => setScheduleValue(event.target.value)}
          />
        </Field>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete this story?"
        message={`“${deleteTarget?.title ?? ""}” will be removed from the workspace${
          workspace.backendMode === "supabase" ? " and the database" : ""
        }. This cannot be undone.`}
        confirmLabel="Delete story"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void workspace.articles.remove(deleteTarget.id);
            notify("Story deleted.");
          }
          setDeleteTarget(null);
        }}
      />

      <ConfirmDialog
        isOpen={bulkAction !== null}
        title={
          bulkAction === "delete"
            ? `Delete ${selected.length} stories?`
            : bulkAction === "archive"
            ? `Archive ${selected.length} stories?`
            : `Publish ${selected.length} stories?`
        }
        message={
          bulkAction === "delete"
            ? "Deleted stories are removed from the workspace and the public feed."
            : bulkAction === "archive"
            ? "Archived stories are removed from the public feed but stay recoverable."
            : "Published stories become visible on the public site immediately."
        }
        confirmLabel={bulkAction === "delete" ? "Delete" : bulkAction === "archive" ? "Archive" : "Publish"}
        tone={bulkAction === "delete" ? "danger" : "primary"}
        onCancel={() => setBulkAction(null)}
        onConfirm={runBulk}
      />
    </div>
  );
}
