/**
 * Relationship group (brief §5 / §25).
 *
 *   • Related stories   — story-to-story links, scored and editable
 *   • Startup coverage  — which stories cover which startup
 *   • Entity suggestions — the human approval queue for detected relationships
 */

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Inbox,
  Link2,
  ListChecks,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useWorkspace } from "../../../lib/workspace/context";
import { useAuth } from "../../../lib/auth/context";
import { can } from "../../../lib/permissions";
import {
  articlesForStartup,
  relatedStories,
  startupCoverage,
} from "../../../lib/workspace/relations";
import { Badge, Button, Card, EmptyState, Notice, StatusBadge } from "../../ui/primitives";
import { FilterSelect, SearchInput, SegmentedControl } from "../../ui/data";
import { PageHeader, SplitLayout } from "../../ui/layout";
import EntityPicker from "../../admin/EntityPicker";

/* -------------------------------------------------------------------------- */
/*                              RELATED STORIES                               */
/* -------------------------------------------------------------------------- */

export function RelatedStoriesPage({ openArticle }: { openArticle: (id: string) => void }) {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const canManage = can(profile, "relationships.view");

  const published = useMemo(
    () =>
      workspace.articles.items
        .filter((article) => !article.archived)
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0)),
    [workspace.articles.items]
  );

  const [articleId, setArticleId] = useState(published[0]?.id ?? "");
  const article = workspace.articles.byId(articleId) ?? published[0] ?? null;

  const suggestions = useMemo(
    () =>
      article
        ? relatedStories(article, workspace.articles.items, workspace.startups.items)
        : [],
    [article, workspace.articles.items, workspace.startups.items]
  );

  if (!article) {
    return (
      <EmptyState
        title="No stories to relate yet"
        description="Publish or draft a story first, then link related coverage here."
      />
    );
  }

  const linked = article.relatedArticleIds ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Related stories"
        description="Link story-to-story relationships. Scores come from shared tags, sections, startups and explicit links."
        badge={<Badge tone="mint">{linked.length} linked</Badge>}
      />

      <FilterSelect
        label="Story"
        value={articleId}
        onChange={setArticleId}
        options={published.slice(0, 60).map((entry) => ({
          value: entry.id,
          label: `${entry.title.slice(0, 70)} · ${entry.status}`,
        }))}
      />

      <SplitLayout
        main={
          <Card className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#071A2B]">{article.title}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={article.status} />
                  <Badge tone="mint">{article.category}</Badge>
                  <span className="text-[11px] text-slate-500">
                    {article.views.toLocaleString()} views
                  </span>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => openArticle(article.id)}>
                Open editor
              </Button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Linked stories
              </span>
              {linked.length === 0 && (
                <p className="rounded-xl border border-dashed border-[#071A2B]/20 px-4 py-5 text-center text-xs text-slate-500">
                  Nothing linked yet. Approve a candidate below or search for a story.
                </p>
              )}
              {linked.map((id) => {
                const entry = workspace.articles.byId(id);
                if (!entry) return null;
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#071A2B]/12 p-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#071A2B]">
                        {entry.title}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {entry.category} · {entry.status}
                      </span>
                    </span>
                    {canManage && (
                      <button
                        onClick={() =>
                          workspace.articles.save({
                            ...article,
                            relatedArticleIds: linked.filter((entryId) => entryId !== id),
                          })
                        }
                        className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Unlink story"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#071A2B]/10 pt-4">
              <EntityPicker
                label="Add a related story manually"
                types={["article"]}
                selectedIds={linked}
                onChange={(ids) =>
                  workspace.articles.save({ ...article, relatedArticleIds: ids })
                }
              />
            </div>
          </Card>
        }
        side={
          <Card className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#7FFFD4]" />
              <h2 className="text-sm font-bold text-[#071A2B]">Scored candidates</h2>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Candidates are ranked by relevance. Linking is always an editorial decision.
            </p>

            <div className="space-y-2">
              {suggestions
                .filter((entry) => !linked.includes(entry.article.id))
                .slice(0, 6)
                .map((entry) => (
                  <div
                    key={entry.article.id}
                    className="space-y-2 rounded-xl border border-[#071A2B]/12 p-3"
                  >
                    <p className="text-xs font-semibold text-[#071A2B]">{entry.article.title}</p>
                    <p className="text-[10px] text-slate-500">
                      score {entry.score.toFixed(1)} · {entry.reason}
                    </p>
                    {canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<Plus className="h-3 w-3" />}
                        onClick={() =>
                          workspace.articles.save({
                            ...article,
                            relatedArticleIds: [...linked, entry.article.id],
                          })
                        }
                      >
                        Link story
                      </Button>
                    )}
                  </div>
                ))}
              {suggestions.length === 0 && (
                <p className="text-[11px] text-slate-500">
                  No scored candidates for this story yet.
                </p>
              )}
            </div>
          </Card>
        }
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             STARTUP COVERAGE                               */
/* -------------------------------------------------------------------------- */

export function StartupCoveragePage({
  openArticle,
  openDossier,
}: {
  openArticle: (id: string) => void;
  openDossier: (id: string) => void;
}) {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const canManage = can(profile, "relationships.view");

  const [search, setSearch] = useState("");
  const [selectedStartupId, setSelectedStartupId] = useState(
    workspace.startups.items[0]?.id ?? ""
  );

  const coverage = useMemo(
    () => startupCoverage(workspace.startups.items, workspace.articles.items),
    [workspace.articles.items, workspace.startups.items]
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return coverage.filter((entry) => {
      const startup = workspace.startups.byId(entry.startupId);
      if (!startup) return false;
      if (!query) return true;
      return `${startup.name} ${startup.industry} ${startup.country}`.toLowerCase().includes(query);
    });
  }, [coverage, search, workspace.startups]);

  const selected = workspace.startups.byId(selectedStartupId) ?? workspace.startups.items[0] ?? null;
  const coveredStories = articlesForStartup(selected, workspace.articles.items);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Startup coverage"
        description="Every story that covers a startup, in one place — the relationship is stored on both records."
        badge={<Badge tone="mint">{coverage.filter((entry) => entry.count > 0).length} covered</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search startups…" />

          <Card className="divide-y divide-[#071A2B]/10 p-0">
            {rows.map((entry) => {
              const startup = workspace.startups.byId(entry.startupId);
              if (!startup) return null;
              const isActive = startup.id === selected?.id;
              return (
                <button
                  key={entry.startupId}
                  onClick={() => setSelectedStartupId(startup.id)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                    isActive ? "bg-[#7FFFD4]/10" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#071A2B]">
                      {startup.name}
                    </span>
                    <span className="block truncate text-[10px] text-slate-500">
                      {startup.industry} · {startup.country}
                    </span>
                  </span>
                  <Badge tone={entry.count > 0 ? "mint" : "neutral"}>{entry.count}</Badge>
                </button>
              );
            })}
            {rows.length === 0 && (
              <div className="p-4">
                <EmptyState title="No startups match this search" />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-7">
          {selected ? (
            <>
              <Card className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-[#071A2B]">{selected.name}</h2>
                    <p className="text-[11px] text-slate-500">
                      {coveredStories.length} stor{coveredStories.length === 1 ? "y" : "ies"} ·{" "}
                      {selected.industry} · {selected.sourceIds.length} sources
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openDossier(selected.id)}>
                    Open dossier
                  </Button>
                </div>

                <div className="space-y-2">
                  {coveredStories.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#071A2B]/12 p-3"
                    >
                      <button
                        onClick={() => openArticle(article.id)}
                        className="min-w-0 cursor-pointer text-left"
                      >
                        <span className="block truncate text-sm font-semibold text-[#071A2B] hover:underline">
                          {article.title}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {article.category} · {article.date} · {article.views.toLocaleString()} views
                        </span>
                      </button>
                      {canManage && (
                        <button
                          onClick={() =>
                            workspace.articles.save({
                              ...article,
                              relatedStartupIds: (article.relatedStartupIds ?? []).filter(
                                (id) => id !== selected.id
                              ),
                            })
                          }
                          className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Unlink coverage"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {coveredStories.length === 0 && (
                    <p className="rounded-xl border border-dashed border-[#071A2B]/20 px-4 py-6 text-center text-xs text-slate-500">
                      No coverage yet. Link a story below or from the article editor.
                    </p>
                  )}
                </div>
              </Card>

              <Card className="p-5">
                <EntityPicker
                  label="Link stories to this startup"
                  types={["article"]}
                  selectedIds={coveredStories.map((article) => article.id)}
                  onChange={(ids) => {
                    for (const id of ids) {
                      const article = workspace.articles.byId(id);
                      if (!article) continue;
                      workspace.articles.save({
                        ...article,
                        relatedStartupIds: Array.from(
                          new Set([...(article.relatedStartupIds ?? []), selected.id])
                        ),
                      });
                    }
                    for (const article of coveredStories) {
                      if (ids.includes(article.id)) continue;
                      workspace.articles.save({
                        ...article,
                        relatedStartupIds: (article.relatedStartupIds ?? []).filter(
                          (id) => id !== selected.id
                        ),
                      });
                    }
                  }}
                  hint="Coverage is written to the article record so both sides stay in sync."
                />
              </Card>
            </>
          ) : (
            <EmptyState title="Select a startup" description="Pick a company to see its coverage." />
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            ENTITY SUGGESTIONS                              */
/* -------------------------------------------------------------------------- */

export function EntitySuggestionsPage() {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const decide = can(profile, "suggestions.decide");

  const [status, setStatus] = useState<"pending" | "accepted" | "rejected" | "all">("pending");
  const [query, setQuery] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return workspace.suggestions.items
      .filter((suggestion) => (status === "all" ? true : suggestion.status === status))
      .filter((suggestion) =>
        term
          ? `${suggestion.hostLabel} ${suggestion.targetLabel} ${suggestion.reason} ${suggestion.detectedEntities.join(" ")}`
              .toLowerCase()
              .includes(term)
          : true
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [query, status, workspace.suggestions.items]);

  const counts = useMemo(
    () => ({
      pending: workspace.suggestions.items.filter((item) => item.status === "pending").length,
      accepted: workspace.suggestions.items.filter((item) => item.status === "accepted").length,
      rejected: workspace.suggestions.items.filter((item) => item.status === "rejected").length,
      all: workspace.suggestions.items.length,
    }),
    [workspace.suggestions.items]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entity suggestions"
        description="Candidate relationships detected by the content intelligence engine. Nothing is published until an editor approves it."
        badge={<Badge tone={counts.pending > 0 ? "amber" : "neutral"}>{counts.pending} pending</Badge>}
      />

      <Notice tone="warning" title="Approval is required">
        Suggestions never become published relationships automatically. Accepting a candidate
        writes the link to the record and to the activity log; rejecting it keeps the decision on
        file so the same candidate is not proposed again.
      </Notice>

      {flash && <Notice tone="success">{flash}</Notice>}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl
          value={status}
          onChange={setStatus}
          options={[
            { value: "pending", label: "Pending", count: counts.pending },
            { value: "accepted", label: "Accepted", count: counts.accepted },
            { value: "rejected", label: "Rejected", count: counts.rejected },
            { value: "all", label: "All", count: counts.all },
          ]}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by story, startup or detected entity…"
          className="lg:max-w-sm lg:flex-1"
        />
      </div>

      <div className="space-y-3">
        {rows.map((suggestion) => (
          <Card key={suggestion.id} className="space-y-3 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="navy">{suggestion.targetType}</Badge>
                  <span className="text-sm font-bold text-[#071A2B]">
                    {suggestion.targetLabel}
                  </span>
                  <StatusBadge status={suggestion.status} />
                  <span className="font-mono text-[10px] text-slate-400">
                    {Math.round(suggestion.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">{suggestion.reason}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                  <Link2 className="h-3 w-3" />
                  {suggestion.hostType}: {suggestion.hostLabel}
                </p>
              </div>

              {suggestion.status === "pending" && decide && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    icon={<BadgeCheck className="h-3.5 w-3.5" />}
                    onClick={() => {
                      workspace.suggestions.decide(suggestion.id, "accepted");
                      /* Apply the relationship to the host record immediately. */
                      if (suggestion.hostType === "article") {
                        const article = workspace.articles.byId(suggestion.hostId);
                        if (article) {
                          if (suggestion.targetType === "startup") {
                            workspace.articles.save({
                              ...article,
                              relatedStartupIds: Array.from(
                                new Set([...(article.relatedStartupIds ?? []), suggestion.targetId])
                              ),
                            });
                          } else if (suggestion.targetType === "person") {
                            workspace.articles.save({
                              ...article,
                              relatedPersonIds: Array.from(
                                new Set([...(article.relatedPersonIds ?? []), suggestion.targetId])
                              ),
                            });
                          } else if (suggestion.targetType === "article") {
                            workspace.articles.save({
                              ...article,
                              relatedArticleIds: Array.from(
                                new Set([...(article.relatedArticleIds ?? []), suggestion.targetId])
                              ),
                            });
                          } else if (suggestion.targetType === "tag") {
                            workspace.articles.save({
                              ...article,
                              tags: Array.from(new Set([...(article.tags ?? []), suggestion.targetLabel])),
                            });
                          }
                        }
                      } else {
                        const startup = workspace.startups.byId(suggestion.hostId);
                        if (startup && suggestion.targetType === "article") {
                          workspace.startups.update(startup.id, {
                            articleIds: Array.from(new Set([...startup.articleIds, suggestion.targetId])),
                          });
                          const article = workspace.articles.byId(suggestion.targetId);
                          if (article) {
                            workspace.articles.save({
                              ...article,
                              relatedStartupIds: Array.from(
                                new Set([...(article.relatedStartupIds ?? []), startup.id])
                              ),
                            });
                          }
                        }
                        if (startup && suggestion.targetType === "person") {
                          workspace.startups.update(startup.id, {
                            leadershipIds: Array.from(
                              new Set([...startup.leadershipIds, suggestion.targetId])
                            ),
                          });
                        }
                      }
                      setFlash(`Linked “${suggestion.targetLabel}”.`);
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<X className="h-3.5 w-3.5" />}
                    onClick={() => {
                      workspace.suggestions.decide(suggestion.id, "rejected");
                      setFlash("Suggestion rejected.");
                    }}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>

            {suggestion.detectedEntities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestion.detectedEntities.map((entity) => (
                  <Badge key={entity} tone="neutral">
                    {entity}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        ))}

        {rows.length === 0 && (
          <EmptyState
            icon={<Inbox className="h-9 w-9" />}
            title={status === "pending" ? "No suggestions waiting" : "Nothing in this view"}
            description="Run detection from the article editor or a startup dossier to generate candidates."
          />
        )}
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <ListChecks className="mt-0.5 h-4 w-4 text-[#7FFFD4]" />
          <div className="text-[11px] leading-relaxed text-slate-600">
            <p className="font-bold text-[#071A2B]">How detection works</p>
            <p>
              The engine matches names, industries, markets and tags inside your copy against the
              intelligence store, then scores each candidate. Scores are heuristics, not facts —
              treat them as prompts for a human decision, which is why approval is required.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
