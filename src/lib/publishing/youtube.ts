import type { Article } from "../../types";

export type YouTubeUrlKind = "watch" | "shorts" | "live";
export type VideoPlacement = "interview" | "short" | "video";

export interface YouTubeVideoReference {
  originalUrl: string;
  videoId: string;
  kind: YouTubeUrlKind;
  embedUrl: string;
  thumbnailUrl: string;
}

export interface YouTubeMetadata {
  title: string;
  description: string;
  thumbnailUrl: string;
  authorName?: string;
}

export function buildPublishedVideoArticle(input: {
  reference: YouTubeVideoReference;
  placement: VideoPlacement;
  metadata?: YouTubeMetadata | null;
  title?: string;
  description?: string;
  category?: string;
  author: string;
  now?: string;
}): Article {
  const now = input.now ?? new Date().toISOString();
  const title = input.title?.trim() || input.metadata?.title || `YouTube ${input.placement}`;
  const description =
    input.description?.trim() || input.metadata?.description || "Published video from YouTube.";
  const thumbnail = input.metadata?.thumbnailUrl || input.reference.thumbnailUrl;

  const generatedId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : undefined;

  return {
    id: generatedId as string,
    category: input.category?.trim() || (input.placement === "interview" ? "Interviews" : input.placement === "short" ? "Shorts" : "Videos"),
    title,
    excerpt: description,
    content: description,
    author: input.author,
    date: new Date(now).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    status: "published",
    views: 0,
    readTime: input.placement === "short" ? "Short video" : input.placement === "interview" ? "Video interview" : "Video",
    avatar: "",
    image: thumbnail,
    coverImageUrl: thumbnail,
    type: input.placement,
    contentType: "media",
    mediaPlacement: input.placement,
    videoUrl: input.reference.originalUrl,
    tags: [input.placement],
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    reviewState: "approved",
  };
}

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeUrl(value: string): YouTubeVideoReference | null {
  const originalUrl = value.trim();
  if (!originalUrl) return null;

  let url: URL;
  try {
    url = new URL(originalUrl);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtu.be") {
    return null;
  }

  let videoId: string;
  let kind: YouTubeUrlKind;
  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
    kind = "watch";
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v") ?? "";
    kind = "watch";
  } else if (url.pathname.startsWith("/shorts/")) {
    videoId = url.pathname.split("/")[2] ?? "";
    kind = "shorts";
  } else if (url.pathname.startsWith("/live/")) {
    videoId = url.pathname.split("/")[2] ?? "";
    kind = "live";
  } else {
    return null;
  }

  if (!VIDEO_ID_PATTERN.test(videoId)) return null;

  return {
    originalUrl,
    videoId,
    kind,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

export async function fetchYouTubeMetadata(
  reference: YouTubeVideoReference,
  fetcher: typeof fetch = fetch
): Promise<YouTubeMetadata | null> {
  try {
    const response = await fetcher(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(reference.originalUrl)}&format=json`,
      { headers: { accept: "application/json" } }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    return {
      title: payload.title?.trim() ?? "",
      description: payload.author_name ? `Published on YouTube by ${payload.author_name}.` : "",
      thumbnailUrl: payload.thumbnail_url || reference.thumbnailUrl,
      authorName: payload.author_name,
    };
  } catch {
    return null;
  }
}

export function sortPublishedMedia<T extends { status: string; publishedAt?: string | null; createdAt?: string }>(
  items: T[]
): T[] {
  return [...items].sort((left, right) => {
    const published =
      new Date(right.publishedAt ?? 0).getTime() - new Date(left.publishedAt ?? 0).getTime();
    return published || new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
  });
}
