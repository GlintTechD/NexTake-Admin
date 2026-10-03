/**
 * Homepage management (brief §15).
 *
 * Controls which stories occupy the homepage structures that already exist on
 * the public site — HERO (main + two secondary), TRENDING, EDITOR'S PICKS and
 * STARTUP SPOTLIGHT. The public homepage design is not touched: this only
 * decides what fills the slots, with manual ordering (drag and drop) and
 * automatic "latest" sorting where the section supports it.
 */

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  GripVertical,
  Info,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useWorkspace } from "../../../lib/workspace/context";
import { useAuth } from "../../../lib/auth/context";
import { can } from "../../../lib/permissions";
import type { Article } from "../../../types";
import { Badge, Button, Card, Notice, StatusBadge } from "../../ui/primitives";
import { PageHeader } from "../../ui/layout";
import { Field, Select } from "../../ui/form";

type SlotKey = "heroSecondaryIds" | "trendingIds" | "editorsPickIds";

const SLOT_META: Record<
  SlotKey,
  { title: string; description: string; limit: number; autoKey: "trending" | "editorsPicks" }
> = {
  heroSecondaryIds: {
    title: "Secondary hero stories",
    description: "The two supporting stories beside the main hero.",
    limit: 2,
    autoKey: "trending",
  },
  trendingIds: {
    title: "Trending",
    description: "The trending rail on the homepage feed.",
    limit: 6,
    autoKey: "trending",
  },
  editorsPickIds: {
    title: "Editor's picks",
    description: "Hand-picked stories from the editorial team.",
    limit: 6,
    autoKey: "editorsPicks",
  },
};

