import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { INITIAL_ARTICLES } from "../data/initialData";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    typeof supabaseUrl === "string" &&
    supabaseUrl.startsWith("http")
);

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export interface ArticleRow {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  status: "published" | "draft" | "scheduled";
  views: number;
  read_time: string;
  avatar: string;
  image: string;
  is_new?: boolean;
  created_at: string;
  hero_priority?: number | null;
}

export interface ArticleInsert {
  id?: string;
  category: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  status: "published" | "draft" | "scheduled";
  views: number;
  read_time: string;
  avatar: string;
  image: string;
  is_new?: boolean;
  created_at?: string;
}

export interface DailyTipRow {
  id: string;
  title: string;
  content: string;
  category: string;
  image: string | null;
  author: string | null;
  status: "published" | "draft";
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyTipInsert {
  id?: string;
  title: string;
  content: string;
  category: string;
  image?: string | null;
  author?: string | null;
  status: "published" | "draft";
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

type DatabaseRow = ArticleRow | DailyTipRow;

type DatabaseInsert = ArticleInsert | DailyTipInsert;

type QueryResult = {
  data: DatabaseRow[] | null;
  error: Error | null;
};

type SingleQueryResult = {
  data: DatabaseRow | null;
  error: Error | null;
};

export interface QueryBuilder {
  select(columns?: string): QueryBuilder;

  eq(column: string, value: unknown): QueryBuilder;

  order(
    column: string,
    options?: {
      ascending?: boolean;
    }
  ): QueryBuilder;

  insert(data: DatabaseInsert | DatabaseInsert[]): QueryBuilder;

  update(data: Partial<ArticleRow> | Partial<DailyTipRow>): QueryBuilder;

  delete(): QueryBuilder;

  single(): Promise<SingleQueryResult>;

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null
  ): Promise<TResult1 | TResult2>;
}

export type NexTakeSupabaseClient = SupabaseClient;

/* -------------------------------------------------------------------------- */
/*                              LOCAL STORAGE                                 */
/* -------------------------------------------------------------------------- */

const ARTICLES_STORAGE_KEY = "nextake_articles_db";
const DAILY_TIPS_STORAGE_KEY = "nextake_daily_tips_db";

function getLocalArticles(): ArticleRow[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = localStorage.getItem(ARTICLES_STORAGE_KEY);

      if (saved) {
        return JSON.parse(saved) as ArticleRow[];
      }
    }
  } catch {
    // Ignore localStorage errors
  }

  const initial: ArticleRow[] = INITIAL_ARTICLES.map((article, index) => ({
    id: article.id,
    category: article.category,
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    author: article.author,
    date: article.date,
    status: article.status,
    views: article.views,
    read_time: article.readTime,
    avatar: article.avatar,
    image: article.image,
    is_new: article.isNew,
    created_at: new Date(
      Date.now() - index * 86400000
    ).toISOString(),
  }));

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(
        ARTICLES_STORAGE_KEY,
        JSON.stringify(initial)
      );
    }
  } catch {
    // Ignore localStorage errors
  }

  return initial;
}

function saveLocalArticles(items: ArticleRow[]): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(
        ARTICLES_STORAGE_KEY,
        JSON.stringify(items)
      );
    }
  } catch {
    // Ignore localStorage errors
  }
}

function getLocalDailyTips(): DailyTipRow[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = localStorage.getItem(DAILY_TIPS_STORAGE_KEY);

      if (saved) {
        return JSON.parse(saved) as DailyTipRow[];
      }
    }
  } catch {
    // Ignore localStorage errors
  }

  return [];
}

function saveLocalDailyTips(items: DailyTipRow[]): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(
        DAILY_TIPS_STORAGE_KEY,
        JSON.stringify(items)
      );
    }
  } catch {
    // Ignore localStorage errors
  }
}

/* -------------------------------------------------------------------------- */
/*                           TYPE GUARD HELPERS                               */
/* -------------------------------------------------------------------------- */

function isArticleRow(record: DatabaseRow): record is ArticleRow {
  return "excerpt" in record && "read_time" in record;
}

function isDailyTipRow(record: DatabaseRow): record is DailyTipRow {
  return "published_at" in record && "category" in record;
}

