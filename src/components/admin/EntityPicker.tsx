/**
 * Reusable relationship picker.
 *
 * Used everywhere a record references another NexTake entity (article →
 * startups, sources, people; people → startups; events → startups; …). Keeps
 * the relationship model consistent instead of each screen inventing its own
 * multi-select.
 */

import { useMemo, useState } from "react";
import { Link2, Plus, Search, X } from "lucide-react";
import { buildEntityIndex, searchEntities, type EntityType } from "../../lib/workspace/relations";
import { useWorkspace } from "../../lib/workspace/context";
import { Badge } from "../ui/primitives";

export default function EntityPicker({
  label,
  types,
  selectedIds,
  onChange,
  hint,
  emptyMessage = "No matching NexTake records.",
  allowCreate,
  onCreate,
}: {
  label: string;
  types: EntityType[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  hint?: string;
  emptyMessage?: string;
  allowCreate?: boolean;
  onCreate?: (query: string) => void;
}) {
  const workspace = useWorkspace();
  const [query, setQuery] = useState("");

  const index = useMemo(
    () =>
      buildEntityIndex({
        articles: workspace.articles.items,
        startups: workspace.startups.items,
        people: workspace.people.items,
        companies: workspace.companies.items,
        industries: workspace.industries.items,
        sources: workspace.sources.items,
        events: workspace.events.items,
      }),
    [
      workspace.articles.items,
      workspace.companies.items,
      workspace.events.items,
      workspace.industries.items,
      workspace.people.items,
      workspace.sources.items,
      workspace.startups.items,
    ]
  );

  const selected = useMemo(
    () => selectedIds.map((id) => index.find((node) => node.id === id)).filter(Boolean),
    [index, selectedIds]
  );

  const results = useMemo(
    () =>
      searchEntities(index, query, { types, limit: 15 }).filter(
        (node) => !selectedIds.includes(node.id)
      ),
    [index, query, selectedIds, types]
  );

  const labelFor = (id: string) => {
    const node = index.find((entry) => entry.id === id);
    return node?.label ?? id;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
          {label}
        </span>
        <span className="text-[11px] text-slate-400">{selectedIds.length} linked</span>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((node) => (
            <span
              key={node!.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#7FFFD4]/50 bg-[#7FFFD4]/15 px-2.5 py-1 text-[11px] font-semibold text-[#071A2B]"
            >
              <Link2 className="h-3 w-3" />
              {node!.label}
              <button
                type="button"
                onClick={() => onChange(selectedIds.filter((id) => id !== node!.id))}
                className="cursor-pointer text-slate-500 hover:text-rose-600"
                aria-label={`Unlink ${node!.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${types.join(", ")}…`}
          className="w-full rounded-xl border border-[#071A2B]/20 py-2 pl-9 pr-3 text-xs text-[#071A2B] placeholder:text-slate-400 focus:border-[#071A2B] focus:outline-none"
        />
      </div>

      {(query.trim().length > 0 || results.length > 0) && (
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-[#071A2B]/10 bg-slate-50/60 p-2">
          {results.map((node) => (
            <button
              key={`${node.type}-${node.id}`}
              type="button"
              onClick={() => {
                onChange([...selectedIds, node.id]);
                setQuery("");
              }}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 text-left transition-colors hover:bg-[#7FFFD4]/15"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-[#071A2B]">
                  {node.label}
                </span>
                <span className="block truncate text-[10px] text-slate-500">
                  {node.subtitle}
                </span>
              </span>
              <Badge tone="neutral">{node.type}</Badge>
            </button>
          ))}

          {results.length === 0 && (
            <div className="space-y-2 px-2 py-3 text-center">
              <p className="text-[11px] text-slate-500">{emptyMessage}</p>
              {allowCreate && onCreate && query.trim() && (
                <button
                  type="button"
                  onClick={() => onCreate(query.trim())}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#071A2B] px-2.5 py-1.5 text-[11px] font-semibold text-[#7FFFD4]"
                >
                  <Plus className="h-3 w-3" /> Create “{query.trim()}”
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      {selectedIds.length > 0 && (
        <p className="text-[10px] text-slate-400">
          Linked: {selectedIds.map(labelFor).join(", ")}
        </p>
      )}
    </div>
  );
}