export default function HomepagePage({ onOpenLiveSite }: { onOpenLiveSite: () => void }) {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const canManage = can(profile, "homepage.manage");

  const [draft, setDraft] = useState(workspace.homepage.config);
  const [flash, setFlash] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragSlot, setDragSlot] = useState<SlotKey | null>(null);

  const published = useMemo(
    () =>
      workspace.articles.items
        .filter((article) => article.status === "published" && !article.archived)
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0)),
    [workspace.articles.items]
  );

  const byId = (id: string | null | undefined): Article | null =>
    id ? workspace.articles.byId(id) : null;

  const move = (slot: SlotKey, from: number, to: number) => {
    setDraft((current) => {
      const list = [...current[slot]];
      if (to < 0 || to >= list.length) return current;
      const [entry] = list.splice(from, 1);
      list.splice(to, 0, entry);
      return { ...current, [slot]: list };
    });
  };

  const onDrop = (slot: SlotKey, targetIndex: number) => {
    if (!dragId || dragSlot !== slot) return;
    setDraft((current) => {
      const list = [...current[slot]];
      const from = list.indexOf(dragId);
      if (from === -1) return current;
      list.splice(from, 1);
      list.splice(targetIndex, 0, dragId);
      return { ...current, [slot]: list };
    });
    setDragId(null);
    setDragSlot(null);
  };

  const save = () => {
    workspace.homepage.save(draft, "Homepage placement updated");
    setFlash("Homepage placement saved. The public homepage structure is unchanged.");
    window.setTimeout(() => setFlash(null), 4000);
  };

  const applyLatest = (slot: SlotKey) => {
    const latest = [...published]
      .sort((a, b) => {
        const left = new Date(a.publishedAt ?? a.createdAt ?? 0).getTime();
        const right = new Date(b.publishedAt ?? b.createdAt ?? 0).getTime();
        return right - left;
      })
      .slice(0, SLOT_META[slot].limit)
      .map((article) => article.id);
    setDraft((current) => ({ ...current, [slot]: latest }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homepage"
        description="Choose the stories that fill the existing homepage sections. Order manually or let a section sort by latest."
        badge={<Badge tone="mint">Placement only</Badge>}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              icon={<Eye className="h-3.5 w-3.5" />}
              onClick={onOpenLiveSite}
            >
              Preview public site
            </Button>
            {canManage && (
              <Button size="sm" icon={<Save className="h-3.5 w-3.5" />} onClick={save}>
                Save placement
              </Button>
            )}
          </>
        }
      />

      {flash && <Notice tone="success">{flash}</Notice>}

      <Notice tone="info" title="The public homepage design is not modified">
        NexTake's homepage layout, header, footer and typography stay exactly as they are. This
        screen only decides which stories appear inside those existing structures.
      </Notice>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#7FFFD4]" />
          <h2 className="text-sm font-bold text-[#071A2B]">Hero</h2>
        </div>

        <Field label="Main story">
          <Select
            value={draft.heroMainId ?? ""}
            onChange={(event) => setDraft({ ...draft, heroMainId: event.target.value || null })}
          >
            <option value="">No main story selected</option>
            {published.map((article) => (
              <option key={article.id} value={article.id}>
                {article.title} — {article.views.toLocaleString()} views
              </option>
            ))}
          </Select>
        </Field>

        {byId(draft.heroMainId) && (
          <div className="flex items-center gap-3 rounded-xl border border-[#7FFFD4]/50 bg-[#7FFFD4]/10 p-3">
            {byId(draft.heroMainId)!.image && (
              <img
                src={byId(draft.heroMainId)!.image}
                alt=""
                className="h-14 w-20 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#071A2B]">
                {byId(draft.heroMainId)!.title}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status="published" />
                <span className="text-[10px] text-slate-500">
                  {byId(draft.heroMainId)!.category}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-[#071A2B]/10 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Secondary stories
          </p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[0, 1].map((index) => (
              <Field key={index} label={`Secondary story ${index + 1}`}>
                <Select
                  value={draft.heroSecondaryIds[index] ?? ""}
                  onChange={(event) => {
                    const next = [...draft.heroSecondaryIds];
                    next[index] = event.target.value;
                    setDraft({
                      ...draft,
                      heroSecondaryIds: next.filter(Boolean).slice(0, 2),
                    });
                  }}
                >
                  <option value="">Empty slot</option>
                  {published.map((article) => (
                    <option key={article.id} value={article.id}>
                      {article.title}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>
        </div>
      </Card>

      {(["trendingIds", "editorsPickIds", "heroSecondaryIds"] as SlotKey[])
        .filter((slot) => slot !== "heroSecondaryIds")
        .map((slot) => {
          const meta = SLOT_META[slot];
          const autoValue = slot === "trendingIds" ? draft.autoSort.trending : draft.autoSort.editorsPicks;

          return (
            <Card key={slot} className="space-y-4 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#071A2B]">{meta.title}</h2>
                  <p className="text-[11px] text-slate-500">{meta.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    className="w-auto"
                    value={autoValue}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        autoSort: {
                          ...draft.autoSort,
                          [meta.autoKey]: event.target.value as "manual" | "latest",
                        },
                      })
                    }
                  >
                    <option value="manual">Manual order</option>
                    <option value="latest">Automatic — latest</option>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => applyLatest(slot)}>
                    Fill with latest
                  </Button>
                </div>
              </div>

              {autoValue === "latest" && (
                <Notice tone="info">
                  This section sorts by publication time. The list below shows the current order
                  preview; manual ordering resumes if you switch back.
                </Notice>
              )}

              <div className="space-y-2">
                {draft[slot].map((id, index) => {
                  const article = byId(id);
                  if (!article) return null;
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={() => {
                        setDragId(id);
                        setDragSlot(slot);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => onDrop(slot, index)}
                      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                        dragId === id
                          ? "border-[#7FFFD4] bg-[#7FFFD4]/10"
                          : "border-[#071A2B]/12 bg-white"
                      }`}
                    >
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-400" />
                      <span className="w-5 shrink-0 text-center font-mono text-[11px] text-slate-400">
                        {index + 1}
                      </span>
                      {article.image && (
                        <img
                          src={article.image}
                          alt=""
                          className="h-10 w-14 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#071A2B]">
                          {article.title}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {article.category} · {article.views.toLocaleString()} views ·{" "}
                          {article.publishedAt
                            ? new Date(article.publishedAt).toLocaleDateString()
                            : article.date}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => move(slot, index, index - 1)}
                          className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                          aria-label="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => move(slot, index, index + 1)}
                          className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDraft({
                              ...draft,
                              [slot]: draft[slot].filter((entry) => entry !== id),
                            })
                          }
                          className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Remove from section"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {draft[slot].length === 0 && (
                  <p className="rounded-xl border border-dashed border-[#071A2B]/20 px-4 py-6 text-center text-xs text-slate-500">
                    No stories in this section yet.
                  </p>
                )}
              </div>

              <Field label={`Add a story to ${meta.title.toLowerCase()}`}>
                <Select
                  value=""
                  onChange={(event) => {
                    if (!event.target.value) return;
                    setDraft({
                      ...draft,
                      [slot]: [...draft[slot], event.target.value].slice(0, meta.limit),
                    });
                  }}
                >
                  <option value="">Select a published story…</option>
                  {published
                    .filter((article) => !draft[slot].includes(article.id))
                    .map((article) => (
                      <option key={article.id} value={article.id}>
                        {article.title}
                      </option>
                    ))}
                </Select>
              </Field>
            </Card>
          );
        })}

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-bold text-[#071A2B]">Startup spotlight</h2>
          <p className="text-[11px] text-slate-500">
            The dossier featured in the homepage startup spotlight block.
          </p>
        </div>

        <Field label="Spotlight startup">
          <Select
            value={draft.startupSpotlightId ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, startupSpotlightId: event.target.value || null })
            }
          >
            <option value="">No startup selected</option>
            {workspace.startups.items.map((startup) => (
              <option key={startup.id} value={startup.id}>
                {startup.name} — {startup.industry}
              </option>
            ))}
          </Select>
        </Field>

        {draft.startupSpotlightId && workspace.startups.byId(draft.startupSpotlightId) && (
          <div className="flex items-center gap-3 rounded-xl border border-[#071A2B]/12 p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#071A2B] text-[#7FFFD4]">
              <Info className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#071A2B]">
                {workspace.startups.byId(draft.startupSpotlightId)!.name}
              </p>
              <p className="truncate text-[10px] text-slate-500">
                {workspace.startups.byId(draft.startupSpotlightId)!.description}
              </p>
            </div>
          </div>
        )}
      </Card>

      {canManage && (
        <div className="flex justify-end">
          <Button icon={<Save className="h-4 w-4" />} onClick={save}>
            Save homepage placement
          </Button>
        </div>
      )}
    </div>
  );
}