function getRecordsForTable(table: string): DatabaseRow[] {
  if (table === "articles") {
    return getLocalArticles();
  }

  if (table === "daily_tips") {
    return getLocalDailyTips();
  }

  return [];
}

function saveRecordsForTable(
  table: string,
  records: DatabaseRow[]
): void {
  if (table === "articles") {
    const articles = records.filter(isArticleRow);
    saveLocalArticles(articles);
    return;
  }

  if (table === "daily_tips") {
    const dailyTips = records.filter(isDailyTipRow);
    saveLocalDailyTips(dailyTips);
  }
}

/* -------------------------------------------------------------------------- */
/*                          LOCAL MOCK CLIENT                                 */
/* -------------------------------------------------------------------------- */

function createMockQueryBuilder(table: string): QueryBuilder {
  let records = getRecordsForTable(table);

  let filterFn: (item: DatabaseRow) => boolean = () => true;

  let pendingInsert: DatabaseInsert | null = null;

  let pendingUpdate:
    | Partial<ArticleRow>
    | Partial<DailyTipRow>
    | null = null;

  let filterColumn: string | null = null;

  let filterValue: unknown = null;

  const builder: QueryBuilder = {
    select() {
      return builder;
    },

    insert(value) {
      pendingInsert = Array.isArray(value)
        ? value[0] ?? null
        : value;

      return builder;
    },

    update(value) {
      pendingUpdate = value;
      return builder;
    },

    delete() {
      return builder;
    },

    eq(column, value) {
      filterColumn = column;
      filterValue = value;

      const previousFilter = filterFn;

      filterFn = (item) => {
        const recordValue = item[column as keyof DatabaseRow];

        return (
          previousFilter(item) &&
          recordValue === value
        );
      };

      return builder;
    },

    order(column, options) {
      const ascending = options?.ascending ?? true;

      records.sort((first, second) => {
        const firstValue =
          first[column as keyof DatabaseRow];

        const secondValue =
          second[column as keyof DatabaseRow];

        if (firstValue == null && secondValue == null) {
          return 0;
        }

        if (firstValue == null) {
          return ascending ? -1 : 1;
        }

        if (secondValue == null) {
          return ascending ? 1 : -1;
        }

        if (firstValue < secondValue) {
          return ascending ? -1 : 1;
        }

        if (firstValue > secondValue) {
          return ascending ? 1 : -1;
        }

        return 0;
      });

      return builder;
    },

    single() {
      if (pendingInsert) {
        const inserted = createLocalRecord(
          table,
          pendingInsert
        );

        if (!inserted) {
          return Promise.resolve({
            data: null,
            error: new Error(
              `Unsupported table: ${table}`
            ),
          });
        }

        records = [inserted, ...records];

        saveRecordsForTable(table, records);

        return Promise.resolve({
          data: inserted,
          error: null,
        });
      }

      const filtered = records.filter(filterFn);

      const found = filtered[0] ?? null;

      return Promise.resolve({
        data: found,
        error: found
          ? null
          : new Error("No record found"),
      });
    },

    then(onfulfilled, onrejected) {
      if (pendingUpdate) {
        const updatedRecords = records.map((record) => {
          if (
            filterColumn &&
            record[
              filterColumn as keyof DatabaseRow
            ] === filterValue
          ) {
            return {
              ...record,
              ...pendingUpdate,
            } as DatabaseRow;
          }

          return record;
        });

        records = updatedRecords;

        saveRecordsForTable(table, records);

        const result: QueryResult = {
          data: records,
          error: null,
        };

        return Promise.resolve(result).then(
          onfulfilled,
          onrejected
        );
      }

      if (filterColumn) {
        const remainingRecords = records.filter(
          (record) =>
            record[
              filterColumn as keyof DatabaseRow
            ] !== filterValue
        );

        records = remainingRecords;

        saveRecordsForTable(table, records);

        const result: QueryResult = {
          data: null,
          error: null,
        };

        return Promise.resolve(result).then(
          onfulfilled,
          onrejected
        );
      }

      const filtered = records.filter(filterFn);

      const result: QueryResult = {
        data: filtered,
        error: null,
      };

      return Promise.resolve(result).then(
        onfulfilled,
        onrejected
      );
    },
  };

  return builder;
}

