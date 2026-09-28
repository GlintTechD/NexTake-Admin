import { useState, type ChangeEvent, type DragEvent } from "react";
import { Link2, UploadCloud, X } from "lucide-react";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_FILE_SIZE,
  convertImageToDataUrl,
} from "../lib/imageUpload";

type ImageSourceMode = "url" | "upload";

interface ImageSourceFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  urlPlaceholder?: string;
  onPendingChange?: (pending: boolean) => void;
  externalError?: string;
}

/**
 * Image input with two source modes: paste a URL, or manually
 * upload a file (click / drag & drop). Used by every image upload
 * section in the admin portal.
 */
export default function ImageSourceField({
  id,
  value,
  onChange,
  label = "Image",
  urlPlaceholder = "https://images.example.com/cover.jpg",
  onPendingChange,
  externalError,
}: ImageSourceFieldProps) {
  const isDataUrl = value.startsWith("data:");
  const [mode, setMode] = useState<ImageSourceMode>(
    isDataUrl ? "upload" : "url"
  );
  const [fileName, setFileName] = useState(isDataUrl ? "Current image" : "");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  const processFile = async (file: File) => {
    setError("");

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFileName("");
      setError("Please choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      setFileName("");
      setError("Please choose an image smaller than 8 MB.");
      return;
    }

    setIsPreparing(true);
    onPendingChange?.(true);

    try {
      const dataUrl = await convertImageToDataUrl(file);
      onChange(dataUrl);
      setFileName(file.name);
    } catch (uploadError) {
      console.error("Error preparing image:", uploadError);
      setFileName("");
      setError("We couldn't prepare that image. Please try another file.");
    } finally {
      setIsPreparing(false);
      onPendingChange?.(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleRemove = () => {
    onChange("");
    setFileName("");
    setError("");
    setIsDragging(false);
  };

  const handleModeChange = (nextMode: ImageSourceMode) => {
    setMode(nextMode);
    setError("");
    // Keep the existing value: switching tabs only changes how the
    // next image is provided, it never wipes the current one.
  };

  return (
    <div className="space-y-2">
      {/* Label + source toggle */}
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={`${id}-url`}
          className="block text-xs font-bold uppercase tracking-wider text-slate-600"
        >
          {label}
        </label>

        <div
          className="flex items-center gap-1 rounded-xl border border-[#071A2B]/20 bg-slate-50 p-1"
          role="tablist"
          aria-label={`${label} source`}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "url"}
            onClick={() => handleModeChange("url")}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
              mode === "url"
                ? "bg-[#071A2B] text-white shadow-sm"
                : "text-slate-500 hover:bg-white hover:text-[#071A2B]"
            }`}
          >
            <Link2 className="w-3 h-3" />
            <span>Use URL</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "upload"}
            onClick={() => handleModeChange("upload")}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
              mode === "upload"
                ? "bg-[#071A2B] text-white shadow-sm"
                : "text-slate-500 hover:bg-white hover:text-[#071A2B]"
            }`}
          >
            <UploadCloud className="w-3 h-3" />
            <span>Upload file</span>
          </button>
        </div>
      </div>

      {/* URL mode */}
      {mode === "url" && (
        <input
          id={`${id}-url`}
          type="url"
          value={isDataUrl ? "" : value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={urlPlaceholder}
          className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-xs font-mono focus:outline-none focus:border-[#071A2B]"
        />
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <label
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`block cursor-pointer rounded-2xl border border-dashed p-4 transition-colors ${
            isDragging
              ? "border-[#7FFFD4] bg-[#7FFFD4]/10"
              : "border-[#071A2B]/20 bg-slate-50/70 hover:border-[#071A2B]/40 hover:bg-slate-50"
          }`}
        >
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="space-y-0.5 text-center">
            <p className="text-xs font-semibold text-[#071A2B]">
              {isPreparing
                ? "Preparing image..."
                : isDragging
                  ? "Drop image here"
                  : value
                    ? "Click or drop a file to replace image"
                    : "Click to choose, or drag & drop a file"}
            </p>
            <p className="text-[11px] text-slate-500">
              {fileName ? fileName : "JPG, PNG, or WebP · max 8 MB"}
            </p>
          </div>
        </label>
      )}

      {/* Errors */}
      {(error || externalError) && (
        <p className="text-xs font-medium text-rose-600">
          {error || externalError}
        </p>
      )}

      {/* Current image preview + remove */}
      {value && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#071A2B]/10 bg-slate-50 p-2">
          <img
            src={value}
            alt={`${label} preview`}
            className="h-14 w-20 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#071A2B] truncate">
              {isDataUrl ? fileName || "Uploaded image" : value}
            </p>
            <p className="text-[11px] text-slate-500">
              {isDataUrl ? "Saved with the content" : "Linked by URL"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Remove</span>
          </button>
        </div>
      )}
    </div>
  );
}
