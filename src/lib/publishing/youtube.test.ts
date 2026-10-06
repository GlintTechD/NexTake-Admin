import { describe, expect, it, vi } from "vitest";
import {
  buildPublishedVideoArticle,
  fetchYouTubeMetadata,
  parseYouTubeUrl,
  sortPublishedMedia,
} from "./youtube";

describe("YouTube publishing helpers", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "watch"],
    ["https://youtu.be/dQw4w9WgXcQ?t=12", "watch"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "shorts"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ", "live"],
  ])("accepts %s", (url, kind) => {
    const parsed = parseYouTubeUrl(url);
    expect(parsed?.kind).toBe(kind);
    expect(parsed?.videoId).toBe("dQw4w9WgXcQ");
    expect(parsed?.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it.each([
    "",
    "https://vimeo.com/123456",
    "https://youtube.com/watch",
    "https://youtube.com/watch?v=too-short",
    "javascript:alert(1)",
  ])("rejects unsupported URL %s", (url) => {
    expect(parseYouTubeUrl(url)).toBeNull();
  });

  it("maps oEmbed title and thumbnail", async () => {
    const reference = parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")!;
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          title: "A real interview",
          author_name: "NexTake",
          thumbnail_url: "https://img.example/thumb.jpg",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    await expect(fetchYouTubeMetadata(reference, fetcher)).resolves.toMatchObject({
      title: "A real interview",
      description: "Published on YouTube by NexTake.",
      thumbnailUrl: "https://img.example/thumb.jpg",
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("classifies published media by placement and keeps the original URL", () => {
    const reference = parseYouTubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")!;
    const article = buildPublishedVideoArticle({
      reference,
      placement: "short",
      metadata: { title: "Short title", description: "Short description", thumbnailUrl: "thumb" },
      author: "Editor",
      now: "2026-10-06T10:00:00.000Z",
    });

    expect(article).toMatchObject({
      contentType: "media",
      type: "short",
      videoUrl: "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      tags: ["short"],
      coverImageUrl: "thumb",
      status: "published",
      publishedAt: "2026-10-06T10:00:00.000Z",
    });
  });

  it("orders published media by publishedAt then createdAt descending", () => {
    const items = [
      { id: "older", status: "published", publishedAt: "2026-10-01T10:00:00.000Z", createdAt: "2026-10-01T09:00:00.000Z" },
      { id: "newest", status: "published", publishedAt: "2026-10-06T10:00:00.000Z", createdAt: "2026-10-06T09:00:00.000Z" },
      { id: "tie-break", status: "published", publishedAt: "2026-10-06T10:00:00.000Z", createdAt: "2026-10-06T11:00:00.000Z" },
    ];
    expect(sortPublishedMedia(items).map((item) => item.id)).toEqual(["tie-break", "newest", "older"]);
  });
});
