/**
 * Content intelligence panel (brief §11).
 *
 * Shows what the relationship engine detected in the copy and proposes links.
 * Nothing here writes to a record: every candidate is `pending` until the
 * editor presses Approve, and rejected candidates are recorded as such so they
 * are not re-proposed.
 */

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Bell,
  Lightbulb,
  Link2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { useWorkspace } from "../../lib/workspace/context";
import type { RelationshipSuggestion } from "../../lib/workspace/types";
import { Badge, Button, EmptyState, ProgressBar } from "../ui/primitives";

export default function SuggestionPanel({
  hostType,
  hostId,
  hostLabel,
  text,
  category,
  tags = [],
  linkedStartupIds = [],
  linkedPersonIds = [],
  linkedArticleIds = [],
  onAccept,
}: {
  hostType: "article" | "startup";
  hostId: string;
  hostLabel: string;
  /** Copy analysed for entities — title + summary + body. */
  text: string;
  category?: string;
  tags?: string[];
  linkedStartupIds?: string[];
  linkedPersonIds?: string[];
  linkedArticleIds?: string[];
  onAccept: (suggestion: RelationshipSuggestion) => void;
}) {
  const workspace = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const pending = workspace.suggestions.pendingFor(hostId);
  const accepted = workspace.suggestions.acceptedFor(hostId);
  const rejected = useMemo(
    () =>
      workspace.suggestions.items.filter(
        (item) => item.hostId === hostId && item.status === "rejected"
      ),
    [hostId, workspace.suggestions.items]
  );

  const detected = useMemo(() => {
    const latest = workspace.suggestions.items.find((item) => item.hostId === hostId);
    return latest?.detectedEntities ?? [];
  }, [hostId, workspace.suggestions.items]);

  const runDetection = () => {
    setBusy(true);
    const fresh = workspace.suggestions.generate({
      type: hostType,
      id: hostId,
      label: hostLabel,
      text,
      linkedStartupIds,
      linkedPersonIds,
      linkedArticleIds,
      category,
      tags,
    });
    setBusy(false);
    setFlash(
      fresh.length > 0
        ? `${fresh.length} new candidate link${fresh.length === 1 ? "" : "s"} — awaiting your approval.`
        : "No new candidates. Suggestions already reviewed stay out of the queue."
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#071A2B]/15 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#071A2B] text-[#7FFFD4]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#071A2B]">Content intelligence</h3>
              <p className="text-[11px] text-slate-500">
                Detected entities and candidate relationships. Nothing is linked until you
                approve it.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />}
            onClick={runDetection}
            disabled={busy}
          >
            Detect
          </Button>
        </div>

        {flash && (
          <p className="mt-3 rounded-lg border border-[#7FFFD4]/40 bg-[#7FFFD4]/10 px-3 py-2 text-[11px] font-semibold text-[#071A2B]">
            {flash}
          </p>
        )}

        <div className="mt-4 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Detected entities
          </span>
          <div className="flex flex-wrap gap-1.5">
            {detected.length === 0 && (
              <span className="text-[11px] text-slate-400">
                Run detection after writing the story body.
              </span>
            )}
            {detected.map((entity) => (
              <Badge key={entity} tone="navy">
                <Lightbulb className="h-3 w-3" />
                {entity}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Pending approval
          </span>
          <Badge tone={pending.length > 0 ? "amber" : "neutral"}>{pending.length}</Badge>
        </div>

        {pending.length === 0 && (
          <EmptyState
            icon={<Bell className="h-7 w-7" />}
            title="No suggestions waiting"
            description="Candidate links appear here after detection. Suggested relationships are never published automatically."
          />
        )}

        {pending.map((suggestion) => (
          <div
            key={suggestion.id}
            className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone="amber">{suggestion.targetType}</Badge>
                  <span className="truncate text-sm font-bold text-[#071A2B]">
                    {suggestion.targetLabel}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  {suggestion.reason}
                </p>
              </div>
              <div className="w-20 shrink-0 space-y-1 text-right">
                <span className="text-[10px] font-bold text-slate-500">
                  {Math.round(suggestion.confidence * 100)}%
                </span>
                <ProgressBar
                  value={suggestion.confidence * 100}
                  tone={suggestion.confidence > 0.7 ? "mint" : "amber"}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                icon={<BadgeCheck className="h-3.5 w-3.5" />}
                onClick={() => {
                  workspace.suggestions.decide(suggestion.id, "accepted");
                  onAccept(suggestion);
                }}
              >
                Approve link
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={<X className="h-3.5 w-3.5" />}
                onClick={() => workspace.suggestions.decide(suggestion.id, "rejected")}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>

      {(accepted.length > 0 || rejected.length > 0) && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Decision history
          </span>
          <div className="space-y-1.5">
            {[...accepted, ...rejected]
              .sort(
                (a, b) =>
                  new Date(b.decidedAt ?? 0).getTime() - new Date(a.decidedAt ?? 0).getTime()
              )
              .slice(0, 6)
              .map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#071A2B]/10 px-3 py-2 text-[11px]"
                >
                  <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
                    <Link2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{suggestion.targetLabel}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={suggestion.status === "accepted" ? "emerald" : "rose"}>
                      {suggestion.status}
                    </Badge>
                    <span className="text-slate-400">{suggestion.decidedBy || "—"}</span>
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
