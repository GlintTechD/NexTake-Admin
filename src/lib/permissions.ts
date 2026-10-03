/**
 * Role-based access control for the NexTake console.
 *
 * The permission matrix is deliberately data-only (no UI knowledge) so the same
 * list can be sent to the backend / RLS policies. Administrative and destructive
 * operations are gated through `can()` — never through hard-coded role checks
 * inside components.
 */

import type { AdminRole, RoleDefinition } from "./workspace/types";
import type { AdminProfile } from "../types";

export type Permission =
  | "dashboard.view"
  | "articles.view"
  | "articles.create"
  | "articles.edit"
  | "articles.edit_any"
  | "articles.review"
  | "articles.publish"
  | "articles.schedule"
  | "articles.delete"
  | "articles.archive"
  | "interviews.manage"
  | "shorts.manage"
  | "sources.view"
  | "sources.manage"
  | "claims.verify"
  | "media.view"
  | "media.manage"
  | "startups.view"
  | "startups.manage"
  | "people.view"
  | "people.manage"
  | "companies.manage"
  | "industries.manage"
  | "events.manage"
  | "relationships.view"
  | "suggestions.decide"
  | "homepage.manage"
  | "newsletter.view"
  | "newsletter.manage"
  | "newsletter.send"
  | "analytics.view"
  | "activity.view"
  | "users.view"
  | "users.manage"
  | "roles.manage"
  | "settings.view"
  | "settings.manage";

export const ALL_PERMISSIONS: Permission[] = [
  "dashboard.view",
  "articles.view",
  "articles.create",
  "articles.edit",
  "articles.edit_any",
  "articles.review",
  "articles.publish",
  "articles.schedule",
  "articles.delete",
  "articles.archive",
  "interviews.manage",
  "shorts.manage",
  "sources.view",
  "sources.manage",
  "claims.verify",
  "media.view",
  "media.manage",
  "startups.view",
  "startups.manage",
  "people.view",
  "people.manage",
  "companies.manage",
  "industries.manage",
  "events.manage",
  "relationships.view",
  "suggestions.decide",
  "homepage.manage",
  "newsletter.view",
  "newsletter.manage",
  "newsletter.send",
  "analytics.view",
  "activity.view",
  "users.view",
  "users.manage",
  "roles.manage",
  "settings.view",
  "settings.manage",
];

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: "admin",
    name: "Admin",
    description:
      "Full control of the console, including users, roles, settings and destructive actions.",
    permissions: ALL_PERMISSIONS,
    isSystem: true,
  },
  {
    id: "editor_in_chief",
    name: "Editor-in-Chief",
    description:
      "Owns the editorial line: approves and publishes anything, manages the team's roles and publishing settings.",
    permissions: ALL_PERMISSIONS.filter(
      (permission) => !permission.startsWith("roles.")
    ),
    isSystem: true,
  },
  {
    id: "managing_editor",
    name: "Managing Editor",
    description:
      "Runs the daily queue: reviews, schedules, publishes, keeps the homepage and newsletter on track.",
    permissions: [
      "dashboard.view",
      "articles.view",
      "articles.create",
      "articles.edit",
      "articles.edit_any",
      "articles.review",
      "articles.publish",
      "articles.schedule",
      "articles.archive",
      "interviews.manage",
      "shorts.manage",
      "sources.view",
      "sources.manage",
      "media.view",
      "media.manage",
      "startups.view",
      "startups.manage",
      "people.view",
      "people.manage",
      "companies.manage",
      "industries.manage",
      "events.manage",
      "relationships.view",
      "suggestions.decide",
      "homepage.manage",
      "newsletter.view",
      "newsletter.manage",
      "analytics.view",
      "activity.view",
      "users.view",
      "settings.view",
    ],
    isSystem: true,
  },
  {
    id: "editor",
    name: "Editor",
    description:
      "Writes and edits stories, builds relationships, and submits work for review.",
    permissions: [
      "dashboard.view",
      "articles.view",
      "articles.create",
      "articles.edit",
      "articles.edit_any",
      "articles.review",
      "interviews.manage",
      "shorts.manage",
      "sources.view",
      "sources.manage",
      "media.view",
      "media.manage",
      "startups.view",
      "people.view",
      "people.manage",
      "companies.manage",
      "industries.manage",
      "events.manage",
      "relationships.view",
      "suggestions.decide",
      "analytics.view",
      "activity.view",
    ],
    isSystem: true,
  },
  {
    id: "writer",
    name: "Writer",
    description:
      "Drafts articles and interviews and submits them to the editorial queue.",
    permissions: [
      "dashboard.view",
      "articles.view",
      "articles.create",
      "articles.edit",
      "interviews.manage",
      "shorts.manage",
      "sources.view",
      "media.view",
      "media.manage",
      "startups.view",
      "people.view",
      "relationships.view",
      "suggestions.decide",
    ],
    isSystem: true,
  },
  {
    id: "researcher",
    name: "Researcher",
    description:
      "Builds intelligence records: startup dossiers, people, industries, events and sources.",
    permissions: [
      "dashboard.view",
      "articles.view",
      "articles.edit",
      "sources.view",
      "sources.manage",
      "media.view",
      "startups.view",
      "startups.manage",
      "people.view",
      "people.manage",
      "companies.manage",
      "industries.manage",
      "events.manage",
      "relationships.view",
      "suggestions.decide",
      "analytics.view",
    ],
    isSystem: true,
  },
  {
    id: "fact_checker",
    name: "Fact Checker",
    description:
      "Verifies claims, links them to sources and approves or annotates records.",
    permissions: [
      "dashboard.view",
      "articles.view",
      "articles.edit",
      "articles.review",
      "sources.view",
      "sources.manage",
      "claims.verify",
      "media.view",
      "startups.view",
      "people.view",
      "relationships.view",
      "suggestions.decide",
      "activity.view",
    ],
    isSystem: true,
  },
  {
    id: "analyst",
    name: "Analyst",
    description:
      "Read-heavy access to intelligence records, analytics and the activity trail.",
    permissions: [
      "dashboard.view",
      "articles.view",
      "sources.view",
      "media.view",
      "startups.view",
      "people.view",
      "relationships.view",
      "analytics.view",
      "activity.view",
    ],
    isSystem: true,
  },
];

