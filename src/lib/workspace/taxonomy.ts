/**
 * Controlled taxonomy.
 *
 * The brief calls out inconsistent spelling/capitalisation creating duplicate
 * concepts (`FinTech`, `fintech`, `FINTECH`). Every taxonomy value typed into
 * the console passes through `resolveTaxonomyTerm`, which folds accents,
 * punctuation, spacing and casing onto one canonical record.
 */

import type { Industry, TaxonomyKind, TaxonomyTerm } from "./types";

export const TAXONOMY_KINDS: TaxonomyKind[] = ["category", "tag", "industry"];

export const DEFAULT_CATEGORIES = [
  "Startups",
  "Funding",
  "AI",
  "Cybersecurity",
  "Policy",
  "Markets",
  "Innovation",
] as const;

export const DEFAULT_INDUSTRIES = [
  "Fintech",
  "Healthtech",
  "Edtech",
  "Climate",
  "AI",
  "Cybersecurity",
  "Agritech",
  "Logistics",
  "Mobility",
  "SaaS",
] as const;

export const DEFAULT_TAGS = [
  "fintech",
  "venture capital",
  "Nigeria",
  "Kenya",
  "South Africa",
  "AI",
  "robotics",
  "payments",
  "open banking",
  "climate tech",
] as const;

/** Country / market vocabulary used across dossiers and tags. */
export const MARKETS = [
  "Nigeria",
  "Kenya",
  "South Africa",
  "Ghana",
  "Egypt",
  "Rwanda",
  "Tanzania",
  "Uganda",
  "Senegal",
  "Morocco",
  "Ethiopia",
  "Côte d'Ivoire",
  "Africa (pan-regional)",
  "Global",
] as const;

/**
 * Canonical comparison key: lowercase, accent-free, alphanumeric only.
 * `"Venture Capital"`, `"venture-capital"` and `"VENTURE  CAPITAL"` all fold to
 * `"venturecapital"`.
 */
export function taxonomyKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function taxonomySlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function findTaxonomyTerm(
  terms: TaxonomyTerm[],
  kind: TaxonomyKind,
  value: string
): TaxonomyTerm | null {
  const key = taxonomyKey(value);
  if (!key) return null;

  return (
    terms.find(
      (term) =>
        term.kind === kind &&
        (taxonomyKey(term.name) === key ||
          taxonomySlug(term.name) === taxonomySlug(value) ||
          term.aliases.some((alias) => taxonomyKey(alias) === key))
    ) ?? null
  );
}

export interface TaxonomyResolution {
  /** Canonical display value to store on the record. */
  value: string;
  /** Existing term that matched, if any. */
  term: TaxonomyTerm | null;
  /** True when the value introduced a new concept. */
  isNew: boolean;
  /** The raw value the editor typed, when it differed from the canonical one. */
  asTyped: string;
}

/**
 * Resolve a typed value to its canonical form without mutating any state.
 * Callers decide whether to persist a newly seen term.
 */
export function resolveTaxonomy(
  terms: TaxonomyTerm[],
  kind: TaxonomyKind,
  value: string
): TaxonomyResolution {
  const trimmed = value.trim().replace(/\s+/g, " ");
  const existing = findTaxonomyTerm(terms, kind, trimmed);

  if (existing) {
    return { value: existing.name, term: existing, isNew: false, asTyped: trimmed };
  }

  return {
    value: canonicalDisplayName(trimmed),
    term: null,
    isNew: true,
    asTyped: trimmed,
  };
}

/**
 * Title-cases a new taxonomy concept while preserving short acronyms and
 * common brand spellings (`ai` → `AI`, `edtech` → `Edtech`).
 */
export function canonicalDisplayName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  const ACRONYMS = new Set(["ai", "api", "saas", "b2b", "b2c", "ipo", "esg", "vr", "ar", "iot"]);

  return trimmed
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      if (word === word.toUpperCase() && word.length <= 4) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/** Deduplicate a list of taxonomy values against the controlled vocabulary. */
export function canonicalizeList(
  terms: TaxonomyTerm[],
  kind: TaxonomyKind,
  values: string[]
): string[] {
  const seen = new Map<string, string>();

  for (const value of values) {
    const resolution = resolveTaxonomy(terms, kind, value);
    if (!resolution.value) continue;
    const key = taxonomyKey(resolution.value);
    if (!seen.has(key)) seen.set(key, resolution.value);
  }

  return Array.from(seen.values());
}

/** Fold duplicate taxonomy records onto a single canonical term. */
export function findDuplicates(terms: TaxonomyTerm[]): TaxonomyTerm[][] {
  const buckets = new Map<string, TaxonomyTerm[]>();

  for (const term of terms) {
    const key = `${term.kind}:${taxonomyKey(term.name)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(term);
    buckets.set(key, bucket);
  }

  return Array.from(buckets.values()).filter((bucket) => bucket.length > 1);
}

/** Default industry records referenced by the sample workspace. */
export const DEFAULT_INDUSTRY_NAMES: string[] = [...DEFAULT_INDUSTRIES];

export function isIndustryLike(value: string, industries: Industry[]): boolean {
  const key = taxonomyKey(value);
  return industries.some(
    (industry) =>
      taxonomyKey(industry.name) === key ||
      industry.aliases.some((alias) => taxonomyKey(alias) === key)
  );
}
