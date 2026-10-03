/**
 * Persistence adapters for workspace collections.
 *
 * NexTake already talks to Supabase through `lib/backend`. The intelligence,
 * relationship and system collections added by this extension follow the same
 * pattern:
 *
 *   1. Preferred: the matching Supabase table (see
 *      `supabase/migrations/20261003_nextake_intelligence.sql`).
 *   2. Fallback: the local workspace store, so an environment that has not run
 *      the migration yet still works — and says so in the UI instead of
 *      silently dropping writes.
 *
 * Nothing here invents data: a table that cannot be reached is reported as
 * `local-fallback`, never mocked up as a successful query.
 */

import { supabase } from "../supabase";
import { isSupabaseConfigured } from "../config";
import type { BaseRecord, CollectionHealth, WorkspaceCollection } from "./types";
import { readLocal, storageKey, writeLocal } from "./localStore";

type Row = Record<string, unknown>;

/** Supabase table backing each collection. */
export const COLLECTION_TABLES: Record<WorkspaceCollection, string> = {
  startups: "startups",
  people: "people",
  companies: "companies",
  industries: "industries",
  events: "events",
  sources: "sources",
  claims: "claims",
  media: "media_assets",
  suggestions: "relationship_suggestions",
  campaigns: "newsletter_campaigns",
  subscribers: "newsletter_subscribers",
  engagement: "engagement_events",
  audit: "audit_events",
  users: "admin_users",
  roles: "admin_roles",
  taxonomy: "taxonomy_terms",
};

/** Collections that keep their own shape / dedicated API. */
export const NON_GENERIC_COLLECTIONS: WorkspaceCollection[] = ["subscribers", "roles"];

const camelToSnake = (value: string): string =>
  value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const snakeToCamel = (value: string): string =>
  value.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());

/** Record → database row (camelCase → snake_case, arrays/objects stay JSON). */
export function toRow<T extends BaseRecord>(record: T): Row {
  const row: Row = {};
  for (const [key, value] of Object.entries(record)) {
    row[camelToSnake(key)] = value === undefined ? null : value;
  }
  return row;
}

/** Database row → record. */
export function fromRow<T extends BaseRecord>(row: Row): T {
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    record[snakeToCamel(key)] = value;
  }
  return record as T;
}

export interface RemoteLoadResult<T> {
  items: T[] | null;
  mode: CollectionHealth["mode"];
  message: string;
}

/**
 * Load a collection from Supabase. Returns `items: null` when the table is not
 * available so the caller can fall back to local storage.
 */
export async function loadRemoteCollection<T extends BaseRecord>(
  collection: WorkspaceCollection
): Promise<RemoteLoadResult<T>> {
  if (!isSupabaseConfigured) {
    return {
      items: null,
      mode: "local",
      message: "Local workspace — no database configured for this environment.",
    };
  }

  const table = COLLECTION_TABLES[collection];

  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return {
        items: null,
        mode: "local-fallback",
        message: `Table “${table}” is not reachable (${error.message}). Records are kept in this browser until the migration is applied.`,
      };
    }

    const items = (data ?? []).map((row) => fromRow<T>(row as Row));

    return {
      items,
      mode: "database",
      message: `Loaded from Supabase table “${table}”.`,
    };
  } catch (error) {
    return {
      items: null,
      mode: "local-fallback",
      message: `Could not reach “${table}” (${
        error instanceof Error ? error.message : "network error"
      }). Records are kept in this browser.`,
    };
  }
}

export interface RemoteWriteResult {
  ok: boolean;
  message?: string;
}

/** Best-effort write-through of a single record. */
export async function writeRemoteRecord<T extends BaseRecord>(
  collection: WorkspaceCollection,
  record: T
): Promise<RemoteWriteResult> {
  if (!isSupabaseConfigured) return { ok: false, message: "local" };

  const table = COLLECTION_TABLES[collection];

  try {
    const { error } = await supabase.from(table).upsert(toRow(record), { onConflict: "id" });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "network error",
    };
  }
}

export async function deleteRemoteRecord(
  collection: WorkspaceCollection,
  id: string
): Promise<RemoteWriteResult> {
  if (!isSupabaseConfigured) return { ok: false, message: "local" };

  const table = COLLECTION_TABLES[collection];

  try {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "network error",
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                              LOCAL HELPERS                                 */
/* -------------------------------------------------------------------------- */

export function readLocalCollection<T>(collection: WorkspaceCollection): T[] | null {
  const stored = readLocal<T[] | null>(storageKey(collection), null);
  return Array.isArray(stored) ? stored : null;
}

export function writeLocalCollection<T>(collection: WorkspaceCollection, items: T[]): void {
  writeLocal(storageKey(collection), items);
}

export function initialHealth(collection: WorkspaceCollection): CollectionHealth {
  return {
    collection,
    mode: isSupabaseConfigured ? "database" : "local",
    message: isSupabaseConfigured
      ? "Connecting to the NexTake database…"
      : "Local workspace — records stay in this browser.",
  };
}
