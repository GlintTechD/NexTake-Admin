import type { Article, DailyTip } from "../../types";

export const ROTATION_WINDOW_MS = 24 * 60 * 60 * 1000;

function timestamp(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function articlePublishedAt(article: Article): number {
  return timestamp(article.publishedAt) || timestamp(article.createdAt) || timestamp(article.date);
}

export function tipPublishedAt(tip: DailyTip): number {
  return timestamp(tip.published_at) || timestamp(tip.created_at);
}

export function isInCurrentRotation(publishedAt: number, now = Date.now()): boolean {
  return publishedAt > 0 && publishedAt <= now && now - publishedAt < ROTATION_WINDOW_MS;
}

export function isCurrentBigStory(article: Article, now = Date.now()): boolean {
  return article.status === "published" && !!article.isBigStory && isInCurrentRotation(articlePublishedAt(article), now);
}

export function isCurrentDailyTip(tip: DailyTip, now = Date.now()): boolean {
  return tip.status === "published" && isInCurrentRotation(tipPublishedAt(tip), now);
}

export function compareNewest(left: Article, right: Article): number {
  return articlePublishedAt(right) - articlePublishedAt(left);
}

export function compareNewestTips(left: DailyTip, right: DailyTip): number {
  return tipPublishedAt(right) - tipPublishedAt(left);
}
