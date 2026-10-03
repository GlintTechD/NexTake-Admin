/**
 * System group (brief §22–§23).
 *
 *   • Users              — invitations, role assignment, account status
 *   • Roles & permissions — the permission matrix behind `can()`
 *   • Settings            — General, Brand, SEO, Email, Authentication,
 *                           Publishing, Media, Integrations, Users & permissions
 *
 * Settings reuse the existing `SiteSettings` record that already drives the
 * public site (nav links, hero text, breaking banner, daily-edit switch) rather
 * than introducing a second configuration store.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Database,
  Fingerprint,
  Globe,
  Image as ImageIcon,
  KeyRound,
  Mail,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users2,
  X,
} from "lucide-react";
import { useWorkspace } from "../../../lib/workspace/context";
import { useAuth } from "../../../lib/auth/context";
import {
  ALL_PERMISSIONS,
  ROLE_DEFINITIONS,
  assignableRoles,
  can,
  roleName,
} from "../../../lib/permissions";
import type { AdminRole } from "../../../lib/workspace/types";
import type { SiteSettings } from "../../../types";
import { isSupabaseConfigured } from "../../../lib/config";
import { Badge, Button, Card, EmptyState, Notice, StatCard } from "../../ui/primitives";
import { DataTable, FilterSelect, IconAction, RowActions, SearchInput, type Column } from "../../ui/data";
import { ConfirmDialog, Modal } from "../../ui/overlay";
import { Field, Select, TextArea, TextInput } from "../../ui/form";
import { PageHeader, Tabs } from "../../ui/layout";

/* -------------------------------------------------------------------------- */
/*                                   USERS                                    */
/* -------------------------------------------------------------------------- */

