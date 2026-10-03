/**
 * Media library (brief §16).
 *
 * Images and other non-video assets only — video is handled by the separate
 * NexTake video system, so nothing here accepts or manages video files.
 */

import { useMemo, useRef, useState } from "react";
import { Camera, FileText, ImageIcon, Trash2, Upload } from "lucide-react";
import { useWorkspace } from "../../../lib/workspace/context";
import { useAuth } from "../../../lib/auth/context";
import { can } from "../../../lib/permissions";
import type { MediaAsset } from "../../../lib/workspace/types";
import { mediaUsage } from "../../../lib/workspace/relations";
import { convertImageToDataUrl, MAX_IMAGE_FILE_SIZE, ACCEPTED_IMAGE_TYPES } from "../../../lib/imageUpload";
import { Badge, Button, EmptyState, Notice, OriginBadge, StatCard } from "../../ui/primitives";
import { FilterSelect, SearchInput, SegmentedControl } from "../../ui/data";
import { Modal, ConfirmDialog } from "../../ui/overlay";
import { Field, TextArea, TextInput } from "../../ui/form";
import { PageHeader } from "../../ui/layout";

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryPage() {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const canManage = can(profile, "media.manage");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("image");
  const [view, setView] = useState<"grid" | "usage">("grid");
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const assets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspace.media.items.filter((asset) => {
      if (kind !== "all" && asset.kind !== kind) return false;
      if (!query) return true;
      return [asset.filename, asset.alt, asset.caption, asset.credit]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [kind, search, workspace.media.items]);

  const totalBytes = workspace.media.items.reduce((sum, asset) => sum + asset.sizeBytes, 0);
  const usedCount = workspace.media.items.filter((asset) => {
    const usage = mediaUsage(asset.id, asset.url, {
      articles: workspace.articles.items,
      startups: workspace.startups.items,
      people: workspace.people.items,
      campaigns: workspace.newsletter.items.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        articleIds: campaign.articleIds,
      })),
    });
    return usage.length > 0;
  }).length;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);

    for (const file of Array.from(files)) {
      if (file.type.startsWith("video/")) {
        setUploadError(
          "Video files are managed by the separate NexTake video system and are not accepted here."
        );
        continue;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setUploadError("Only JPEG, PNG and WebP images can be added to this library.");
        continue;
      }
      if (file.size > MAX_IMAGE_FILE_SIZE) {
        setUploadError("Images must be 8 MB or smaller.");
        continue;
      }

      try {
        const dataUrl = await convertImageToDataUrl(file);
        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
          const image = new Image();
          image.onload = () => resolve({ width: image.width, height: image.height });
          image.onerror = () => resolve({ width: 0, height: 0 });
          image.src = dataUrl;
        });

        workspace.media.create({
          filename: file.name,
          url: dataUrl,
          alt: "",
          caption: "",
          credit: "",
          kind: "image",
          mimeType: file.type,
          width: dimensions.width,
          height: dimensions.height,
          sizeBytes: file.size,
          uploadedBy: profile?.email ?? "workspace",
          folder: "editorial",
        });
      } catch {
        setUploadError("That image could not be read. Try a smaller file.");
      }
    }

    setUploading(false);
    setFlash("Upload complete.");
    window.setTimeout(() => setFlash(null), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media library"
        description="Central asset store for images and documents used across NexTake editorial and intelligence records."
        badge={<Badge tone="mint">{workspace.media.items.length} assets</Badge>}
        actions={
          canManage && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                multiple
                className="hidden"
                onChange={(event) => void handleFiles(event.target.files)}
              />
              <Button
                size="sm"
                icon={<Upload className="h-3.5 w-3.5" />}
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload image
              </Button>
            </>
          )
        }
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {uploadError && <Notice tone="danger">{uploadError}</Notice>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Assets" value={workspace.media.items.length} icon={<Camera className="h-3.5 w-3.5" />} />
        <StatCard label="Total size" value={formatBytes(totalBytes)} />
        <StatCard label="In use" value={`${usedCount} / ${workspace.media.items.length}`} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by filename, alt text or credit…"
          className="sm:max-w-sm sm:flex-1"
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Kind"
            value={kind}
            onChange={setKind}
            options={[
              { value: "all", label: "All assets" },
              { value: "image", label: "Images" },
              { value: "graphic", label: "Graphics" },
              { value: "document", label: "Documents" },
            ]}
          />
          <SegmentedControl
            value={view}
            onChange={setView}
            size="sm"
            options={[
              { value: "grid", label: "Grid" },
              { value: "usage", label: "Usage" },
            ]}
          />
        </div>
      </div>

      {assets.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-9 w-9" />}
          title="No assets match this filter"
          description="Upload an image or adjust the filter. Video uploads are intentionally not supported here."
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="overflow-hidden rounded-2xl border border-[#071A2B]/15 bg-white"
            >
              <div className="relative h-40 bg-slate-100">
                <img src={asset.url} alt={asset.alt} className="h-full w-full object-cover" />
                <span className="absolute left-2 top-2">
                  <OriginBadge origin={asset.origin} />
                </span>
              </div>
              <div className="space-y-2 p-4">
                <p className="truncate text-sm font-bold text-[#071A2B]">{asset.filename}</p>
                <p className="line-clamp-2 text-[11px] text-slate-500">
                  {asset.alt || "No alt text — required for accessibility and SEO."}
                </p>
                <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-500">
                  <Badge tone="neutral">
                    {asset.width}×{asset.height}
                  </Badge>
                  <Badge tone="neutral">{formatBytes(asset.sizeBytes)}</Badge>
                  {asset.credit && <Badge tone="mint">{asset.credit}</Badge>}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="truncate text-[10px] text-slate-400">{asset.uploadedBy}</span>
                  <div className="flex items-center gap-1.5">
                    {canManage && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setEditing(asset)}>
                          Edit
                        </Button>
                        <button
                          onClick={() => setDeleteTarget(asset)}
                          className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Delete asset"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {assets.map((asset) => {
            const usage = mediaUsage(asset.id, asset.url, {
              articles: workspace.articles.items,
              startups: workspace.startups.items,
              people: workspace.people.items,
              campaigns: [],
            });
            return (
              <div
                key={asset.id}
                className="flex flex-col gap-3 rounded-2xl border border-[#071A2B]/15 p-4 sm:flex-row sm:items-center"
              >
                <img
                  src={asset.url}
                  alt={asset.alt}
                  className="h-16 w-24 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#071A2B]">{asset.filename}</p>
                  <p className="text-[11px] text-slate-500">
                    {asset.width}×{asset.height} · {formatBytes(asset.sizeBytes)} ·{" "}
                    {asset.uploadedBy}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {usage.length === 0 && <Badge tone="amber">not used yet</Badge>}
                    {usage.map((entry) => (
                      <Badge key={`${entry.entityType}-${entry.id}`} tone="mint">
                        {entry.entityType}: {entry.label.slice(0, 28)}
                      </Badge>
                    ))}
                  </div>
                </div>
                {canManage && (
                  <Button size="sm" variant="outline" onClick={() => setEditing(asset)}>
                    Edit
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title="Asset details"
        description="Alt text, captions and credits travel with the asset wherever it is used."
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!editing) return;
                workspace.media.update(editing.id, editing);
                setEditing(null);
                setFlash("Asset updated.");
              }}
            >
              Save asset
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <img
              src={editing.url}
              alt={editing.alt}
              className="max-h-56 w-full rounded-xl border border-[#071A2B]/10 object-cover"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Filename">
                <TextInput
                  value={editing.filename}
                  onChange={(event) => setEditing({ ...editing, filename: event.target.value })}
                />
              </Field>
              <Field label="Credit">
                <TextInput
                  value={editing.credit}
                  onChange={(event) => setEditing({ ...editing, credit: event.target.value })}
                  placeholder="Photographer / agency"
                />
              </Field>
            </div>
            <Field label="Alt text" hint="Describes the image for screen readers and search.">
              <TextInput
                value={editing.alt}
                onChange={(event) => setEditing({ ...editing, alt: event.target.value })}
              />
            </Field>
            <Field label="Caption">
              <TextArea
                rows={2}
                value={editing.caption}
                onChange={(event) => setEditing({ ...editing, caption: event.target.value })}
              />
            </Field>
            <div className="rounded-xl bg-slate-50 p-4 text-[11px] text-slate-600">
              <p className="flex items-center gap-2 font-bold uppercase tracking-wider text-slate-500">
                <FileText className="h-3.5 w-3.5" /> Asset facts
              </p>
              <ul className="mt-2 space-y-1">
                <li>Dimensions: {editing.width}×{editing.height}</li>
                <li>Size: {formatBytes(editing.sizeBytes)}</li>
                <li>Type: {editing.mimeType}</li>
                <li>Uploaded by: {editing.uploadedBy}</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete this asset?"
        message={`“${deleteTarget?.filename ?? ""}” will be removed from the library. Records using it will fall back to their previous image.`}
        confirmLabel="Delete asset"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) workspace.media.remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
