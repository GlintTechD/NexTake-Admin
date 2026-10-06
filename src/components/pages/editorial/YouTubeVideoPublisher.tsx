import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Play, Upload } from "lucide-react";
import { useAuth } from "../../../lib/auth/context";
import { useWorkspace } from "../../../lib/workspace/context";
import { normalizeArticle } from "../../../lib/workspace/articleAdapter";
import {
  buildPublishedVideoArticle,
  fetchYouTubeMetadata,
  parseYouTubeUrl,
  type YouTubeMetadata,
} from "../../../lib/publishing/youtube";
import { Badge, Button, Card, Notice } from "../../ui/primitives";
import { Field, TextArea, TextInput } from "../../ui/form";

export default function YouTubeVideoPublisher({
  placement,
}: {
  placement: "interview" | "short";
}) {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(placement === "short" ? "Shorts" : "Interviews");
  const [metadata, setMetadata] = useState<YouTubeMetadata | null>(null);
  const [metadataLoadedFor, setMetadataLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const reference = useMemo(() => parseYouTubeUrl(url), [url]);

  useEffect(() => {
    let cancelled = false;
    if (!reference) {
      return;
    }

    void fetchYouTubeMetadata(reference).then((result) => {
      if (cancelled) return;
      setMetadata(result);
      setMetadataLoadedFor(reference.originalUrl);
      if (result?.title) setTitle((current) => current.trim() ? current : result.title);
      if (result?.description) setDescription((current) => current.trim() ? current : result.description);
    });

    return () => {
      cancelled = true;
    };
  }, [reference]);

  const publish = () => {
    setError(null);
    setSuccess(null);
    if (!reference) {
      setError("Paste a supported YouTube watch, youtu.be, Shorts, or live URL.");
      return;
    }

    const article = normalizeArticle(buildPublishedVideoArticle({
      reference,
      placement,
      metadata,
      title,
      description,
      category,
      author: profile?.fullName || profile?.email || "NexTake Editorial",
    }));

    setPublishing(true);
    workspace.articles.create(article);
    setPublishing(false);
    setSuccess(`${placement === "interview" ? "Interview" : "Short"} published successfully.`);
    setUrl("");
    setMetadata(null);
    setTitle("");
    setDescription("");
  };

  return (
    <Card className="space-y-4 border-[#7FFFD4]/60 bg-[#f8fffd] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-[#071A2B] p-2 text-[#7FFFD4]"><Play className="h-4 w-4" /></div>
            <h2 className="text-base font-extrabold text-[#071A2B]">Publish video</h2>
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-600">
            Paste a YouTube link and NexTake will fetch the title and thumbnail for you. No HTML, iframe code, or JavaScript is required.
          </p>
        </div>
        <Badge tone="mint">YouTube only</Badge>
      </div>

      {error && <Notice tone="danger" title="Could not publish">{error}</Notice>}
      {success && <Notice tone="success" title="Published"><span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{success}</span></Notice>}

      <Field label="YouTube URL" required hint="Watch, youtu.be, Shorts, and live links are supported.">
          <TextInput
            value={url}
            placeholder="https://www.youtube.com/watch?v=..."
            onChange={(event) => { setUrl(event.target.value); setMetadata(null); setMetadataLoadedFor(null); setError(null); setSuccess(null); }}
          />
          {url.trim() && !reference && (
            <p className="text-[11px] font-semibold text-rose-600">
              Enter a valid YouTube watch, youtu.be, Shorts, or live URL.
            </p>
          )}
      </Field>

      <details>
        <summary className="cursor-pointer text-xs font-bold text-[#071A2B]">Edit details</summary>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Title">
            <TextInput value={title} placeholder="Fetched from YouTube when available" onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="Category">
            <TextInput value={category} placeholder="Interviews or Shorts" onChange={(event) => setCategory(event.target.value)} />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <TextArea value={description} rows={3} placeholder="Optional supporting copy" onChange={(event) => setDescription(event.target.value)} />
          </Field>
        </div>
      </details>

      {reference && (
        <div className="overflow-hidden rounded-xl border border-[#071A2B]/10 bg-white">
          <div className="flex items-center justify-between border-b border-[#071A2B]/10 px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preview</p>
              <p className="mt-1 text-sm font-bold text-[#071A2B]">{title || metadata?.title || "YouTube video"}</p>
            </div>
            {metadataLoadedFor !== reference.originalUrl ? <span className="text-[11px] text-slate-400">Fetching details…</span> : <a href={reference.originalUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[#071A2B]"><ExternalLink className="h-4 w-4" /></a>}
          </div>
          <div className="aspect-video bg-slate-100">
            <iframe title="YouTube video preview" src={reference.embedUrl} className="h-full w-full border-0" allowFullScreen />
          </div>
        </div>
      )}

      <Button size="sm" icon={<Upload className="h-3.5 w-3.5" />} loading={publishing} disabled={!reference} onClick={publish}>
        Publish video
      </Button>
    </Card>
  );
}
