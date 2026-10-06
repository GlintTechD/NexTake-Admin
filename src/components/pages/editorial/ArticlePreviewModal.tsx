import { CalendarClock, Eye, Link2, Tag, User } from "lucide-react";
import type { Article } from "../../../types";
import { renderMarkdown } from "../../../lib/markdown";
import { useWorkspace } from "../../../lib/workspace/context";
import { Badge, StatusBadge } from "../../ui/primitives";
import { Modal } from "../../ui/overlay";
import { DefinitionList } from "../../ui/layout";
import { editorialStateLabel } from "../../../lib/workspace/articleAdapter";
import { parseYouTubeUrl } from "../../../lib/publishing/youtube";

/**
 * Editor-facing preview of a story, using the same renderer the console uses
 * for body content. The full public site preview stays available through the
 * existing `LiveWebsiteModal`.
 */
export default function ArticlePreviewModal({
  article,
  isOpen,
  onClose,
}: {
  article: Article | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const workspace = useWorkspace();
  if (!article) return null;

  const startups = (article.relatedStartupIds ?? [])
    .map((id) => workspace.startups.byId(id)?.name)
    .filter(Boolean) as string[];
  const people = (article.relatedPersonIds ?? [])
    .map((id) => workspace.people.byId(id)?.name)
    .filter(Boolean) as string[];
  const sources = (article.sourceIds ?? [])
    .map((id) => workspace.sources.byId(id)?.publisher)
    .filter(Boolean) as string[];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Story preview"
      description="How this record renders once it is live on NexTake."
      size="lg"
    >
      <article className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={editorialStateLabel(article)} />
          <Badge tone="mint">{article.category}</Badge>
          <Badge tone="neutral">{article.type ?? "article"}</Badge>
          {article.contentType === "media" && <Badge tone="violet">video</Badge>}
          <span className="text-[11px] text-slate-500">{article.date}</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[#071A2B]">
            {article.title || "Untitled story"}
          </h1>
          <p className="text-sm leading-relaxed text-slate-600">{article.excerpt}</p>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3 w-3" /> {article.author}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3 w-3" /> {article.readTime}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-3 w-3" /> {article.views.toLocaleString()} views
            </span>
          </div>
        </div>

        {article.videoUrl && parseYouTubeUrl(article.videoUrl) ? (
          <div className="aspect-video overflow-hidden rounded-2xl border border-[#071A2B]/10 bg-black">
            <iframe
              title={`${article.title} video`}
              src={parseYouTubeUrl(article.videoUrl)?.embedUrl}
              className="h-full w-full border-0"
              allowFullScreen
            />
          </div>
        ) : article.image ? (
          <img
            src={article.image}
            alt={article.title}
            className="w-full rounded-2xl border border-[#071A2B]/10 object-cover"
          />
        ) : null}

        <div
          className="text-sm text-[#071A2B]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
        />

        <div className="rounded-2xl border border-[#071A2B]/12 bg-slate-50/60 p-4">
          <DefinitionList
            items={[
              { label: "Slug", value: article.seo?.slug || article.slug || "—" },
              {
                label: "Meta title",
                value: article.seo?.metaTitle || "Falls back to the headline",
              },
              {
                label: "Meta description",
                value: article.seo?.metaDescription || "Falls back to the excerpt",
              },
              { label: "Startups", value: startups.join(", ") || "None linked" },
              { label: "People", value: people.join(", ") || "None linked" },
              { label: "Sources", value: sources.join(", ") || "None linked" },
            ]}
          />
        </div>

        {(article.tags ?? []).length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-slate-400" />
            {(article.tags ?? []).map((tag) => (
              <Badge key={tag} tone="neutral">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Link2 className="h-3 w-3" />
          Internal links resolve against the public site paths; external links open in a new
          tab.
        </p>
      </article>
    </Modal>
  );
}