const ROLE_MAP: Record<AdminRole, RoleDefinition> = ROLE_DEFINITIONS.reduce(
  (accumulator, role) => {
    accumulator[role.id] = role;
    return accumulator;
  },
  {} as Record<AdminRole, RoleDefinition>
);

export function roleDefinition(role: AdminRole): RoleDefinition {
  return ROLE_MAP[role] ?? ROLE_MAP.admin;
}

export function roleName(role: AdminRole): string {
  return roleDefinition(role).name;
}

/** Roles a given role is allowed to assign (admins assign anything). */
export function assignableRoles(actor: AdminRole): RoleDefinition[] {
  if (actor === "admin") return ROLE_DEFINITIONS;
  if (actor === "editor_in_chief") {
    return ROLE_DEFINITIONS.filter((role) => role.id !== "admin");
  }
  return [];
}

export function permissionsFor(role: AdminRole): Permission[] {
  return roleDefinition(role).permissions as Permission[];
}

export function can(
  profile: Pick<AdminProfile, "role"> | null | undefined,
  permission: Permission
): boolean {
  if (!profile) return false;
  const definition = ROLE_MAP[profile.role as AdminRole] ?? ROLE_MAP.admin;
  return (
    definition.permissions.includes("*") ||
    definition.permissions.includes(permission)
  );
}

/** Convenience for lists of permissions — true when *any* is granted. */
export function canAny(
  profile: Pick<AdminProfile, "role"> | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => can(profile, permission));
}
