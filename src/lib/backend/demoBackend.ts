import { DEMO_ARTICLES, DEMO_COMPANIES } from "../../data/demoArticles";
import type {
  ActivityItem,
  AdminProfile,
  Article,
  ArticleInput,
  Company,
  SiteSettings,
} from "../../types";
import { DEFAULT_SETTINGS } from "./mappers";
import {
  fail,
  ok,
  type Backend,
  type BackendResult,
  type VerificationDispatch,
} from "./types";
import { relativeTime } from "./utils";

/**
 * Local demo backend.
 *
 * Used only when no Supabase project is configured, so the console stays
 * usable (and reviewable) offline. It deliberately stores no passwords: sign
 * in accepts any well-formed email plus an 8+ character password, then mails a
 * code to a local "outbox" that the UI surfaces in a demo panel.
 */

const KEY_ARTICLES = "nextake.demo.articles";
const KEY_SETTINGS = "nextake.demo.settings";
const KEY_SESSION = "nextake.demo.session";
const KEY_ACTIVITY = "nextake.demo.activity";
const KEY_CODE = "nextake.demo.code";
const KEY_SUBSCRIBERS = "nextake.demo.subscribers";

/** Demo codes are short-lived so the outbox panel is easy to reason about. */
const DEMO_CODE_TTL_SECONDS = 600;

interface DemoSession {
  id: string;
  email: string;
  expiresAt: number;
}

interface DemoCode {
  email: string;
  code: string;
  expiresAt: number;
}

const listeners = new Set<(profile: AdminProfile | null) => void>();

function emit() {
  const profile = readSessionProfile();
  listeners.forEach((listener) => listener(profile));
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — demo data stays in memory for the session */
  }
}

function readArticles(): Article[] {
  const stored = read<Article[] | null>(KEY_ARTICLES, null);
  if (stored && stored.length > 0) return stored;
  write(KEY_ARTICLES, DEMO_ARTICLES);
  return DEMO_ARTICLES;
}

function readSession(): DemoSession | null {
  const session = read<DemoSession | null>(KEY_SESSION, null);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    window.localStorage.removeItem(KEY_SESSION);
    return null;
  }
  return session;
}

function readSessionProfile(): AdminProfile | null {
  const session = readSession();
  if (!session) return null;
  return profileFromEmail(session.email, session.id);
}

function profileFromEmail(email: string, id: string): AdminProfile {
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ") ?? "Editor";
  return {
    id,
    email,
    fullName: local.replace(/\b\w/g, (c) => c.toUpperCase()),
    role: "admin",
    avatarUrl: null,
  };
}

function demoArticleFromInput(
  input: ArticleInput,
  id: string,
  actor: string
): Article {
  const now = new Date().toISOString();
  return {
    ...input,
    id,
    category: input.category,
    excerpt: input.summary,
    content: input.syndicatedBody ?? "",
    author: input.originalAuthor ?? actor,
    date: now,
    readTime: input.readTime,
    avatar: "",
    image: input.coverImageUrl,
    views: 0,
    createdAt: now,
    updatedAt: now,
    updatedBy: actor,
  };
}

function pushActivity(entry: Omit<ActivityItem, "id" | "timestamp">) {
  const items = read<ActivityItem[]>(KEY_ACTIVITY, []);
  const next: ActivityItem[] = [
    { ...entry, id: `act-${Date.now()}`, timestamp: relativeTime(new Date().toISOString()) },
    ...items,
  ].slice(0, 25);
  write(KEY_ACTIVITY, next);
}

const COMPANY_LIST: Company[] = DEMO_COMPANIES;

