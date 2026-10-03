/**
 * Console-wide search (part of the management shell, brief §5).
 *
 * Searches every workspace entity — articles, startups, people, companies,
 * industries, sources, events — and deep-links straight to the record.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, FileText, Search } from "lucide-react";
import { useWorkspace } from "../../lib/workspace/context";
import {
  buildEntityIndex,
  searchEntities,
  type EntityNode,
} from "../../lib/workspace/relations";
import { Badge } from "../ui/primitives";
import type { AdminRoute } from "../../lib/navigation";

export default function GlobalSearch({
  onNavigate,
}: {
  onNavigate: (route: AdminRoute) => void;
}) {
  const workspace = useWorkspace();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const results = useMemo(
    () => (query.trim() ? searchEntities(index, query, { limit: 12 }) : []),
    [index, query]
  );

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const openNode = (node: EntityNode) => {
    switch (node.type) {
      case "article":
        onNavigate({ page: "article-editor", params: { articleId: node.id } });
        break;
      case "startup":
        onNavigate({ page: "startup-dossier", params: { startupId: node.id } });
        break;
      case "person":
        onNavigate({ page: "people", params: { personId: node.id } });
        break;
      case "company":
        onNavigate({ page: "companies", params: { personId: node.id } });
        break;
      case "industry":
        onNavigate({ page: "industries", params: { personId: node.id } });
        break;
      case "source":
        onNavigate({ page: "sources", params: { sourceId: node.id } });
        break;
      case "event":
        onNavigate({ page: "events", params: { personId: node.id } });
        break;
    }
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative hidden w-full max-w-md md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input
        id="admin-global-search"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && results[0]) openNode(results[0]);
          if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
        placeholder="Search articles, startups, people, sources…"
        className="w-full rounded-xl border border-[#0f2c45] bg-[#0d263d] py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-400 focus:border-[#7FFFD4]/60 focus:outline-none focus:ring-2 focus:ring-[#7FFFD4]/20"
      />

      {open && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-[#071A2B]/15 bg-white p-2 shadow-2xl">
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-slate-500">
              Nothing matches “{query}”.
            </p>
          )}

          {results.map((node) => (
            <button
              key={`${node.type}-${node.id}`}
              onClick={() => openNode(node)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#071A2B] text-[#7FFFD4]">
                  <FileText className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-[#071A2B]">
                    {node.label}
                  </span>
                  <span className="block truncate text-[10px] text-slate-500">
                    {node.subtitle}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge tone="neutral">{node.type}</Badge>
                <CornerDownLeft className="h-3 w-3 text-slate-300" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