/* -------------------------------------------------------------------------- */
/*                         LOCAL RECORD CREATION                              */
/* -------------------------------------------------------------------------- */

function createLocalRecord(
  table: string,
  value: DatabaseInsert
): DatabaseRow | null {
  if (table === "articles") {
    const article = value as ArticleInsert;

    return {
      id: article.id ?? `art-${Date.now()}`,
      category: article.category || "General",
      title: article.title || "Untitled",
      excerpt: article.excerpt || "",
      content: article.content || "",
      author: article.author || "Admin",
      date:
        article.date ||
        new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      status: article.status || "draft",
      views: article.views ?? 0,
      read_time: article.read_time || "4 min read",
      avatar:
        article.avatar ||
        "https://i.pravatar.cc/64?img=12",
      image:
        article.image ||
        "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&h=500&fit=crop",
      is_new: article.is_new ?? true,
      created_at:
        article.created_at ??
        new Date().toISOString(),
    };
  }

  if (table === "daily_tips") {
    const tip = value as DailyTipInsert;

    const now = new Date().toISOString();

    return {
      id: tip.id ?? `tip-${Date.now()}`,
      title: tip.title || "Untitled Tip",
      content: tip.content || "",
      category: tip.category || "General",
      image: tip.image ?? null,
      author: tip.author ?? null,
      status: tip.status || "draft",
      published_at: tip.published_at ?? null,
      created_at: tip.created_at ?? now,
      updated_at: tip.updated_at ?? now,
    };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*                            SUPABASE CLIENT                                 */
/* -------------------------------------------------------------------------- */

const mockClient = {
  from(table: string) {
    return createMockQueryBuilder(table);
  },
} as unknown as NexTakeSupabaseClient;

export const supabase: NexTakeSupabaseClient = isConfigured
  ? (createClient(
      supabaseUrl as string,
      supabaseAnonKey as string
    ) as unknown as NexTakeSupabaseClient)
  : mockClient;

/* -------------------------------------------------------------------------- */
/*                            DAILY TIPS API                                  */
/* -------------------------------------------------------------------------- */

export async function getDailyTips(): Promise<DailyTipRow[]> {
  const { data, error } = await supabase
    .from("daily_tips")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error loading daily tips:",
      error
    );

    return [];
  }

  return (data ?? []).filter(isDailyTipRow);
}

export async function getPublishedDailyTips(): Promise<
  DailyTipRow[]
> {
  const { data, error } = await supabase
    .from("daily_tips")
    .select("*")
    .eq("status", "published")
    .order("published_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error loading published daily tips:",
      error
    );

    return [];
  }

  return (data ?? []).filter(isDailyTipRow);
}

export async function createDailyTip(
  tip: Omit<
    DailyTipRow,
    "id" | "created_at" | "updated_at"
  >
): Promise<DailyTipRow> {
  const publishedAt =
    tip.status === "published"
      ? tip.published_at ??
        new Date().toISOString()
      : null;

  const { data, error } = await supabase
    .from("daily_tips")
    .insert({
      ...tip,
      published_at: publishedAt,
    })
    .select()
    .single();

  if (error || !data) {
    throw (
      error ??
      new Error("Failed to create daily tip")
    );
  }

  if (!isDailyTipRow(data)) {
    throw new Error(
      "Invalid daily tip returned from database"
    );
  }

  return data;
}

export async function updateDailyTip(
  id: string,
  updates: Partial<DailyTipRow>
): Promise<DailyTipRow> {
  const publishedAt =
    updates.status === "published"
      ? updates.published_at ??
        new Date().toISOString()
      : updates.status === "draft"
      ? null
      : updates.published_at;

  const { data, error } = await supabase
    .from("daily_tips")
    .update({
      ...updates,
      published_at: publishedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    throw (
      error ??
      new Error("Failed to update daily tip")
    );
  }

  if (!isDailyTipRow(data)) {
    throw new Error(
      "Invalid daily tip returned from database"
    );
  }

  return data;
}

export async function deleteDailyTip(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("daily_tips")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}