export function UsersPage() {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const canManage = can(profile, "users.manage");
  const canView = can(profile, "users.view");

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [invite, setInvite] = useState({ email: "", fullName: "", role: "writer" as AdminRole, notes: "" });

  const actorRole = (profile?.role ?? "admin") as AdminRole;
  const assignable = assignableRoles(actorRole);
  const rolesForSelect = assignable.length > 0 ? assignable : ROLE_DEFINITIONS;

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspace.users.items.filter((user) => {
      if (role !== "all" && user.role !== role) return false;
      if (status !== "all" && user.status !== status) return false;
      if (!query) return true;
      return `${user.fullName} ${user.email}`.toLowerCase().includes(query);
    });
  }, [role, search, status, workspace.users.items]);

  if (!canView && !canManage) {
    return (
      <EmptyState
        title="User management restricted"
        description="Your role cannot view the user list. Administrators manage accounts and permissions."
      />
    );
  }

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: "user",
      header: "User",
      render: (user) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#071A2B]">{user.fullName}</p>
          <p className="truncate text-[11px] text-slate-500">{user.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (user) =>
        canManage ? (
          <Select
            value={user.role}
            onChange={(event) => {
              workspace.users.update(user.id, { role: event.target.value as AdminRole });
              setFlash(`${user.fullName} is now ${roleName(event.target.value as AdminRole)}.`);
            }}
          >
            {ROLE_DEFINITIONS.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.name}
              </option>
            ))}
          </Select>
        ) : (
          <Badge tone="navy">{roleName(user.role)}</Badge>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (user) => <Badge tone={user.status === "active" ? "mint" : user.status === "invited" ? "amber" : "rose"}>{user.status}</Badge>,
    },
    {
      key: "activity",
      header: "Last active",
      hideOnMobile: true,
      render: (user) => (
        <span className="text-[11px] text-slate-500">
          {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : "never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (user) => (
        <RowActions>
          {canManage && (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(user.id)}>
                Permissions
              </Button>
              <IconAction
                label={user.status === "suspended" ? "Reactivate account" : "Suspend account"}
                icon={user.status === "suspended" ? <BadgeCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                onClick={() =>
                  workspace.users.update(user.id, {
                    status: user.status === "suspended" ? "active" : "suspended",
                  })
                }
              />
              <IconAction
                label="Remove user"
                tone="danger"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => setRemoveTarget(user.id)}
              />
            </>
          )}
        </RowActions>
      ),
    },
  ];

  const editingUser = editing ? workspace.users.byId(editing) : null;
  const roleDefinitionForEditing = editingUser ? ROLE_DEFINITIONS.find((r) => r.id === editingUser.role) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Console access is granted by invitation and constrained by role. Passwords are never stored or set here."
        badge={<Badge tone="mint">{workspace.users.items.filter((u) => u.status === "active").length} active</Badge>}
        actions={
          canManage && (
            <Button
              size="sm"
              icon={<UserPlus className="h-3.5 w-3.5" />}
              onClick={() => setInviteOpen(true)}
            >
              Invite user
            </Button>
          )
        }
      />

      {flash && <Notice tone="success">{flash}</Notice>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Accounts" value={workspace.users.items.length} icon={<Users2 className="h-3.5 w-3.5" />} />
        <StatCard label="Active" value={workspace.users.items.filter((u) => u.status === "active").length} />
        <StatCard label="Invited" value={workspace.users.items.filter((u) => u.status === "invited").length} />
        <StatCard label="Suspended" value={workspace.users.items.filter((u) => u.status === "suspended").length} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" className="sm:max-w-sm sm:flex-1" />
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            label="Role"
            value={role}
            onChange={setRole}
            options={[
              { value: "all", label: "All roles" },
              ...ROLE_DEFINITIONS.map((definition) => ({ value: definition.id, label: definition.name })),
            ]}
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "invited", label: "Invited" },
              { value: "suspended", label: "Suspended" },
            ]}
          />
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        renderCard={(user) => (
          <div className="space-y-2">
            <p className="text-sm font-bold text-[#071A2B]">{user.fullName}</p>
            <p className="text-[11px] text-slate-500">{user.email}</p>
            <div className="flex items-center gap-2">
              <Badge tone="navy">{roleName(user.role)}</Badge>
              <Badge tone={user.status === "active" ? "mint" : user.status === "invited" ? "amber" : "rose"}>
                {user.status}
              </Badge>
            </div>
          </div>
        )}
        emptyState={<EmptyState icon={<Users2 className="h-9 w-9" />} title="No users match these filters" />}
      />

      <Notice tone="info" title="How invitations work">
        An invitation creates the account record and emails a one-time sign-in link through the
        configured authentication provider. Until the invite is accepted the account stays
        `invited` and cannot access any console route.
        {!isSupabaseConfigured && " This build has no authentication provider configured, so invitations are recorded locally only."}
      </Notice>

      <Modal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite a user"
        description="The account is created with this role and an invitation is sent to the address."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!invite.email.trim() || !invite.fullName.trim()}
              onClick={() => {
                workspace.users.create({
                  email: invite.email.trim(),
                  fullName: invite.fullName.trim(),
                  role: invite.role,
                  status: "invited",
                  invitedAt: new Date().toISOString(),
                  lastActiveAt: null,
                  avatarUrl: "",
                  notes: invite.notes,
                });
                setFlash(
                  `Invitation recorded for ${invite.email}${isSupabaseConfigured ? " — the provider will email the sign-in link." : " (local workspace; no provider configured)."}`
                );
                setInvite({ email: "", fullName: "", role: "writer", notes: "" });
                setInviteOpen(false);
              }}
            >
              Send invitation
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <TextInput
              value={invite.fullName}
              onChange={(event) => setInvite({ ...invite, fullName: event.target.value })}
            />
          </Field>
          <Field label="Work email" required>
            <TextInput
              type="email"
              value={invite.email}
              onChange={(event) => setInvite({ ...invite, email: event.target.value })}
            />
          </Field>
          <Field label="Role" className="sm:col-span-2" hint="Permissions come from the role definition.">
            <Select
              value={invite.role}
              onChange={(event) => setInvite({ ...invite, role: event.target.value as AdminRole })}
            >
              {rolesForSelect.map((definition) => (
                <option key={definition.id} value={definition.id}>
                  {definition.name} — {definition.description.slice(0, 60)}…
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <TextArea
              rows={2}
              value={invite.notes}
              onChange={(event) => setInvite({ ...invite, notes: event.target.value })}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        isOpen={editingUser !== null}
        onClose={() => setEditing(null)}
        title="Effective permissions"
        description={editingUser ? `${editingUser.fullName} · ${roleName(editingUser.role)}` : undefined}
        size="lg"
      >
        {editingUser && roleDefinitionForEditing && (
          <div className="space-y-4">
            <Notice tone="info" title="Role-based by design">
              Permissions come from the role definition shown below. Editing the role in
              “Roles & permissions” changes it for every account that holds it — no per-user
              overrides exist, so access stays auditable.
            </Notice>
            <div className="flex flex-wrap gap-1.5">
              {roleDefinitionForEditing.permissions.map((permission) => (
                <Badge key={permission} tone="mint">
                  {permission}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={removeTarget !== null}
        title="Remove this account?"
        message="The account record is removed from the workspace. Authored content stays intact and keeps its attribution."
        confirmLabel="Remove account"
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) workspace.users.remove(removeTarget);
          setRemoveTarget(null);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             ROLES & PERMISSIONS                            */
/* -------------------------------------------------------------------------- */

export function RolesPage() {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const canManage = can(profile, "roles.manage");

  const [selected, setSelected] = useState<AdminRole>("writer");
  const [flash, setFlash] = useState<string | null>(null);

  const stored = workspace.roles.items;
  const definition = ROLE_DEFINITIONS.find((role) => role.id === selected) ?? ROLE_DEFINITIONS[0];
  const storedRecord = stored.find((role) => role.role === selected);
  const effective = storedRecord?.permissions ?? definition.permissions;

  const grouped = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const permission of ALL_PERMISSIONS) {
      const group = permission.split(".")[0];
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(permission);
    }
    return Array.from(groups.entries());
  }, []);

  const toggle = (permission: string) => {
    if (!canManage) return;
    const next = effective.includes(permission)
      ? effective.filter((entry) => entry !== permission)
      : [...effective, permission];

    if (storedRecord) {
      workspace.roles.update(storedRecord.id, { permissions: next });
    } else {
      workspace.roles.create({
        id: definition.id,
        role: definition.id,
        name: definition.name,
        description: definition.description,
        permissions: next,
        isSystem: definition.isSystem,
      });
    }
    setFlash(`${definition.name} updated. Accounts holding this role see the change immediately.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & permissions"
        description="The matrix behind every permission check in the console. System roles keep the names the brief defines."
        badge={<Badge tone={canManage ? "mint" : "neutral"}>{canManage ? "editable" : "read only"}</Badge>}
      />

      {flash && <Notice tone="success">{flash}</Notice>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ROLE_DEFINITIONS.map((role) => {
          const record = stored.find((entry) => entry.role === role.id);
          const permissions = record?.permissions ?? role.permissions;
          const holders = workspace.users.items.filter((user) => user.role === role.id).length;
          const isActive = role.id === selected;
          return (
            <button
              key={role.id}
              onClick={() => setSelected(role.id)}
              className={`cursor-pointer rounded-2xl border p-4 text-left transition-colors ${
                isActive ? "border-[#7FFFD4] bg-[#7FFFD4]/10" : "border-[#071A2B]/15 hover:border-[#071A2B]/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#071A2B] text-[#7FFFD4]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                {record && <Badge tone="amber">customised</Badge>}
              </div>
              <p className="mt-2 text-sm font-bold text-[#071A2B]">{role.name}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {permissions.length} permissions · {holders} holder{holders === 1 ? "" : "s"}
              </p>
            </button>
          );
        })}
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#071A2B]">{definition.name}</h2>
            <p className="text-[11px] text-slate-500">{definition.description}</p>
          </div>
          {storedRecord && canManage && (
            <Button
              size="sm"
              variant="outline"
              icon={<X className="h-3.5 w-3.5" />}
              onClick={() => {
                workspace.roles.remove(storedRecord.id);
                setFlash(`${definition.name} reset to the shipped permission set.`);
              }}
            >
              Reset to default
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {grouped.map(([group, permissions]) => (
            <div key={group}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {group}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {permissions.map((permission) => {
                  const granted = effective.includes(permission);
                  return (
                    <button
                      key={permission}
                      onClick={() => toggle(permission)}
                      disabled={!canManage}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                        granted
                          ? "border-[#7FFFD4] bg-[#7FFFD4]/20 text-[#071A2B]"
                          : "border-[#071A2B]/12 text-slate-400"
                      } ${canManage ? "cursor-pointer hover:border-[#071A2B]/40" : "cursor-default"}`}
                    >
                      {granted ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {permission}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  SETTINGS                                  */
/* -------------------------------------------------------------------------- */

type SettingsTab =
  | "general"
  | "brand"
  | "seo"
  | "email"
  | "auth"
  | "publishing"
  | "media"
  | "integrations"
  | "people";

export function SettingsPage() {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const canManage = can(profile, "settings.manage");
  const [tab, setTab] = useState<SettingsTab>("general");
  const [draft, setDraft] = useState<SiteSettings>(workspace.settings);
  const [flash, setFlash] = useState<string | null>(null);

  const save = () => {
    void workspace.saveSettings(draft).then(() => {
      setFlash("Settings saved and written to the audit log.");
      window.setTimeout(() => setFlash(null), 4000);
    });
  };

  const disabled = !canManage;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configuration for the public site and the console. Values here are the same records the website reads — there is only one source of truth."
        badge={<Badge tone={canManage ? "mint" : "neutral"}>{canManage ? "editable" : "read only"}</Badge>}
        actions={
          canManage && (
            <Button size="sm" icon={<Check className="h-3.5 w-3.5" />} onClick={save}>
              Save settings
            </Button>
          )
        }
      >
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "general", label: "General" },
            { id: "brand", label: "Brand" },
            { id: "seo", label: "SEO" },
            { id: "email", label: "Email" },
            { id: "auth", label: "Authentication" },
            { id: "publishing", label: "Publishing" },
            { id: "media", label: "Media" },
            { id: "integrations", label: "Integrations" },
            { id: "people", label: "Users & permissions" },
          ]}
        />
      </PageHeader>

      {flash && <Notice tone="success">{flash}</Notice>}

      {tab === "general" && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#7FFFD4]" />
            <h2 className="text-sm font-bold text-[#071A2B]">General</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Site name">
              <TextInput
                value={draft.siteName}
                disabled={disabled}
                onChange={(event) => setDraft({ ...draft, siteName: event.target.value })}
              />
            </Field>
            <Field label="Slogan">
              <TextInput
                value={draft.slogan}
                disabled={disabled}
                onChange={(event) => setDraft({ ...draft, slogan: event.target.value })}
              />
            </Field>
            <Field label="Contact email">
              <TextInput
                type="email"
                value={draft.contactEmail}
                disabled={disabled}
                onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })}
              />
            </Field>
            <Field label="Primary navigation" hint="Public header links — unchanged unless edited here.">
              <TextInput
                value={draft.navLinks.map((link) => `${link.label}=${link.href}`).join(", ")}
                disabled={disabled}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    navLinks: event.target.value
                      .split(",")
                      .map((entry) => entry.trim())
                      .filter(Boolean)
                      .map((entry) => {
                        const [label, href = "#"] = entry.split("=");
                        return { label: label.trim(), href: href.trim() };
                      }),
                  })
                }
              />
            </Field>
          </div>
        </Card>
      )}

      {tab === "brand" && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[#7FFFD4]" />
            <h2 className="text-sm font-bold text-[#071A2B]">Brand</h2>
          </div>
          <Notice tone="info" title="Brand assets are fixed in code">
            The NexTake wordmark, colour tokens (<span className="font-mono">#071A2B</span> navy and{" "}
            <span className="font-mono">#7FFFD4</span> mint) and typography live in the design
            system, not in editable settings, so a settings change can never break the published
            brand. Logo and social-image uploads for individual stories live in the Media library
            and each article's SEO tab.
          </Notice>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Hero headline">
              <TextArea
                rows={2}
                value={draft.heroHeadline}
                disabled={disabled}
                onChange={(event) => setDraft({ ...draft, heroHeadline: event.target.value })}
              />
            </Field>
            <Field label="Hero subhead" className="sm:col-span-2">
              <TextArea
                rows={2}
                value={draft.heroSubhead}
                disabled={disabled}
                onChange={(event) => setDraft({ ...draft, heroSubhead: event.target.value })}
              />
            </Field>
          </div>
        </Card>
      )}

      {tab === "seo" && (
        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-bold text-[#071A2B]">SEO defaults</h2>
          <Notice tone="info" title="Per-story SEO lives on the story">
            Slugs, meta titles, meta descriptions and Open Graph images are edited on each article
            (SEO & discovery tab) and on each startup dossier (SEO section). These fields cover the
            site-wide fallbacks.
          </Notice>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Default meta title pattern">
              <TextInput defaultValue={`${workspace.settings.siteName} — {title}`} disabled={disabled} />
            </Field>
            <Field label="Default meta description">
              <TextInput value={draft.slogan} disabled={disabled} onChange={(event) => setDraft({ ...draft, slogan: event.target.value })} />
            </Field>
          </div>
        </Card>
      )}

      {tab === "email" && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#7FFFD4]" />
            <h2 className="text-sm font-bold text-[#071A2B]">Email & newsletter</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Daily Edit subject">
              <TextInput
                value={draft.dailyEditSubject}
                disabled={disabled}
                onChange={(event) => setDraft({ ...draft, dailyEditSubject: event.target.value })}
              />
            </Field>
            <Field label="Newsletter headline">
              <TextInput
                value={draft.newsletterHeadline}
                disabled={disabled}
                onChange={(event) => setDraft({ ...draft, newsletterHeadline: event.target.value })}
              />
            </Field>
          </div>
          <Notice tone="warning" title="Provider credentials are never stored in settings">
            SMTP/API keys for the email provider are read from server-side environment variables,
            not from this screen and not from the browser bundle.
          </Notice>
        </Card>
      )}

      {tab === "auth" && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-[#7FFFD4]" />
            <h2 className="text-sm font-bold text-[#071A2B]">Authentication</h2>
          </div>
          <div className="rounded-2xl border border-[#071A2B]/12 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#071A2B]">Provider</p>
                <p className="text-[11px] text-slate-500">
                  {isSupabaseConfigured
                    ? "Supabase Auth — password plus one-time code."
                    : "No provider configured — local demo sign-in for this build."}
                </p>
              </div>
              <Badge tone={isSupabaseConfigured ? "mint" : "amber"}>
                {isSupabaseConfigured ? "configured" : "demo"}
              </Badge>
            </div>
            <ul className="mt-3 space-y-1 text-[11px] text-slate-600">
              <li className="flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5" /> Passwords are hashed by the auth provider — the
                console never sees or stores them.
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-3.5 w-3.5" /> Admin routes render only for an authenticated
                profile; unauthenticated visitors get the sign-in screen.
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Role checks run through{" "}
                <span className="font-mono">can()</span> against the permission matrix.
              </li>
            </ul>
          </div>
          <Notice tone="info" title="Rotation and secrets">
            Service keys, database URLs and provider secrets are supplied through environment
            variables on the server. Nothing on this screen can expose them.
          </Notice>
        </Card>
      )}

      {tab === "publishing" && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-[#7FFFD4]" />
            <h2 className="text-sm font-bold text-[#071A2B]">Publishing</h2>
          </div>
          <label className="flex items-center justify-between rounded-xl border border-[#071A2B]/12 p-3.5">
            <span>
              <span className="block text-xs font-bold text-[#071A2B]">Breaking banner</span>
              <span className="text-[11px] text-slate-500">Show the breaking strip on the public site.</span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#071A2B]"
              checked={draft.breakingEnabled}
              disabled={disabled}
              onChange={(event) => setDraft({ ...draft, breakingEnabled: event.target.checked })}
            />
          </label>
          {draft.breakingEnabled && (
            <Field label="Breaking label">
              <TextInput
                value={draft.breakingLabel}
                disabled={disabled}
                onChange={(event) => setDraft({ ...draft, breakingLabel: event.target.value })}
              />
            </Field>
          )}
          <label className="flex items-center justify-between rounded-xl border border-[#071A2B]/12 p-3.5">
            <span>
              <span className="block text-xs font-bold text-[#071A2B]">Daily Edit email</span>
              <span className="text-[11px] text-slate-500">Queue the newsletter from homepage placements.</span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#071A2B]"
              checked={draft.dailyEditEnabled}
              disabled={disabled}
              onChange={(event) => setDraft({ ...draft, dailyEditEnabled: event.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-[#071A2B]/12 p-3.5">
            <span>
              <span className="block text-xs font-bold text-[#071A2B]">Newsletter signup</span>
              <span className="text-[11px] text-slate-500">Show the subscribe block on the public site.</span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#071A2B]"
              checked={draft.newsletterEnabled}
              disabled={disabled}
              onChange={(event) => setDraft({ ...draft, newsletterEnabled: event.target.checked })}
            />
          </label>
        </Card>
      )}

      {tab === "media" && (
        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-bold text-[#071A2B]">Media</h2>
          <Notice tone="info" title="Video is out of scope by design">
            Video production, upload and distribution are handled by NexTake's separate video
            system. This console stores article images, dossier logos and other still assets only —
            no video files are accepted, stored or published here.
          </Notice>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Assets" value={workspace.media.items.length} />
            <StatCard label="Images" value={workspace.media.items.filter((asset) => asset.kind === "image").length} />
            <StatCard
              label="Storage mode"
              value={workspace.backendMode === "supabase" ? "bucket" : "local"}
              icon={<Database className="h-3.5 w-3.5" />}
            />
          </div>
        </Card>
      )}

      {tab === "integrations" && (
        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-bold text-[#071A2B]">Integrations</h2>
          <div className="space-y-3">
            {[
              {
                name: "Supabase",
                detail: "Content, intelligence records and authentication.",
                state: isSupabaseConfigured ? "connected" : "not configured",
              },
              {
                name: "Public site tracker",
                detail: "Receives view/share events from the website.",
                state: `${workspace.engagement.items.length} events stored`,
              },
              {
                name: "Email provider",
                detail: "Delivers newsletter campaigns.",
                state: "endpoint required",
              },
            ].map((integration) => (
              <div
                key={integration.name}
                className="flex flex-col gap-1 rounded-xl border border-[#071A2B]/12 p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-[#071A2B]">{integration.name}</p>
                  <p className="text-[11px] text-slate-500">{integration.detail}</p>
                </div>
                <Badge tone={integration.state === "connected" ? "mint" : "neutral"}>
                  {integration.state}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "people" && (
        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-bold text-[#071A2B]">Users & permissions</h2>
          <p className="text-[11px] text-slate-500">
            Account administration lives in its own sections so this screen never becomes a second
            source of truth.
          </p>
          <RowActions>
            <Button size="sm" variant="outline" icon={<Users2 className="h-3.5 w-3.5" />} onClick={() => setTab("general")}>
              Users are managed under System → Users
            </Button>
            <Button size="sm" variant="outline" icon={<ShieldCheck className="h-3.5 w-3.5" />} onClick={() => setTab("general")}>
              Roles are managed under System → Roles
            </Button>
          </RowActions>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Accounts" value={workspace.users.items.length} />
            <StatCard label="Roles" value={ROLE_DEFINITIONS.length} />
            <StatCard label="Permissions" value={ALL_PERMISSIONS.length} />
            <StatCard label="Admins" value={workspace.users.items.filter((user) => user.role === "admin").length} />
          </div>
        </Card>
      )}

      {!canManage && (
        <Notice tone="warning" title="Read-only view">
          Your role can view settings but not change them. Ask an administrator for the{" "}
          <span className="font-mono">settings.manage</span> permission.
        </Notice>
      )}

      <Card className="space-y-2 p-5">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-[#7FFFD4]" />
          <h2 className="text-sm font-bold text-[#071A2B]">Danger zone</h2>
        </div>
        <p className="text-[11px] text-slate-500">
          Restoring the sample workspace clears locally stored console records only. Production rows
          in the database are never deleted by anything on this screen.
        </p>
        <Button
          size="sm"
          variant="danger"
          icon={<Trash2 className="h-3.5 w-3.5" />}
          disabled={!canManage}
          onClick={() => {
            workspace.resetWorkspace();
            setFlash("Local workspace restored to the shipped sample set.");
          }}
        >
          Restore sample workspace (local only)
        </Button>
      </Card>
    </div>
  );
}
