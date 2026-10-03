/**
 * Source management (brief §14).
 *
 * Sources are reusable: one record can substantiate claims on many articles,
 * dossiers and developments. Claims are managed alongside them so every
 * verifiable statement keeps its provenance.
 */

import { useMemo, useState } from "react";
import { BadgeCheck, ExternalLink, Link2, Plus, Trash2 } from "lucide-react";
import { useWorkspace } from "../../../lib/workspace/context";
import { useAuth } from "../../../lib/auth/context";
import { can } from "../../../lib/permissions";
import type { Claim, ClaimType, ConfidenceLevel, Source, SourceType } from "../../../lib/workspace/types";
import {
  Badge,
  Button,
  EmptyState,
  Notice,
  OriginBadge,
  StatusBadge,
} from "../../ui/primitives";
import { DataTable, FilterSelect, IconAction, RowActions, SearchInput, type Column } from "../../ui/data";
import { Modal, ConfirmDialog } from "../../ui/overlay";
import { Field, Select, TextArea, TextInput } from "../../ui/form";
import { PageHeader, Tabs } from "../../ui/layout";

const SOURCE_TYPES: SourceType[] = [
  "news",
  "press_release",
  "report",
  "interview",
  "filing",
  "database",
  "social",
  "other",
];

const CLAIM_TYPES: ClaimType[] = [
  "funding_amount",
  "leadership_change",
  "market_expansion",
  "metrics",
  "product",
  "other",
];

const CONFIDENCE: ConfidenceLevel[] = ["verified", "reported", "unverified"];

