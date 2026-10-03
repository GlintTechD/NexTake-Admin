/**
 * Local-first persistence for workspace collections.
 *
 * NexTake ships with a Supabase backend, but a workspace (or a sandbox review)
 * may not have the newer intelligence tables provisioned yet. This module keeps
 * every collection readable/writable in the browser and lets the Supabase
 * adapter shadow it when the matching table exists — so nothing in the console
 * ever dead-ends with "table not found".
 */

import type { BaseRecord, WorkspaceCollection } from "./types";

const PREFIX = "nextake.cms.v1.";

type Listener = () => void;

export interface LocalCollection<T> {
  key: string;
  read(): T[];
  write(items: T[]): void;
  subscribe(listener: Listener): () => void;
}

const listeners = new Map<string, Set<Listener>>();

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

export function storageKey(collection: WorkspaceCollection | string): string {
  return `${PREFIX}${collection}`;
}

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    notify(key);
    return true;
  } catch {
    return false;
  }
}

export function removeLocal(key: string) {
  try {
    window.localStorage.removeItem(key);
    notify(key);
  } catch {
    /* storage unavailable */
  }
}

/** Create (and cache) the local backing store for one collection. */
export function localCollection<T>(
  collection: WorkspaceCollection,
  seed: () => T[]
): LocalCollection<T> {
  const key = storageKey(collection);

  return {
    key,
    read() {
      const existing = readLocal<T[] | null>(key, null);
      if (existing && Array.isArray(existing)) return existing;

      const initial = seed();
      writeLocal(key, initial);
      return initial;
    },
    write(items) {
      writeLocal(key, items);
    },
    subscribe(listener) {
      const bucket = listeners.get(key) ?? new Set<Listener>();
      bucket.add(listener);
      listeners.set(key, bucket);

      return () => {
        bucket.delete(listener);
        if (bucket.size === 0) listeners.delete(key);
      };
    },
  };
}

export function subscribeToKey(key: string, listener: Listener): () => void {
  const bucket = listeners.get(key) ?? new Set<Listener>();
  bucket.add(listener);
  listeners.set(key, bucket);

  return () => {
    bucket.delete(listener);
    if (bucket.size === 0) listeners.delete(key);
  };
}

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

export function newId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}${random}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Fields every workspace record shares — filled in by the provider. */
export function baseFields(
  actor: string,
  origin: BaseRecord["origin"] = "live"
): Omit<BaseRecord, "id"> {
  const at = nowIso();
  return {
    createdAt: at,
    updatedAt: at,
    createdBy: actor,
    updatedBy: actor,
    origin,
  };
}

/**
 * One-time migration of the legacy article store into the workspace so admins
 * who used the previous console do not lose drafts when the new shell ships.
 */
export function migrateLegacyStores(): void {
  try {
    const legacyArticles = window.localStorage.getItem("nextake_articles_db");
    const targetKey = storageKey("legacy-articles");

    if (legacyArticles && !window.localStorage.getItem(targetKey)) {
      window.localStorage.setItem(targetKey, legacyArticles);
    }
  } catch {
    /* storage unavailable — nothing to migrate */
  }
}

export function readLegacyArticles<T>(): T[] | null {
  try {
    const raw =
      window.localStorage.getItem("nextake_articles_db") ??
      window.localStorage.getItem("nextake.demo.articles");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

export function clearWorkspaceStorage(collections: WorkspaceCollection[]) {
  for (const collection of collections) {
    removeLocal(storageKey(collection));
  }
}

export function exportWorkspace(collections: WorkspaceCollection[]): string {
  const payload: Record<string, unknown> = {
    exportedAt: nowIso(),
    version: 1,
  };
  for (const collection of collections) {
    payload[collection] = readLocal(storageKey(collection), []);
  }
  return JSON.stringify(payload, null, 2);
}