export const demoBackend: Backend = {
  mode: "demo",

  auth: {
    async getProfile() {
      return readSessionProfile();
    },

    async signInWithPassword(email, password) {
      // Local stand-in for the provider's password check.
      await delay(450);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return fail("That email and password combination is not recognised.");
      }
      if (password.length < 8) {
        return fail("That email and password combination is not recognised.");
      }
      return ok(null);
    },

    async sendVerificationCode(email): Promise<BackendResult<VerificationDispatch>> {
      await delay(500);
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const record: DemoCode = {
        email,
        code,
        expiresAt: Date.now() + DEMO_CODE_TTL_SECONDS * 1000,
      };
      write(KEY_CODE, record);
      return ok({
        expiresInSeconds: DEMO_CODE_TTL_SECONDS,
        devCode: code,
      });
    },

    async verifyCode(email, code) {
      await delay(400);
      const record = read<DemoCode | null>(KEY_CODE, null);
      if (!record || record.email !== email) {
        return fail("Request a new verification code to continue.");
      }
      if (record.expiresAt < Date.now()) {
        return fail("That verification code has expired. Request a new one.");
      }
      if (record.code !== code.trim()) {
        return fail("That code is incorrect. Check the email and try again.");
      }

      const session: DemoSession = {
        id: `demo-${Math.random().toString(36).slice(2, 10)}`,
        email,
        expiresAt: Date.now() + 12 * 60 * 60 * 1000,
      };
      write(KEY_SESSION, session);
      window.localStorage.removeItem(KEY_CODE);
      emit();
      return ok(profileFromEmail(email, session.id));
    },

    async verifyEmailLink() {
      return fail("Email links are not available in demo mode.");
    },

    async signOut() {
      window.localStorage.removeItem(KEY_SESSION);
      emit();
    },

    onChange(listener) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === KEY_SESSION) emit();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
  },

  articles: {
    async list() {
      await delay(250);
      return ok(readArticles());
    },

    async listPublished() {
      await delay(200);
      const now = Date.now();
      return ok(
        readArticles()
          .filter(
            (article) =>
              article.status === "published" &&
              (!article.publishedAt ||
                new Date(article.publishedAt).getTime() <= now)
          )
          .sort(
            (a, b) =>
              new Date(b.publishedAt ?? b.createdAt ?? "").getTime() -
              new Date(a.publishedAt ?? a.createdAt ?? "").getTime()
          )
      );
    },

    async create(input, actor) {
      await delay(400);
      const articles = readArticles();
      const article = demoArticleFromInput(
        input,
        `demo-${Math.random().toString(36).slice(2, 10)}`,
        actor
      );
      write(KEY_ARTICLES, [article, ...articles]);
      pushActivity({
        action: article.status === "published" ? "Published article" : "Created article",
        target: article.title,
        user: actor,
        type: "publish",
      });
      return ok(article);
    },

    async update(id, input, actor) {
      await delay(400);
      const articles = readArticles();
      const index = articles.findIndex((article) => article.id === id);
      if (index === -1) return fail("That article no longer exists.");

      const updated: Article = {
        ...articles[index],
        ...input,
        updatedAt: new Date().toISOString(),
        updatedBy: actor,
      };
      articles[index] = updated;
      write(KEY_ARTICLES, articles);
      pushActivity({
        action: "Updated article",
        target: updated.title,
        user: actor,
        type: "edit",
      });
      return ok(updated);
    },

    async remove(id) {
      await delay(300);
      const articles = readArticles();
      const target = articles.find((article) => article.id === id);
      write(
        KEY_ARTICLES,
        articles.filter((article) => article.id !== id)
      );
      if (target) {
        pushActivity({
          action: "Removed article",
          target: target.title,
          user: "current admin",
          type: "system",
        });
      }
      return ok(null);
    },
  },

  companies: {
    async list() {
      await delay(150);
      return ok(COMPANY_LIST);
    },
  },

  settings: {
    async get() {
      await delay(150);
      return ok(read<SiteSettings>(KEY_SETTINGS, DEFAULT_SETTINGS));
    },

    async update(settings) {
      await delay(300);
      write(KEY_SETTINGS, settings);
      return ok(settings);
    },
  },

  activity: {
    async list() {
      await delay(150);
      return ok(read<ActivityItem[]>(KEY_ACTIVITY, []));
    },
  },

  newsletter: {
    async subscribe(email, frequency) {
      await delay(400);
      const list = read<Array<{ email: string; frequency: string }>>(
        KEY_SUBSCRIBERS,
        []
      );
      const normalised = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalised)) {
        return fail("Enter a valid email address.");
      }
      write(KEY_SUBSCRIBERS, [
        ...list.filter((entry) => entry.email !== normalised),
        { email: normalised, frequency },
      ]);
      return ok(null);
    },

    async count() {
      await delay(120);
      return ok(read<Array<{ email: string }>>(KEY_SUBSCRIBERS, []).length);
    },
  },

  storage: {
    async upload(file, _folder) {
      await delay(500);
      try {
        const url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("read-failed"));
          reader.readAsDataURL(file);
        });
        return ok({ url });
      } catch {
        return fail("That image could not be read. Try a smaller file.");
      }
    },
  },
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
