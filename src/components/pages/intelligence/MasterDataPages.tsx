/**
 * Companies, Industries and Events (brief §5 intelligence group).
 *
 * Deliberately lighter than the startup dossier: these are the supporting
 * records that give dossiers and stories their context.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  Merge,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import { useWorkspace } from "../../../lib/workspace/context";
import { useAuth } from "../../../lib/auth/context";
import { can } from "../../../lib/permissions";
import type {
  Company,
  EventKind,
  Industry,
  NexTakeEvent,
} from "../../../lib/workspace/types";
import { MARKETS, findDuplicates, taxonomySlug } from "../../../lib/workspace/taxonomy";
import { Badge, Button, EmptyState, Notice, OriginBadge } from "../../ui/primitives";
import { FilterSelect, SearchInput } from "../../ui/data";
import { ConfirmDialog, Modal } from "../../ui/overlay";
import { Field, Select, TextArea, TextInput } from "../../ui/form";
import { PageHeader } from "../../ui/layout";
import EntityPicker from "../../admin/EntityPicker";

/* -------------------------------------------------------------------------- */
/*                                  COMPANIES                                 */
/* -------------------------------------------------------------------------- */

export function CompaniesPage() {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const canManage = can(profile, "companies.manage");

  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("all");
  const [editing, setEditing] = useState<Company | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: "", sector: "", websiteUrl: "", country: "Global" });

  const sectors = useMemo(
    () => Array.from(new Set(workspace.companies.items.map((company) => company.sector))).sort(),
    [workspace.companies.items]
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspace.companies.items.filter((company) => {
      if (sector !== "all" && company.sector !== sector) return false;
      if (!query) return true;
      return [company.name, company.sector, company.description]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [sector, search, workspace.companies.items]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Investors, corporates and partners referenced across dossiers and stories."
        badge={<Badge tone="mint">{workspace.companies.items.length} records</Badge>}
        actions={
          canManage && (
            <Button
              size="sm"
              icon={<Plus className="h-3.5 w-3.5 stroke-[2.5]" />}
              onClick={() => setCreating(true)}
            >
              Add company
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search companies…" className="sm:max-w-sm sm:flex-1" />
        <FilterSelect
          label="Sector"
          value={sector}
          onChange={setSector}
          options={[
            { value: "all", label: "All sectors" },
            ...sectors.map((entry) => ({ value: entry, label: entry })),
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((company) => (
          <div key={company.id} className="space-y-3 rounded-2xl border border-[#071A2B]/15 p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#071A2B] text-[#7FFFD4]">
                  <Building2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#071A2B]">{company.name}</p>
                  <p className="text-[11px] text-slate-500">{company.sector}</p>
                </div>
              </div>
              <OriginBadge origin={company.origin} />
            </div>
            <p className="line-clamp-3 text-[11px] leading-relaxed text-slate-600">
              {company.description || "No description recorded."}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="neutral">{company.country}</Badge>
              {company.relatedStartupIds.map((id) => (
                <Badge key={id} tone="mint">
                  {workspace.startups.byId(id)?.name ?? id}
                </Badge>
              ))}
            </div>
            {canManage && (
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(company)}>
                  Edit
                </Button>
                <button
                  onClick={() => setDeleteTarget(company)}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Delete company"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState icon={<Building2 className="h-9 w-9" />} title="No companies match this filter" />
          </div>
        )}
      </div>

      <Modal
        isOpen={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Company record" : "Add company"}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!editing && !form.name.trim()}
              onClick={() => {
                if (editing) {
                  workspace.companies.update(editing.id, editing);
                  setEditing(null);
                } else {
                  workspace.companies.create({
                    name: form.name.trim(),
                    sector: workspace.taxonomy.resolve("industry", form.sector || "Other"),
                    description: "",
                    websiteUrl: form.websiteUrl,
                    country: form.country,
                    relatedStartupIds: [],
                  });
                  setCreating(false);
                  setForm({ name: "", sector: "", websiteUrl: "", country: "Global" });
                }
              }}
            >
              {editing ? "Save" : "Add company"}
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name">
                <TextInput
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                />
              </Field>
              <Field label="Sector">
                <TextInput
                  value={editing.sector}
                  onChange={(event) => setEditing({ ...editing, sector: event.target.value })}
                />
              </Field>
              <Field label="Website">
                <TextInput
                  value={editing.websiteUrl}
                  onChange={(event) => setEditing({ ...editing, websiteUrl: event.target.value })}
                />
              </Field>
              <Field label="Country">
                <Select
                  value={editing.country}
                  onChange={(event) => setEditing({ ...editing, country: event.target.value })}
                >
                  {Array.from(new Set([...MARKETS, "Global", editing.country])).map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Description">
              <TextArea
                rows={3}
                value={editing.description}
                onChange={(event) => setEditing({ ...editing, description: event.target.value })}
              />
            </Field>
            <EntityPicker
              label="Related startups"
              types={["startup"]}
              selectedIds={editing.relatedStartupIds}
              onChange={(relatedStartupIds) => setEditing({ ...editing, relatedStartupIds })}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" required className="sm:col-span-2">
              <TextInput
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="Sector">
              <TextInput
                value={form.sector}
                onChange={(event) => setForm({ ...form, sector: event.target.value })}
                placeholder="Venture capital"
              />
            </Field>
            <Field label="Website">
              <TextInput
                value={form.websiteUrl}
                onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete this company?"
        message={`“${deleteTarget?.name ?? ""}” will be removed from the intelligence store.`}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) workspace.companies.remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 INDUSTRIES                                 */
/* -------------------------------------------------------------------------- */

export function IndustriesPage() {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const canManage = can(profile, "industries.manage");

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Industry | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [mergeTarget, setMergeTarget] = useState<Industry | null>(null);

  const duplicates = useMemo(
    () => findDuplicates(workspace.taxonomy.byKind("industry")),
    [workspace.taxonomy]
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspace.industries.items.filter((industry) =>
      query ? `${industry.name} ${industry.aliases.join(" ")}`.toLowerCase().includes(query) : true
    );
  }, [search, workspace.industries.items]);

  const usage = (industry: Industry) => ({
    startups: workspace.startups.items.filter((startup) => startup.industry === industry.name).length,
    stories: workspace.articles.items.filter((article) => article.category === industry.name).length,
    taxonomy: workspace.taxonomy
      .byKind("industry")
      .filter((term) => term.name === industry.name).length,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Industries"
        description="The controlled sector vocabulary used by dossiers, tags and categories."
        badge={<Badge tone="mint">{workspace.industries.items.length} industries</Badge>}
        actions={
          canManage && (
            <Button
              size="sm"
              icon={<Plus className="h-3.5 w-3.5 stroke-[2.5]" />}
              onClick={() => setCreating(true)}
            >
              Add industry
            </Button>
          )
        }
      />

      {duplicates.length > 0 && (
        <Notice tone="warning" title="Possible duplicate concepts">
          {duplicates.length} grouping(s) of industry terms fold onto the same canonical value.
          Review the aliases so spelling variants resolve to one record.
        </Notice>
      )}

      <SearchInput value={search} onChange={setSearch} placeholder="Search industries and aliases…" className="sm:max-w-sm" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((industry) => {
          const counts = usage(industry);
          return (
            <div key={industry.id} className="space-y-3 rounded-2xl border border-[#071A2B]/15 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#071A2B] text-[#7FFFD4]">
                    <Tags className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#071A2B]">{industry.name}</p>
                    <p className="font-mono text-[10px] text-slate-400">{industry.slug}</p>
                  </div>
                </div>
                <OriginBadge origin={industry.origin} />
              </div>
              <p className="line-clamp-2 text-[11px] text-slate-600">
                {industry.description || "No description."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="mint">{counts.startups} startups</Badge>
                <Badge tone="sky">{counts.stories} stories</Badge>
                {industry.aliases.length > 0 && (
                  <Badge tone="neutral">{industry.aliases.join(", ")}</Badge>
                )}
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(industry)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Merge className="h-3.5 w-3.5" />}
                    onClick={() => setMergeTarget(industry)}
                  >
                    Merge
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={creating}
        onClose={() => setCreating(false)}
        title="Add industry"
        description="Names are canonicalised, so “FinTech”, “fintech” and “FINTECH” resolve to one value."
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newName.trim()}
              onClick={() => {
                const canonical = workspace.taxonomy.resolve("industry", newName);
                workspace.industries.create({
                  name: canonical,
                  slug: taxonomySlug(canonical),
                  description: "",
                  parentId: null,
                  aliases: newName.trim() === canonical ? [] : [newName.trim()],
                });
                setCreating(false);
                setNewName("");
              }}
            >
              Add industry
            </Button>
          </>
        }
      >
        <Field label="Industry name" hint="Existing concepts are reused instead of duplicated.">
          <TextInput
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="e.g. Healthtech"
          />
        </Field>
      </Modal>

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title="Industry record"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!editing) return;
                workspace.industries.update(editing.id, editing);
                workspace.taxonomy.resolve("industry", editing.name);
                setEditing(null);
              }}
            >
              Save industry
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Name">
              <TextInput
                value={editing.name}
                onChange={(event) => setEditing({ ...editing, name: event.target.value })}
              />
            </Field>
            <Field label="Aliases" hint="Comma separated spelling variants that fold into this record.">
              <TextInput
                value={editing.aliases.join(", ")}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    aliases: event.target.value
                      .split(",")
                      .map((entry) => entry.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
            <Field label="Description">
              <TextArea
                rows={3}
                value={editing.description}
                onChange={(event) => setEditing({ ...editing, description: event.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={mergeTarget !== null}
        title="Fold duplicate concepts"
        message={`Every alias recorded for “${mergeTarget?.name ?? ""}” will resolve to this single canonical industry value across the console.`}
        confirmLabel="Fold duplicates"
        tone="primary"
        onCancel={() => setMergeTarget(null)}
        onConfirm={() => {
          if (mergeTarget) {
            const canonical = workspace.taxonomy.resolve("industry", mergeTarget.name);
            workspace.industries.update(mergeTarget.id, {
              name: canonical,
              slug: taxonomySlug(canonical),
            });
          }
          setMergeTarget(null);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   EVENTS                                   */
/* -------------------------------------------------------------------------- */

const EVENT_KINDS: EventKind[] = [
  "conference",
  "summit",
  "launch",
  "award",
  "webinar",
  "meetup",
  "other",
];

export function EventsPage() {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const canManage = can(profile, "events.manage");

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [upcoming, setUpcoming] = useState("upcoming");

  /** Captured once per mount, refreshed on a timer (keeps render pure). */
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const [editing, setEditing] = useState<NexTakeEvent | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    kind: "conference" as EventKind,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    location: "",
    url: "",
    organizer: "",
  });

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = clock;
    return workspace.events.items
      .filter((event) => {
        if (kind !== "all" && event.kind !== kind) return false;
        if (upcoming === "upcoming" && new Date(event.endDate).getTime() < now) return false;
        if (upcoming === "past" && new Date(event.endDate).getTime() >= now) return false;
        if (!query) return true;
        return `${event.name} ${event.location} ${event.organizer}`.toLowerCase().includes(query);
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [clock, kind, search, upcoming, workspace.events.items]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Conferences, summits, launches and awards tracked against startups and coverage."
        badge={<Badge tone="mint">{workspace.events.items.length} events</Badge>}
        actions={
          canManage && (
            <Button
              size="sm"
              icon={<Plus className="h-3.5 w-3.5 stroke-[2.5]" />}
              onClick={() => setCreating(true)}
            >
              Add event
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search events…" className="sm:max-w-sm sm:flex-1" />
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Kind"
            value={kind}
            onChange={setKind}
            options={[
              { value: "all", label: "All kinds" },
              ...EVENT_KINDS.map((entry) => ({ value: entry, label: entry })),
            ]}
          />
          <FilterSelect
            label="When"
            value={upcoming}
            onChange={setUpcoming}
            options={[
              { value: "upcoming", label: "Upcoming" },
              { value: "past", label: "Past" },
              { value: "all", label: "All" },
            ]}
          />
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((event) => (
          <div
            key={event.id}
            className="flex flex-col gap-3 rounded-2xl border border-[#071A2B]/15 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#071A2B] text-[#7FFFD4]">
                <CalendarDays className="h-4 w-4" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-[#071A2B]">{event.name}</p>
                  <Badge tone="mint">{event.kind}</Badge>
                  <OriginBadge origin={event.origin} />
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {new Date(event.startDate).toLocaleDateString()} –{" "}
                  {new Date(event.endDate).toLocaleDateString()} · {event.location || "Location TBC"}
                </p>
                <p className="text-[11px] text-slate-500">
                  Organiser: {event.organizer || "—"} · {event.startupIds.length} startups ·{" "}
                  {event.articleIds.length} stories
                </p>
              </div>
            </div>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setEditing(event)}>
                Edit
              </Button>
            )}
          </div>
        ))}

        {rows.length === 0 && (
          <EmptyState
            icon={<CalendarDays className="h-9 w-9" />}
            title="No events match this filter"
            description="Track conferences and launches so dossiers and stories can reference them."
          />
        )}
      </div>

      <Modal
        isOpen={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Event record" : "Add event"}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!editing && !form.name.trim()}
              onClick={() => {
                if (editing) {
                  workspace.events.update(editing.id, editing);
                  setEditing(null);
                } else {
                  workspace.events.create({
                    name: form.name.trim(),
                    kind: form.kind,
                    startDate: new Date(form.startDate).toISOString(),
                    endDate: new Date(form.endDate).toISOString(),
                    location: form.location,
                    url: form.url,
                    description: "",
                    organizer: form.organizer,
                    startupIds: [],
                    personIds: [],
                    articleIds: [],
                  });
                  setCreating(false);
                }
              }}
            >
              {editing ? "Save" : "Add event"}
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name" className="sm:col-span-2">
                <TextInput
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>
              <Field label="Kind">
                <Select
                  value={editing.kind}
                  onChange={(e) => setEditing({ ...editing, kind: e.target.value as EventKind })}
                >
                  {EVENT_KINDS.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Location">
                <TextInput
                  value={editing.location}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                />
              </Field>
              <Field label="Starts">
                <TextInput
                  type="date"
                  value={editing.startDate.slice(0, 10)}
                  onChange={(e) =>
                    setEditing({ ...editing, startDate: new Date(e.target.value).toISOString() })
                  }
                />
              </Field>
              <Field label="Ends">
                <TextInput
                  type="date"
                  value={editing.endDate.slice(0, 10)}
                  onChange={(e) =>
                    setEditing({ ...editing, endDate: new Date(e.target.value).toISOString() })
                  }
                />
              </Field>
            </div>
            <EntityPicker
              label="Startups attending or featured"
              types={["startup"]}
              selectedIds={editing.startupIds}
              onChange={(startupIds) => setEditing({ ...editing, startupIds })}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" required className="sm:col-span-2">
              <TextInput
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="Kind">
              <Select
                value={form.kind}
                onChange={(event) => setForm({ ...form, kind: event.target.value as EventKind })}
              >
                {EVENT_KINDS.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Location">
              <TextInput
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
              />
            </Field>
            <Field label="Starts">
              <TextInput
                type="date"
                value={form.startDate}
                onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              />
            </Field>
            <Field label="Ends">
              <TextInput
                type="date"
                value={form.endDate}
                onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              />
            </Field>
            <Field label="Organiser">
              <TextInput
                value={form.organizer}
                onChange={(event) => setForm({ ...form, organizer: event.target.value })}
              />
            </Field>
            <Field label="Website">
              <TextInput
                value={form.url}
                onChange={(event) => setForm({ ...form, url: event.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
