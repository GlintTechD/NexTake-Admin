/**
 * Full-screen article editor (brief §9–§11).
 *
 * Extends the existing article system rather than replacing it: it writes the
 * same `Article` record (and the same Supabase columns / local store) that
 * `BlogManager` and `WebsiteManager` already use, and adds:
 *
 *   • rich text body with internal linking, media inserts and embeds
 *   • SEO panel (slug, meta title/description, OG image)
 *   • relationship panel (startups, people, sources, related stories, events)
 *   • content-intelligence suggestions that require explicit approval
 *   • the review workflow (draft → in review → approved → scheduled → published)
 */

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Eye,
  Image as ImageIcon,
  Link2,
  Save,
  Send,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import type { Article } from "../../../types";
import { useWorkspace } from "../../../lib/workspace/context";
import { useAuth } from "../../../lib/auth/context";
import { can } from "../../../lib/permissions";
import {
  editorialStateLabel,
  normalizeArticle,
  readingTimeLabel,
  slugifyTitle,
} from "../../../lib/workspace/articleAdapter";
import { isoToLocalDateTime, localDateTimeToIso } from "../../../lib/validation";
import RichTextEditor from "../../admin/RichTextEditor";
import EntityPicker from "../../admin/EntityPicker";
import SuggestionPanel from "../../admin/SuggestionPanel";
import ImageSourceField from "../../ImageSourceField";
import CategoryCombobox from "../../CategoryCombobox";
import {
  Badge,
  Button,
  Card,
  Notice,
  StatusBadge,
} from "../../ui/primitives";
import { Field, Select, TagInput, TextArea, TextInput } from "../../ui/form";
import { SplitLayout, Tabs } from "../../ui/layout";
import { ConfirmDialog } from "../../ui/overlay";
import ArticlePreviewModal from "./ArticlePreviewModal";

const DEFAULT_AVATAR = "https://i.pravatar.cc/64?img=60";

function blankArticle(author: string): Article {
  const generatedId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `art-${Date.now().toString(36)}`;

  return normalizeArticle({
    id: generatedId,
    title: "",
    excerpt: "",
    content: "",
    category: "Startups",
    type: "article",
    author,
    date: new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    status: "draft",
    views: 0,
    readTime: "4 min read",
    avatar: DEFAULT_AVATAR,
    image: "",
    tags: [],
  });
}

