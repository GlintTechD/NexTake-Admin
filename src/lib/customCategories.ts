import { useCallback, useState } from "react";

export const DEFAULT_CATEGORIES = [
  "Software Engineering",
  "Design",
  "Product",
  "Management",
  "Customer Success",
];

export const TIP_DEFAULT_CATEGORIES = [
  "Finance",
  "Technology",
  "Productivity",
  "Business",
  "Career",
  "Security",
  "Lifestyle",
];

export const ARTICLE_CATEGORIES_KEY = "nextake-custom-categories";
export const TIP_CATEGORIES_KEY = "nextake-custom-tip-categories";

export function loadCustomCategories(
  storageKey: string = ARTICLE_CATEGORIES_KEY
): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is string => typeof item === "string" && item.trim() !== ""
    );
  } catch {
    return [];
  }
}

/**
 * Persist a typed category so it becomes a pickable option for future
 * uploads. Returns the updated custom list.
 */
export function addCustomCategory(
  category: string,
  storageKey: string = ARTICLE_CATEGORIES_KEY
): string[] {
  const trimmed = category.trim();
  const current = loadCustomCategories(storageKey);

  if (!trimmed || current.includes(trimmed)) {
    return current;
  }

  const next = [...current, trimmed];
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // localStorage unavailable — keep the in-memory list only
  }
  return next;
}

/**
 * React state around the saved category list. `register` makes a typed
 * category a pickable option immediately (and across sessions).
 */
export function useCustomCategories(
  storageKey: string = ARTICLE_CATEGORIES_KEY
) {
  const [customCategories, setCustomCategories] = useState<string[]>(() =>
    loadCustomCategories(storageKey)
  );

  const registerCustomCategory = useCallback(
    (category: string) => {
      setCustomCategories(addCustomCategory(category, storageKey));
    },
    [storageKey]
  );

  return { customCategories, registerCustomCategory };
}
