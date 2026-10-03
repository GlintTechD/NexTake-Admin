/**
 * People directory (brief §17) — reusable human entities linked to startups,
 * articles and interviews.
 */

import { useMemo, useState } from "react";
import { ExternalLink, Plus, Trash2, UserSquare2 } from "lucide-react";
import { useWorkspace } from "../../../lib/workspace/context";
import { useAuth } from "../../../lib/auth/context";
import { can } from "../../../lib/permissions";
import type { Person } from "../../../lib/workspace/types";
import { Badge, Button, EmptyState, Notice, OriginBadge } from "../../ui/primitives";
import { DataTable, FilterSelect, IconAction, RowActions, SearchInput, type Column } from "../../ui/data";
import { Modal, ConfirmDialog } from "../../ui/overlay";
import { Field, TextArea, TextInput } from "../../ui/form";
import { PageHeader } from "../../ui/layout";
import EntityPicker from "../../admin/EntityPicker";

export default function PeoplePage({ openPersonId }: { openPersonId?: string }) {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const canManage = can(profile, "people.manage");

  const [search, setSearch] = useState("");
  const [organization, setOrganization] = useState("all");
  const [editing, setEditing] = useState<Person | null>(
    openPersonId ? workspace.people.byId(openPersonId) : null
  );
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", role: "", organization: "", location: "" });

  const organizations = useMemo(
    () => Array.from(new Set(workspace.people.items.map((person) => person.organization))).sort(),
    [workspace.people.items]
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspace.people.items.filter((person) => {
      if (organization !== "all" && person.organization !== organization) return false;
      if (!query) return true;
      return [person.name, person.role, person.organization, person.location, person.biography]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [organization, search, workspace.people.items]);

  const columns: Column<Person>[] = [
    {
      key: "name",
      header: "Person",
      render: (person) => (
        <div className="flex items-center gap-3">
          {person.photoUrl ? (
            <img src={person.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#071A2B] text-[#7FFFD4]">
              <UserSquare2 className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#071A2B]">{person.name}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="truncate text-[11px] text-slate-500">
                {person.currentRole || person.role}
              </span>
              <OriginBadge origin={person.origin} />
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "organization",
      header: "Organization",
      hideOnMobile: true,
      render: (person) => (
        <span className="text-xs text-slate-600">{person.organization || "—"}</span>
      ),
    },
    {
      key: "location",
      header: "Location",
      hideOnMobile: true,
      render: (person) => <span className="text-xs text-slate-600">{person.location || "—"}</span>,
    },
    {
      key: "links",
      header: "Startups / stories",
      render: (person) => (
        <div className="flex flex-wrap gap-1.5">
          {person.startupIds.map((id) => (
            <Badge key={id} tone="mint">
              {workspace.startups.byId(id)?.name ?? id}
            </Badge>
          ))}
          <Badge tone="neutral">
            {person.articleIds.length + person.interviewIds.length} pieces
          </Badge>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (person) => (
        <RowActions>
          <Button size="sm" variant="outline" onClick={() => setEditing(person)}>
            Edit
          </Button>
          {person.links.linkedin && (
            <IconAction
              label="LinkedIn"
              icon={<ExternalLink className="h-4 w-4" />}
              onClick={() => window.open(person.links.linkedin, "_blank", "noopener")}
            />
          )}
          {canManage && (
            <IconAction
              label="Delete person"
              tone="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setDeleteTarget(person)}
            />
          )}
        </RowActions>
      ),
    },
  ];

  const saveEditing = () => {
    if (!editing) return;
    workspace.people.update(editing.id, editing);
    setFlash(`“${editing.name}” updated.`);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="People"
        description="Executives, founders, reporters and analysts — reusable across dossiers, stories and interviews."
        badge={<Badge tone="mint">{workspace.people.items.length} records</Badge>}
        actions={
          canManage && (
            <Button
              size="sm"
              icon={<Plus className="h-3.5 w-3.5 stroke-[2.5]" />}
              onClick={() => setCreateOpen(true)}
            >
              Add person
            </Button>
          )
        }
      />

      {flash && <Notice tone="success">{flash}</Notice>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, role, organization…"
          className="sm:max-w-sm sm:flex-1"
        />
        <FilterSelect
          label="Organization"
          value={organization}
          onChange={setOrganization}
          options={[
            { value: "all", label: "All organizations" },
            ...organizations.map((entry) => ({ value: entry, label: entry || "Unattached" })),
          ]}
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        renderCard={(person) => (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#071A2B] text-[#7FFFD4]">
                <UserSquare2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#071A2B]">{person.name}</p>
                <p className="truncate text-[11px] text-slate-500">
                  {person.currentRole || person.role} · {person.organization}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">{person.location}</span>
              <Button size="sm" variant="outline" onClick={() => setEditing(person)}>
                Edit
              </Button>
            </div>
          </div>
        )}
        emptyState={
          <EmptyState
            icon={<UserSquare2 className="h-9 w-9" />}
            title="No people match this filter"
            description="People records power dossiers, coverage and interview credits."
          />
        }
      />

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add person"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!form.name.trim()}
              onClick={() => {
                const created = workspace.people.create({
                  name: form.name.trim(),
                  role: form.role,
                  organization: form.organization,
                  startupIds: [],
                  location: form.location,
                  biography: "",
                  currentRole: form.role,
                  photoUrl: "",
                  links: { linkedin: "", x: "", website: "" },
                  articleIds: [],
                  interviewIds: [],
                });
                setCreateOpen(false);
                setForm({ name: "", role: "", organization: "", location: "" });
                setEditing(created);
              }}
            >
              Create & open
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required className="sm:col-span-2">
            <TextInput
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Olugbenga Agboola"
            />
          </Field>
          <Field label="Role">
            <TextInput
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
              placeholder="Co-founder & CEO"
            />
          </Field>
          <Field label="Organization">
            <TextInput
              value={form.organization}
              onChange={(event) => setForm({ ...form, organization: event.target.value })}
            />
          </Field>
          <Field label="Location" className="sm:col-span-2">
            <TextInput
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              placeholder="Lagos, Nigeria"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title="Person record"
        description="Reusable across dossiers, articles and interviews."
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveEditing}>
              Save record
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name">
                <TextInput
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                />
              </Field>
              <Field label="Current role">
                <TextInput
                  value={editing.currentRole}
                  onChange={(event) =>
                    setEditing({ ...editing, currentRole: event.target.value })
                  }
                />
              </Field>
              <Field label="Organization">
                <TextInput
                  value={editing.organization}
                  onChange={(event) =>
                    setEditing({ ...editing, organization: event.target.value })
                  }
                />
              </Field>
              <Field label="Location">
                <TextInput
                  value={editing.location}
                  onChange={(event) => setEditing({ ...editing, location: event.target.value })}
                />
              </Field>
              <Field label="Photo URL" className="sm:col-span-2">
                <TextInput
                  value={editing.photoUrl}
                  onChange={(event) => setEditing({ ...editing, photoUrl: event.target.value })}
                  placeholder="https://…"
                />
              </Field>
              <Field label="LinkedIn">
                <TextInput
                  value={editing.links.linkedin}
                  onChange={(event) =>
                    setEditing({ ...editing, links: { ...editing.links, linkedin: event.target.value } })
                  }
                />
              </Field>
              <Field label="X / Twitter">
                <TextInput
                  value={editing.links.x}
                  onChange={(event) =>
                    setEditing({ ...editing, links: { ...editing.links, x: event.target.value } })
                  }
                />
              </Field>
            </div>

            <Field label="Biography">
              <TextArea
                rows={4}
                value={editing.biography}
                onChange={(event) => setEditing({ ...editing, biography: event.target.value })}
              />
            </Field>

            <EntityPicker
              label="Startups"
              types={["startup"]}
              selectedIds={editing.startupIds}
              onChange={(startupIds) => setEditing({ ...editing, startupIds })}
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete this person?"
        message={`“${deleteTarget?.name ?? ""}” will be removed and unlinked from dossiers and stories.`}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) workspace.people.remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