export default function ArticleEditorPage({
  articleId,
  onExit,
}: {
  articleId?: string;
  onExit: (savedId?: string) => void;
}) {
  const workspace = useWorkspace();
  const { profile } = useAuth();

  const existing = articleId ? workspace.articles.byId(articleId) : null;
  const [draft, setDraft] = useState<Article>(
    () => existing ?? blankArticle(profile?.email?.split("@")[0] ?? "NexTake Admin")
  );
  const [tab, setTab] = useState<"content" | "relationships" | "seo" | "workflow">("content");
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);


  const authors = useMemo(
    () =>
      Array.from(
        new Set([
          ...workspace.articles.items.map((article) => article.author),
          profile?.email ?? "",
        ].filter(Boolean))
      ).sort(),
    [profile?.email, workspace.articles.items]
  );

  const patch = (changes: Partial<Article>) =>
    setDraft((current) => ({ ...current, ...changes }));

  const isNew = !existing;

  const save = async (overrides?: Partial<Article>) => {
    setError(null);

    if (!draft.title.trim()) {
      setError("A headline is required before saving.");
      return;
    }

    setSaving(true);
    const authored = {
      ...draft,
      ...overrides,
      // canonicalise the section through the controlled taxonomy
      category: workspace.taxonomy.resolve("category", draft.category),
      tags: workspace.taxonomy.canonicalize("tag", draft.tags ?? []),
      readTime: readingTimeLabel(draft.content),
      seo: {
        ...draft.seo,
        slug: draft.seo?.slug?.trim() || slugifyTitle(draft.title),
      },
      updatedBy: profile?.email ?? "workspace",
    } as Article;

    const result = await workspace.articles.save(authored);
    setSaving(false);

    if (!result.ok) {
      setError(result.error ?? "The article could not be saved.");
      return;
    }

    setDraft(authored);
    setFlash(isNew ? "Draft created." : "Changes saved.");
    window.setTimeout(() => setFlash(null), 3500);
    onExit(authored.id);
  };

  const runDetection = () => {
    const fresh = workspace.suggestions.generate({
      type: "article",
      id: draft.id,
      label: draft.title || "Untitled story",
      text: `${draft.title} ${draft.excerpt} ${draft.content}`,
      linkedStartupIds: draft.relatedStartupIds ?? [],
      linkedPersonIds: draft.relatedPersonIds ?? [],
      linkedArticleIds: draft.relatedArticleIds ?? [],
      category: draft.category,
      tags: draft.tags ?? [],
    });
    setFlash(
      fresh.length > 0
        ? `${fresh.length} candidate link${fresh.length === 1 ? "" : "s"} awaiting approval.`
        : "No new candidates found in this copy."
    );
    window.setTimeout(() => setFlash(null), 4000);
  };

  const canPublish = can(profile, "articles.publish");
  const canSchedule = can(profile, "articles.schedule");
  const canDelete = can(profile, "articles.delete");
  const canReview = can(profile, "articles.review");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[#071A2B]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onExit(draft.id)}
            className="mt-0.5 cursor-pointer rounded-lg border border-[#071A2B]/15 p-2 text-[#071A2B] hover:bg-slate-50"
            aria-label="Back to articles"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-[#071A2B]">
                {isNew ? "Create article" : "Edit article"}
              </h1>
              <StatusBadge status={editorialStateLabel(draft)} />
              <Badge tone="neutral">{draft.type ?? "article"}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {draft.updatedAt
                ? `Last updated ${new Date(draft.updatedAt).toLocaleString()}`
                : "Unsaved draft — nothing is published until you approve it."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Eye className="h-3.5 w-3.5" />}
            onClick={() => setPreview(true)}
          >
            Preview
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Save className="h-3.5 w-3.5" />}
            loading={saving}
            onClick={() => void save()}
          >
            Save draft
          </Button>
          {canReview && draft.reviewState !== "in_review" && (
            <Button
              variant="outline"
              size="sm"
              icon={<Send className="h-3.5 w-3.5" />}
              onClick={() => {
                void save({ status: "draft", reviewState: "in_review" }).then(() =>
                  workspace.articles.submitForReview(draft.id)
                );
              }}
            >
              Submit for review
            </Button>
          )}
          {canReview && draft.reviewState === "in_review" && (
            <Button
              variant="outline"
              size="sm"
              icon={<BadgeCheck className="h-3.5 w-3.5" />}
              onClick={() => {
                workspace.articles.approve(draft.id);
                patch({ reviewState: "approved", approvedAt: new Date().toISOString() });
                setFlash("Approved — ready to publish or schedule.");
              }}
            >
              Approve
            </Button>
          )}
          {canSchedule && (
            <Button
              size="sm"
              variant="outline"
              icon={<CalendarClock className="h-3.5 w-3.5" />}
              onClick={() => setTab("workflow")}
            >
              Schedule
            </Button>
          )}
          {canPublish && (
            <Button
              size="sm"
              icon={<Upload className="h-3.5 w-3.5" />}
              onClick={() =>
                void save({ status: "published", publishedAt: new Date().toISOString() })
              }
            >
              Publish
            </Button>
          )}
          {canDelete && !isNew && (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {flash && <Notice tone="success">{flash}</Notice>}
      {error && <Notice tone="danger" title="Could not save">{error}</Notice>}

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "content", label: "Content" },
          {
            id: "relationships",
            label: "Relationships",
            count:
              (draft.relatedStartupIds?.length ?? 0) +
              (draft.relatedPersonIds?.length ?? 0) +
              (draft.relatedArticleIds?.length ?? 0) +
              (draft.sourceIds?.length ?? 0),
            hint: "Linked startups, people, sources and related stories",
          },
          { id: "seo", label: "SEO & discovery" },
          { id: "workflow", label: "Publishing workflow" },
        ]}
      />

      {tab === "content" && (
        <SplitLayout
          main={
            <>
              <Card className="space-y-4 p-5">
                <Field label="Headline" required>
                  <TextInput
                    value={draft.title}
                    placeholder="e.g. African fintech funding reset: what the $1.4bn H1 number means"
                    onChange={(event) => patch({ title: event.target.value })}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Type">
                    <Select
                      value={draft.type ?? "article"}
                      onChange={(event) =>
                        patch({ type: event.target.value as Article["type"] })
                      }
                    >
                      <option value="article">Article</option>
                      <option value="interview">Interview</option>
                      <option value="short">Short take</option>
                    </Select>
                  </Field>

                  <Field label="Section / category">
                    <CategoryCombobox
                      id="editor-category"
                      value={draft.category}
                      onChange={(category) => patch({ category })}
                      options={workspace.taxonomy.names("category")}
                      onCommitCustom={(category) => {
                        const canonical = workspace.taxonomy.resolve("category", category);
                        patch({ category: canonical });
                      }}
                      placeholder="Pick or type a controlled category"
                    />
                  </Field>

                  <Field label="Author">
                    <Select
                      value={draft.author}
                      onChange={(event) => patch({ author: event.target.value })}
                    >
                      {authors.map((author) => (
                        <option key={author} value={author}>
                          {author}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  {draft.type === "interview" && (
                    <Field
                      label="Interviewee"
                      hint="Interviews expose the person as a reusable NexTake entity."
                    >
                      <Select
                        value={draft.intervieweeId ?? ""}
                        onChange={(event) =>
                          patch({
                            intervieweeId: event.target.value || null,
                            relatedPersonIds: event.target.value
                              ? Array.from(
                                  new Set([...(draft.relatedPersonIds ?? []), event.target.value])
                                )
                              : draft.relatedPersonIds,
                          })
                        }
                      >
                        <option value="">Not linked</option>
                        {workspace.people.items.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name} — {person.organization}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                </div>

                <Field
                  label="Excerpt / summary"
                  hint="Used on cards, search results and as the fallback meta description."
                >
                  <TextArea
                    rows={3}
                    value={draft.excerpt}
                    onChange={(event) => patch({ excerpt: event.target.value })}
                  />
                </Field>
              </Card>

              <Card className="p-5">
                <RichTextEditor
                  value={draft.content}
                  onChange={(content) => patch({ content })}
                />
              </Card>

              <Card className="space-y-4 p-5">
                <h2 className="text-sm font-bold text-[#071A2B]">Tags</h2>
                <TagInput
                  values={draft.tags ?? []}
                  suggestions={workspace.taxonomy.names("tag")}
                  onChange={(tags) => patch({ tags })}
                  placeholder="e.g. fintech, venture capital, Kenya"
                />
                <p className="text-[11px] text-slate-400">
                  Tags are matched against the controlled vocabulary, so “FinTech”, “fintech”
                  and “FINTECH” resolve to one value.
                </p>
              </Card>
            </>
          }
          side={
            <>
              <Card className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[#071A2B]" />
                  <h2 className="text-sm font-bold text-[#071A2B]">Featured image</h2>
                </div>
                <ImageSourceField
                  key={draft.id}
                  id="article-featured-image"
                  label="Cover image"
                  value={draft.image}
                  onChange={(image) => patch({ image, coverImageUrl: image })}
                />
                <Field label="Image credit">
                  <TextInput
                    value={draft.imageCredit ?? ""}
                    onChange={(event) => patch({ imageCredit: event.target.value })}
                    placeholder="Photographer / agency"
                  />
                </Field>
              </Card>

              <Card className="space-y-4 p-5">
                <h2 className="text-sm font-bold text-[#071A2B]">Story stats</h2>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-[10px] font-bold uppercase text-slate-500">
                      Words
                    </span>
                    <span className="text-sm font-bold text-[#071A2B]">
                      {draft.content.split(/\s+/).filter(Boolean).length}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-[10px] font-bold uppercase text-slate-500">
                      Read time
                    </span>
                    <span className="text-sm font-bold text-[#071A2B]">
                      {readingTimeLabel(draft.content)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-[10px] font-bold uppercase text-slate-500">
                      Views
                    </span>
                    <span className="text-sm font-bold text-[#071A2B]">
                      {draft.views.toLocaleString()}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-[10px] font-bold uppercase text-slate-500">
                      Slug
                    </span>
                    <span className="block truncate text-[11px] font-semibold text-[#071A2B]">
                      {draft.seo?.slug || slugifyTitle(draft.title) || "—"}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-[#071A2B]">
                    <Sparkles className="h-4 w-4 text-[#7FFFD4]" />
                    Detected entities
                  </h2>
                  <Button size="sm" variant="outline" onClick={runDetection}>
                    Detect
                  </Button>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Run detection to see the entities the engine recognises in your copy. Links
                  are only created when you approve them.
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Link2 className="h-3.5 w-3.5" />}
                  onClick={() => setTab("relationships")}
                >
                  Open relationship panel
                </Button>
              </Card>
            </>
          }
        />
      )}

      {tab === "relationships" && (
        <SplitLayout
          main={
            <Card className="space-y-6 p-5">
              <EntityPicker
                label="Startups covered"
                types={["startup"]}
                selectedIds={draft.relatedStartupIds ?? []}
                onChange={(ids) => patch({ relatedStartupIds: ids })}
                hint="Linked startups appear on their dossier as coverage."
              />

              <EntityPicker
                label="People"
                types={["person"]}
                selectedIds={draft.relatedPersonIds ?? []}
                onChange={(ids) => patch({ relatedPersonIds: ids })}
              />

              <EntityPicker
                label="Related stories"
                types={["article"]}
                selectedIds={draft.relatedArticleIds ?? []}
                onChange={(ids) => patch({ relatedArticleIds: ids })}
              />

              <EntityPicker
                label="Sources"
                types={["source"]}
                selectedIds={draft.sourceIds ?? []}
                onChange={(ids) => patch({ sourceIds: ids })}
                hint="Sources are reusable across articles, dossiers and claims."
              />

              <EntityPicker
                label="Events"
                types={["event"]}
                selectedIds={draft.relatedEventIds ?? []}
                onChange={(ids) => patch({ relatedEventIds: ids })}
              />

              <EntityPicker
                label="Industries"
                types={["industry"]}
                selectedIds={draft.relatedIndustryIds ?? []}
                onChange={(ids) => patch({ relatedIndustryIds: ids })}
              />
            </Card>
          }
          side={
            <SuggestionPanel
              hostType="article"
              hostId={draft.id}
              hostLabel={draft.title || "Untitled story"}
              text={`${draft.title} ${draft.excerpt} ${draft.content}`}
              category={draft.category}
              tags={draft.tags ?? []}
              linkedStartupIds={draft.relatedStartupIds ?? []}
              linkedPersonIds={draft.relatedPersonIds ?? []}
              linkedArticleIds={draft.relatedArticleIds ?? []}
              onAccept={(suggestion) => {
                if (suggestion.targetType === "startup") {
                  patch({
                    relatedStartupIds: Array.from(
                      new Set([...(draft.relatedStartupIds ?? []), suggestion.targetId])
                    ),
                  });
                } else if (suggestion.targetType === "person") {
                  patch({
                    relatedPersonIds: Array.from(
                      new Set([...(draft.relatedPersonIds ?? []), suggestion.targetId])
                    ),
                  });
                } else if (suggestion.targetType === "article") {
                  patch({
                    relatedArticleIds: Array.from(
                      new Set([...(draft.relatedArticleIds ?? []), suggestion.targetId])
                    ),
                  });
                } else if (suggestion.targetType === "tag") {
                  patch({
                    tags: Array.from(new Set([...(draft.tags ?? []), suggestion.targetLabel])),
                  });
                }
                setFlash(
                  `Approved “${suggestion.targetLabel}”. Save the article to persist the link.`
                );
              }}
            />
          }
        />
      )}

      {tab === "seo" && (
        <SplitLayout
          main={
            <Card className="space-y-4 p-5">
              <Field
                label="URL slug"
                hint="Generated from the headline until you override it."
              >
                <TextInput
                  value={draft.seo?.slug ?? ""}
                  onChange={(event) =>
                    patch({ seo: { ...draft.seo, slug: slugifyTitle(event.target.value) } })
                  }
                  placeholder={slugifyTitle(draft.title)}
                />
              </Field>

              <Field
                label="Meta title"
                hint="Defaults to the headline when left empty."
              >
                <TextInput
                  value={draft.seo?.metaTitle ?? ""}
                  onChange={(event) =>
                    patch({ seo: { ...draft.seo, metaTitle: event.target.value } })
                  }
                />
              </Field>

              <Field
                label="Meta description"
                hint="Defaults to the excerpt when left empty."
              >
                <TextArea
                  rows={3}
                  value={draft.seo?.metaDescription ?? ""}
                  onChange={(event) =>
                    patch({ seo: { ...draft.seo, metaDescription: event.target.value } })
                  }
                />
              </Field>

              <Field label="Open Graph image URL">
                <TextInput
                  value={draft.seo?.ogImageUrl ?? ""}
                  onChange={(event) =>
                    patch({ seo: { ...draft.seo, ogImageUrl: event.target.value } })
                  }
                  placeholder="https://…"
                />
              </Field>

              <Notice tone="info" title="Search preview">
                <p className="text-[11px] text-slate-600">
                  <strong>{draft.seo?.metaTitle || draft.title || "Untitled story"}</strong>
                  <br />
                  <span className="text-emerald-700">
                    nextake.africa/articles/{draft.seo?.slug || slugifyTitle(draft.title) || "slug"}
                  </span>
                  <br />
                  {draft.seo?.metaDescription || draft.excerpt || "No description yet."}
                </p>
              </Notice>
            </Card>
          }
          side={
            <Card className="space-y-3 p-5">
              <h2 className="text-sm font-bold text-[#071A2B]">Canonical & syndication</h2>
              <Field label="Canonical URL">
                <TextInput
                  value={draft.canonicalUrl ?? ""}
                  onChange={(event) => patch({ canonicalUrl: event.target.value })}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Source URL">
                <TextInput
                  value={draft.sourceUrl ?? ""}
                  onChange={(event) => patch({ sourceUrl: event.target.value })}
                  placeholder="Where the story broke"
                />
              </Field>
              <Field label="Link behaviour">
                <Select
                  value={draft.linkBehavior ?? "reader"}
                  onChange={(event) =>
                    patch({ linkBehavior: event.target.value as Article["linkBehavior"] })
                  }
                >
                  <option value="reader">Open on NexTake</option>
                  <option value="external">Send readers to the source</option>
                </Select>
              </Field>
            </Card>
          }
        />
      )}

      {tab === "workflow" && (
        <SplitLayout
          main={
            <Card className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Publication status">
                  <Select
                    value={draft.status}
                    onChange={(event) =>
                      patch({
                        status: event.target.value as Article["status"],
                        publishedAt: localDateTimeToIso(
                          isoToLocalDateTime(draft.publishedAt ?? null)
                        ),
                      })
                    }
                  >
                    <option value="draft">Draft (private)</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                  </Select>
                </Field>

                <Field
                  label="Release date & time"
                  hint="Required for scheduled releases."
                >
                  <TextInput
                    type="datetime-local"
                    value={isoToLocalDateTime(draft.publishedAt ?? null)}
                    onChange={(event) =>
                      patch({ publishedAt: localDateTimeToIso(event.target.value) })
                    }
                  />
                </Field>
              </div>

              <div className="rounded-xl border border-[#071A2B]/12 bg-slate-50/70 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Editorial trail
                </h3>
                <ul className="mt-3 space-y-2 text-[11px] text-slate-600">
                  <li>
                    Review state: <strong>{draft.reviewState ?? "draft"}</strong>
                  </li>
                  <li>
                    Submitted for review:{" "}
                    {draft.submittedForReviewAt
                      ? new Date(draft.submittedForReviewAt).toLocaleString()
                      : "not yet"}
                  </li>
                  <li>
                    Approved:{" "}
                    {draft.approvedAt
                      ? new Date(draft.approvedAt).toLocaleString()
                      : "not yet"}
                  </li>
                  <li>Last edited by: {draft.updatedBy ?? "—"}</li>
                </ul>
              </div>

              <Notice tone="warning" title="Suggested information vs published information">
                Detected entities and candidate relationships never publish themselves. Approve
                them in the Relationships tab, then save — every decision is written to the
                activity log.
              </Notice>
            </Card>
          }
          side={
            <SuggestionPanel
              hostType="article"
              hostId={draft.id}
              hostLabel={draft.title || "Untitled story"}
              text={`${draft.title} ${draft.excerpt} ${draft.content}`}
              category={draft.category}
              tags={draft.tags ?? []}
              linkedStartupIds={draft.relatedStartupIds ?? []}
              linkedPersonIds={draft.relatedPersonIds ?? []}
              linkedArticleIds={draft.relatedArticleIds ?? []}
              onAccept={() => setFlash("Approved — save the article to persist the link.")}
            />
          }
        />
      )}

      <ArticlePreviewModal
        article={draft}
        isOpen={preview}
        onClose={() => setPreview(false)}
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete this story?"
        message={`“${draft.title || "Untitled story"}” will be removed from the workspace.`}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          void workspace.articles.remove(draft.id);
          setConfirmDelete(false);
          onExit();
        }}
      />
    </div>
  );
}