export default function SourcesPage({
  openSourceId,
  initialTab = "sources",
}: {
  openSourceId?: string;
  /** `claims` opens the verification queue directly (System → Claims route). */
  initialTab?: "sources" | "claims";
}) {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const canManage = can(profile, "sources.manage");
  const canVerify = can(profile, "claims.verify");

  const [tab, setTab] = useState<"sources" | "claims">(initialTab);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [editingSource, setEditingSource] = useState<Source | null>(
    openSourceId ? workspace.sources.byId(openSourceId) : null
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [claimCreateOpen, setClaimCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Source | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [sourceForm, setSourceForm] = useState({
    publisher: "",
    title: "",
    url: "",
    author: "",
    type: "news" as SourceType,
    publishedAt: new Date().toISOString().slice(0, 10),
  });

  const usage = (sourceId: string) => ({
    articles: workspace.articles.items.filter((article) => (article.sourceIds ?? []).includes(sourceId)),
    startups: workspace.startups.items.filter((startup) => startup.sourceIds.includes(sourceId)),
    claims: workspace.claims.items.filter((claim) => claim.sourceIds.includes(sourceId)),
  });

  const sourceRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspace.sources.items.filter((source) => {
      if (type !== "all" && source.type !== type) return false;
      if (!query) return true;
      return [source.publisher, source.title, source.author, source.url]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [search, type, workspace.sources.items]);

  const claimRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspace.claims.items.filter((claim) => {
      if (type !== "all" && claim.claimType !== type) return false;
      if (!query) return true;
      return [claim.statement, claim.value, claim.notes].join(" ").toLowerCase().includes(query);
    });
  }, [search, type, workspace.claims.items]);

  const sourceColumns: Column<Source>[] = [
    {
      key: "publisher",
      header: "Publisher",
      render: (source) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-[#071A2B]">{source.publisher}</span>
            <OriginBadge origin={source.origin} />
          </div>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block max-w-md truncate text-[11px] text-slate-500 hover:text-[#071A2B] hover:underline"
          >
            {source.title}
          </a>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      hideOnMobile: true,
      render: (source) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{source.type.replace(/_/g, " ")}</Badge>
          <StatusBadge status={source.reliability} />
        </div>
      ),
    },
    {
      key: "published",
      header: "Published",
      hideOnMobile: true,
      render: (source) => (
        <span className="text-[11px] text-slate-500">
          {source.publishedAt ? new Date(source.publishedAt).toLocaleDateString() : "—"}
          <span className="block text-[10px] text-slate-400">{source.author || "Unknown author"}</span>
        </span>
      ),
    },
    {
      key: "usage",
      header: "Used in",
      render: (source) => {
        const counts = usage(source.id);
        return (
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <Badge tone="mint">{counts.articles.length} stories</Badge>
            <Badge tone="sky">{counts.startups.length} dossiers</Badge>
            <Badge tone="amber">{counts.claims.length} claims</Badge>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (source) => (
        <RowActions>
          <IconAction
            label="Open source"
            icon={<ExternalLink className="h-4 w-4" />}
            onClick={() => window.open(source.url, "_blank", "noopener")}
          />
          <Button size="sm" variant="outline" onClick={() => setEditingSource(source)}>
            Edit
          </Button>
          {canManage && (
            <IconAction
              label="Delete source"
              tone="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setDeleteTarget(source)}
            />
          )}
        </RowActions>
      ),
    },
  ];

  const claimColumns: Column<Claim>[] = [
    {
      key: "statement",
      header: "Claim",
      render: (claim) => (
        <div className="min-w-0">
          <p className="max-w-lg text-sm font-semibold text-[#071A2B]">{claim.statement}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{claim.claimType.replace(/_/g, " ")}</Badge>
            <StatusBadge status={claim.confidence} />
            <OriginBadge origin={claim.origin} />
          </div>
        </div>
      ),
    },
    {
      key: "value",
      header: "Value",
      hideOnMobile: true,
      render: (claim) => (
        <span className="font-mono text-[11px] text-[#071A2B]">{claim.value || "—"}</span>
      ),
    },
    {
      key: "sources",
      header: "Sources",
      render: (claim) => (
        <div className="flex flex-wrap gap-1.5">
          {claim.sourceIds.map((id) => (
            <Badge key={id} tone="mint">
              {workspace.sources.byId(id)?.publisher ?? id}
            </Badge>
          ))}
          {claim.sourceIds.length === 0 && <Badge tone="rose">unsourced</Badge>}
        </div>
      ),
    },
    {
      key: "verification",
      header: "Verification",
      hideOnMobile: true,
      render: (claim) => (
        <span className="text-[11px] text-slate-500">
          {claim.verifiedBy || "Unassigned"}
          <span className="block text-[10px] text-slate-400">
            {claim.verifiedAt ? new Date(claim.verifiedAt).toLocaleDateString() : "not verified"}
          </span>
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (claim) => (
        <RowActions>
          {canVerify && !claim.verifiedAt && (
            <Button
              size="sm"
              onClick={() => {
                workspace.claims.update(claim.id, {
                  confidence: "verified",
                  verifiedAt: new Date().toISOString(),
                  verifiedBy: profile?.email ?? "workspace",
                });
                setFlash("Claim marked as verified.");
              }}
            >
              Verify
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setEditingClaim(claim)}>
            Edit
          </Button>
        </RowActions>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sources & claims"
        description="Reusable citations with the verifiable statements they substantiate."
        badge={<Badge tone="mint">{workspace.sources.items.length} sources</Badge>}
        actions={
          canManage && (
            <Button
              size="sm"
              icon={<Plus className="h-3.5 w-3.5 stroke-[2.5]" />}
              onClick={() => (tab === "sources" ? setCreateOpen(true) : setClaimCreateOpen(true))}
            >
              {tab === "sources" ? "Add source" : "Add claim"}
            </Button>
          )
        }
      >
        <Tabs
          active={tab}
          onChange={(next) => {
            setTab(next);
            setType("all");
            setSearch("");
          }}
          tabs={[
            { id: "sources", label: "Sources", count: workspace.sources.items.length },
            {
              id: "claims",
              label: "Claims",
              count: workspace.claims.items.length,
              hint: "Verifiable statements pulled from sources",
            },
          ]}
        />
      </PageHeader>

      {flash && <Notice tone="success">{flash}</Notice>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={tab === "sources" ? "Search publishers, titles, authors…" : "Search claims…"}
          className="sm:max-w-sm sm:flex-1"
        />
        <FilterSelect
          label={tab === "sources" ? "Type" : "Claim type"}
          value={type}
          onChange={setType}
          options={[
            { value: "all", label: "All" },
            ...(tab === "sources" ? SOURCE_TYPES : CLAIM_TYPES).map((entry) => ({
              value: entry,
              label: entry.replace(/_/g, " "),
            })),
          ]}
        />
      </div>

      {tab === "sources" ? (
        <DataTable
          rows={sourceRows}
          columns={sourceColumns}
          renderCard={(source) => (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-[#7FFFD4]" />
                <p className="truncate text-sm font-bold text-[#071A2B]">{source.publisher}</p>
              </div>
              <p className="truncate text-[11px] text-slate-500">{source.title}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  <Badge tone="neutral">{source.type.replace(/_/g, " ")}</Badge>
                  <StatusBadge status={source.reliability} />
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditingSource(source)}>
                  Edit
                </Button>
              </div>
            </div>
          )}
          emptyState={
            <EmptyState
              icon={<Link2 className="h-9 w-9" />}
              title="No sources match this filter"
              description="Sources keep NexTake intelligence traceable — add the publication, report or filing behind a claim."
            />
          }
        />
      ) : (
        <DataTable
          rows={claimRows}
          columns={claimColumns}
          renderCard={(claim) => (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#071A2B]">{claim.statement}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="neutral">{claim.claimType.replace(/_/g, " ")}</Badge>
                <StatusBadge status={claim.confidence} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {claim.sourceIds.length} source{claim.sourceIds.length === 1 ? "" : "s"}
                </span>
                <Button size="sm" variant="outline" onClick={() => setEditingClaim(claim)}>
                  Edit
                </Button>
              </div>
            </div>
          )}
          emptyState={
            <EmptyState
              icon={<BadgeCheck className="h-9 w-9" />}
              title="No claims recorded"
              description="Claims capture funding amounts, leadership changes, expansions and other verifiable facts."
            />
          }
        />
      )}

      {/* ------------------------------------------------------------ */}
      {/* SOURCE MODALS                                                */}
      {/* ------------------------------------------------------------ */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add source"
        description="Sources can be attached to articles, dossiers, developments and claims."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!sourceForm.publisher.trim() || !sourceForm.url.trim()}
              onClick={() => {
                const created = workspace.sources.create({
                  publisher: sourceForm.publisher.trim(),
                  title: sourceForm.title,
                  url: sourceForm.url.trim(),
                  publishedAt: sourceForm.publishedAt
                    ? new Date(sourceForm.publishedAt).toISOString()
                    : null,
                  author: sourceForm.author,
                  type: sourceForm.type,
                  reliability: "secondary",
                  accessedAt: new Date().toISOString(),
                  notes: "",
                  claimIds: [],
                });
                setCreateOpen(false);
                setEditingSource(created);
                setFlash("Source added.");
              }}
            >
              Add source
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Publisher" required>
            <TextInput
              value={sourceForm.publisher}
              onChange={(event) => setSourceForm({ ...sourceForm, publisher: event.target.value })}
              placeholder="e.g. TechCrunch"
            />
          </Field>
          <Field label="Source type">
            <Select
              value={sourceForm.type}
              onChange={(event) =>
                setSourceForm({ ...sourceForm, type: event.target.value as SourceType })
              }
            >
              {SOURCE_TYPES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="URL" required className="sm:col-span-2">
            <TextInput
              value={sourceForm.url}
              onChange={(event) => setSourceForm({ ...sourceForm, url: event.target.value })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Article title" className="sm:col-span-2">
            <TextInput
              value={sourceForm.title}
              onChange={(event) => setSourceForm({ ...sourceForm, title: event.target.value })}
            />
          </Field>
          <Field label="Author">
            <TextInput
              value={sourceForm.author}
              onChange={(event) => setSourceForm({ ...sourceForm, author: event.target.value })}
            />
          </Field>
          <Field label="Publication date">
            <TextInput
              type="date"
              value={sourceForm.publishedAt}
              onChange={(event) =>
                setSourceForm({ ...sourceForm, publishedAt: event.target.value })
              }
            />
          </Field>
        </div>
      </Modal>

      <Modal
        isOpen={editingSource !== null}
        onClose={() => setEditingSource(null)}
        title="Source record"
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditingSource(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!editingSource) return;
                workspace.sources.update(editingSource.id, editingSource);
                setEditingSource(null);
                setFlash("Source updated.");
              }}
            >
              Save source
            </Button>
          </>
        }
      >
        {editingSource && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Publisher">
                <TextInput
                  value={editingSource.publisher}
                  onChange={(event) =>
                    setEditingSource({ ...editingSource, publisher: event.target.value })
                  }
                />
              </Field>
              <Field label="Reliability">
                <Select
                  value={editingSource.reliability}
                  onChange={(event) =>
                    setEditingSource({
                      ...editingSource,
                      reliability: event.target.value as Source["reliability"],
                    })
                  }
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="tertiary">Tertiary</option>
                </Select>
              </Field>
              <Field label="URL" className="sm:col-span-2">
                <TextInput
                  value={editingSource.url}
                  onChange={(event) =>
                    setEditingSource({ ...editingSource, url: event.target.value })
                  }
                />
              </Field>
              <Field label="Title" className="sm:col-span-2">
                <TextInput
                  value={editingSource.title}
                  onChange={(event) =>
                    setEditingSource({ ...editingSource, title: event.target.value })
                  }
                />
              </Field>
              <Field label="Author">
                <TextInput
                  value={editingSource.author}
                  onChange={(event) =>
                    setEditingSource({ ...editingSource, author: event.target.value })
                  }
                />
              </Field>
              <Field label="Type">
                <Select
                  value={editingSource.type}
                  onChange={(event) =>
                    setEditingSource({ ...editingSource, type: event.target.value as SourceType })
                  }
                >
                  {SOURCE_TYPES.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Notes">
              <TextArea
                rows={3}
                value={editingSource.notes}
                onChange={(event) =>
                  setEditingSource({ ...editingSource, notes: event.target.value })
                }
                placeholder="Context, caveats, access notes…"
              />
            </Field>

            <div className="rounded-xl border border-[#071A2B]/12 bg-slate-50/70 p-4 text-[11px] text-slate-600">
              <p className="font-bold uppercase tracking-wider text-slate-500">Used in</p>
              <ul className="mt-2 space-y-1">
                <li>{usage(editingSource.id).articles.length} article(s)</li>
                <li>{usage(editingSource.id).startups.length} dossier(s)</li>
                <li>{usage(editingSource.id).claims.length} claim(s)</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete this source?"
        message={`“${deleteTarget?.publisher ?? ""}” will be detached from every record that cites it.`}
        confirmLabel="Delete source"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) workspace.sources.remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      {/* ------------------------------------------------------------ */}
      {/* CLAIM MODALS                                                 */}
      {/* ------------------------------------------------------------ */}
      <ClaimModal
        /* Remount per claim so the form initialises from the record being
           edited, instead of copying props into state inside an effect. */
        key={editingClaim?.id ?? "new-claim"}
        isOpen={claimCreateOpen || editingClaim !== null}
        claim={editingClaim}
        sources={workspace.sources.items.map((source) => ({
          id: source.id,
          label: source.publisher,
        }))}
        onClose={() => {
          setClaimCreateOpen(false);
          setEditingClaim(null);
        }}
        onSave={(payload) => {
          if (editingClaim) {
            workspace.claims.update(editingClaim.id, payload);
            setFlash("Claim updated.");
          } else {
            workspace.claims.create({
              statement: payload.statement ?? "",
              claimType: payload.claimType ?? "other",
              value: payload.value ?? "",
              confidence: payload.confidence ?? "reported",
              sourceIds: payload.sourceIds ?? [],
              notes: payload.notes ?? "",
              entityRefs: [],
              verifiedBy: "",
              verifiedAt: null,
            });
            setFlash("Claim recorded — link it to a dossier or story.");
          }
          setClaimCreateOpen(false);
          setEditingClaim(null);
        }}
      />
    </div>
  );
}

function ClaimModal({
  isOpen,
  claim,
  sources,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  claim: Claim | null;
  sources: Array<{ id: string; label: string }>;
  onClose: () => void;
  onSave: (payload: Partial<Claim>) => void;
}) {
  const [statement, setStatement] = useState(claim?.statement ?? "");
  const [claimType, setClaimType] = useState<ClaimType>(claim?.claimType ?? "funding_amount");
  const [value, setValue] = useState(claim?.value ?? "");
  const [confidence, setConfidence] = useState<ConfidenceLevel>(claim?.confidence ?? "reported");
  const [sourceIds, setSourceIds] = useState<string[]>(claim?.sourceIds ?? []);
  const [notes, setNotes] = useState(claim?.notes ?? "");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={claim ? "Edit claim" : "Record a claim"}
      description="A claim is a verifiable statement, always traceable to at least one source."
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!statement.trim()}
            onClick={() =>
              onSave({
                statement: statement.trim(),
                claimType,
                value,
                confidence,
                sourceIds,
                notes,
              })
            }
          >
            {claim ? "Save claim" : "Record claim"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Statement" required>
          <TextArea
            rows={3}
            value={statement}
            onChange={(event) => setStatement(event.target.value)}
            placeholder="e.g. Flutterwave raised a $100m Series D extension."
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Claim type">
            <Select
              value={claimType}
              onChange={(event) => setClaimType(event.target.value as ClaimType)}
            >
              {CLAIM_TYPES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Value">
            <TextInput
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="$100,000,000"
            />
          </Field>
          <Field label="Confidence">
            <Select
              value={confidence}
              onChange={(event) => setConfidence(event.target.value as ConfidenceLevel)}
            >
              {CONFIDENCE.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Sources" hint="At least one source is required before verification.">
          <div className="flex flex-wrap gap-1.5">
            {sources.map((source) => {
              const active = sourceIds.includes(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() =>
                    setSourceIds(
                      active ? sourceIds.filter((id) => id !== source.id) : [...sourceIds, source.id]
                    )
                  }
                  className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    active
                      ? "border-[#7FFFD4] bg-[#7FFFD4]/20 text-[#071A2B]"
                      : "border-[#071A2B]/15 text-slate-600"
                  }`}
                >
                  {source.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Fact-check notes">
          <TextArea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
