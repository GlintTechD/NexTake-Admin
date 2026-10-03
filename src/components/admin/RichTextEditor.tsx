/**
 * Rich text editor.
 *
 * Extends the existing textarea-based editor instead of replacing it: the
 * article body stays plain text/markdown, so nothing about the stored format or
 * the public renderer changes. What is new is the editing experience —
 * formatting toolbar, live preview, internal NexTake linking and media/embeds.
 */

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Image as ImageIcon,
  Link2,
  Frame,
  Eye,
  Pencil,
  Search,
  CornerDownLeft,
} from "lucide-react";
import { editorCommands, renderMarkdown, countWords, type SelectionEdit } from "../../lib/markdown";
import { useWorkspace } from "../../lib/workspace/context";
import { searchEntities, buildEntityIndex, publicHrefFor } from "../../lib/workspace/relations";
import { Button } from "../ui/primitives";
import { Modal } from "../ui/overlay";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  minHeight?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  label = "Body content",
  placeholder = "Write the story… **bold**, ## headings, - lists, [links](https://…), [embed](https://…)",
  minHeight = 320,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [linkDialog, setLinkDialog] = useState(false);
  const [mediaDialog, setMediaDialog] = useState(false);
  const [embedDialog, setEmbedDialog] = useState(false);
  const [linkQuery, setLinkQuery] = useState("");
  const [mediaQuery, setMediaQuery] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");

  const workspace = useWorkspace();

  const entityIndex = useMemo(
    () =>
      buildEntityIndex({
        articles: workspace.articles.items,
        startups: workspace.startups.items,
        people: workspace.people.items,
        companies: workspace.companies.items,
        industries: workspace.industries.items,
        sources: workspace.sources.items,
        events: workspace.events.items,
      }),
    [
      workspace.articles.items,
      workspace.companies.items,
      workspace.events.items,
      workspace.industries.items,
      workspace.people.items,
      workspace.sources.items,
      workspace.startups.items,
    ]
  );

  const entityResults = useMemo(
    () => searchEntities(entityIndex, linkQuery, { limit: 10 }),
    [entityIndex, linkQuery]
  );

  const mediaResults = useMemo(() => {
    const query = mediaQuery.trim().toLowerCase();
    return workspace.media.items
      .filter((asset) =>
        query
          ? `${asset.filename} ${asset.alt} ${asset.credit}`.toLowerCase().includes(query)
          : true
      )
      .slice(0, 12);
  }, [mediaQuery, workspace.media.items]);

  const applySelection = (edit: SelectionEdit) => {
    onChange(edit.value);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  };

  /** Reads the live textarea — only ever called from event handlers. */
  const currentSelection = (): SelectionEdit => {
    const textarea = textareaRef.current;
    return {
      value,
      selectionStart: textarea?.selectionStart ?? value.length,
      selectionEnd: textarea?.selectionEnd ?? value.length,
    };
  };

  const runCommand = (command: keyof typeof editorCommands) => {
    const fn = editorCommands[command] as (edit: SelectionEdit) => SelectionEdit;
    applySelection(fn(currentSelection()));
  };

  const toolbar: Array<{
    id: string;
    label: string;
    icon: ReactNode;
    command: keyof typeof editorCommands;
  }> = [
    { id: "bold", label: "Bold", icon: <Bold className="h-3.5 w-3.5" />, command: "bold" },
    { id: "italic", label: "Italic", icon: <Italic className="h-3.5 w-3.5" />, command: "italic" },
    { id: "heading", label: "Heading", icon: <Heading2 className="h-3.5 w-3.5" />, command: "heading" },
    { id: "bullet", label: "Bulleted list", icon: <List className="h-3.5 w-3.5" />, command: "bulletList" },
    { id: "number", label: "Numbered list", icon: <ListOrdered className="h-3.5 w-3.5" />, command: "numberedList" },
    { id: "quote", label: "Quote", icon: <Quote className="h-3.5 w-3.5" />, command: "quote" },
  ];

  const words = countWords(value);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400">{words} words</span>
          <button
            type="button"
            onClick={() => setMode(mode === "write" ? "preview" : "write")}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#071A2B]/15 px-2.5 py-1 text-[11px] font-semibold text-[#071A2B] hover:bg-slate-50"
          >
            {mode === "write" ? (
              <>
                <Eye className="h-3 w-3" /> Preview
              </>
            ) : (
              <>
                <Pencil className="h-3 w-3" /> Write
              </>
            )}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#071A2B]/20 focus-within:ring-2 focus-within:ring-[#7FFFD4]/30">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[#071A2B]/10 bg-slate-50 px-2 py-1.5">
          {toolbar.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.label}
              aria-label={item.label}
              onClick={() => runCommand(item.command)}
              className="cursor-pointer rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-white hover:text-[#071A2B]"
            >
              {item.icon}
            </button>
          ))}

          <span className="mx-1 h-4 w-px bg-[#071A2B]/10" />

          <button
            type="button"
            title="Link to a NexTake record or external URL"
            onClick={() => setLinkDialog(true)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-[#071A2B]"
          >
            <Link2 className="h-3.5 w-3.5" /> Link
          </button>
          <button
            type="button"
            title="Insert an image from the media library"
            onClick={() => setMediaDialog(true)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-[#071A2B]"
          >
            <ImageIcon className="h-3.5 w-3.5" /> Image
          </button>
          <button
            type="button"
            title="Embed an external page or player"
            onClick={() => {
              setEmbedUrl("");
              setEmbedDialog(true);
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-[#071A2B]"
          >
            <Frame className="h-3.5 w-3.5" /> Embed
          </button>
        </div>

        {mode === "write" ? (
          <textarea
            ref={textareaRef}
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            style={{ minHeight }}
            className="w-full resize-y bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-[#071A2B] placeholder:text-slate-400 focus:outline-none"
          />
        ) : (
          <div
            style={{ minHeight }}
            className="prose-sm max-w-none bg-white px-4 py-3 text-sm text-[#071A2B]"
            dangerouslySetInnerHTML={{
              __html: value.trim()
                ? renderMarkdown(value)
                : '<p class="text-slate-400">Nothing to preview yet.</p>',
            }}
          />
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* INTERNAL LINKING                                                  */}
      {/* ---------------------------------------------------------------- */}
      <Modal
        isOpen={linkDialog}
        onClose={() => setLinkDialog(false)}
        title="Insert a link"
        description="Search NexTake articles, startups, people, industries, events and sources — or paste any external URL."
        size="md"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={linkQuery}
              onChange={(event) => setLinkQuery(event.target.value)}
              placeholder="Search NexTake or paste https://…"
              className="w-full rounded-xl border border-[#071A2B]/20 py-2.5 pl-10 pr-3 text-sm focus:border-[#071A2B] focus:outline-none"
            />
          </div>

          {/^https?:\/\//i.test(linkQuery.trim()) && (
            <button
              onClick={() => {
                const edit = currentSelection();
                applySelection(
                  editorCommands.link(
                    edit,
                    edit.value.slice(edit.selectionStart, edit.selectionEnd) || linkQuery,
                    linkQuery.trim()
                  )
                );
                setLinkDialog(false);
              }}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-[#7FFFD4]/50 bg-[#7FFFD4]/10 px-3.5 py-2.5 text-left text-xs font-semibold text-[#071A2B]"
            >
              <span className="truncate">Insert external URL · {linkQuery.trim()}</span>
              <CornerDownLeft className="h-3.5 w-3.5" />
            </button>
          )}

          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {entityResults.map((node) => (
              <button
                key={`${node.type}-${node.id}`}
                onClick={() => {
                  const edit = currentSelection();
                  applySelection(
                    editorCommands.link(
                      edit,
                      edit.value.slice(edit.selectionStart, edit.selectionEnd) || node.label,
                      publicHrefFor(node, "")
                    )
                  );
                  setLinkDialog(false);
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#071A2B]/12 px-3.5 py-2.5 text-left transition-colors hover:border-[#7FFFD4] hover:bg-slate-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[#071A2B]">
                    {node.label}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {node.type} · {node.subtitle}
                  </span>
                </span>
                <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              </button>
            ))}
            {entityResults.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-500">
                No NexTake record matches “{linkQuery}”.
              </p>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Internal links are written as markdown and resolved against the public site, so
            editors never copy URLs by hand.
          </p>
        </div>
      </Modal>

      {/* ---------------------------------------------------------------- */}
      {/* MEDIA PICKER                                                      */}
      {/* ---------------------------------------------------------------- */}
      <Modal
        isOpen={mediaDialog}
        onClose={() => setMediaDialog(false)}
        title="Insert an image"
        description="Pick an asset from the NexTake media library or paste an external image URL."
        size="lg"
      >
        <div className="space-y-4">
          <input
            value={mediaQuery}
            onChange={(event) => setMediaQuery(event.target.value)}
            placeholder="Filter by filename, alt text or credit"
            className="w-full rounded-xl border border-[#071A2B]/20 px-3.5 py-2.5 text-sm focus:border-[#071A2B] focus:outline-none"
          />

          <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
            {mediaResults.map((asset) => (
              <button
                key={asset.id}
                onClick={() => {
                  const edit = currentSelection();
                  applySelection(editorCommands.image(edit, asset.alt || asset.filename, asset.url));
                  setMediaDialog(false);
                }}
                className="cursor-pointer overflow-hidden rounded-xl border border-[#071A2B]/15 text-left transition-colors hover:border-[#7FFFD4]"
              >
                <img src={asset.url} alt={asset.alt} className="h-24 w-full object-cover" />
                <span className="block truncate px-2.5 py-2 text-[11px] font-semibold text-[#071A2B]">
                  {asset.filename}
                </span>
              </button>
            ))}
          </div>

          {mediaResults.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-500">
              No media assets match that filter.
            </p>
          )}
        </div>
      </Modal>

      {/* ---------------------------------------------------------------- */}
      {/* EMBED                                                             */}
      {/* ---------------------------------------------------------------- */}
      <Modal
        isOpen={embedDialog}
        onClose={() => setEmbedDialog(false)}
        title="Insert an embed"
        description="Video and audio players live on the separate NexTake video system — this inserts an external embed URL into the story body."
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setEmbedDialog(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!/^https?:\/\//i.test(embedUrl.trim())}
              onClick={() => {
                const edit = currentSelection();
                applySelection(editorCommands.embed(edit, embedUrl.trim()));
                setEmbedDialog(false);
              }}
            >
              Insert embed
            </Button>
          </>
        }
      >
        <input
          autoFocus
          value={embedUrl}
          onChange={(event) => setEmbedUrl(event.target.value)}
          placeholder="https://…"
          className="w-full rounded-xl border border-[#071A2B]/20 px-3.5 py-2.5 text-sm focus:border-[#071A2B] focus:outline-none"
        />
      </Modal>
    </div>
  );
}
