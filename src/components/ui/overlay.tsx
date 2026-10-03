/**
 * Overlay primitives: modal, confirmation dialog and mobile-friendly drawer.
 */

import { useEffect, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./primitives";

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  id,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  id?: string;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widths = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-[95vw]",
  } as const;

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs sm:p-4"
    >
      <div
        className={`max-h-[92vh] w-full ${widths[size]} overflow-y-auto rounded-2xl border border-[#071A2B]/20 bg-white shadow-2xl`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#071A2B]/10 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#071A2B]">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#071A2B]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5">{children}</div>

        {footer && (
          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-[#071A2B]/10 bg-white px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Destructive actions require confirmation (brief §8). Optionally requires the
 * user to type a phrase for irreversible operations such as deletion.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  requirePhrase,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  requirePhrase?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            tone === "danger" ? "bg-rose-50 text-rose-600" : "bg-[#7FFFD4]/20 text-[#071A2B]"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="space-y-2 text-xs leading-relaxed text-slate-600">
          <p>{message}</p>
          {requirePhrase && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-900">
              This action cannot be undone from the console.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Right-hand drawer used for filters and quick entity previews on mobile. */
export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <button
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        aria-label="Close panel"
      />
      <aside className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#071A2B]/10 px-5 py-4">
          <h2 className="text-base font-bold text-[#071A2B]">{title}</h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#071A2B]"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="border-t border-[#071A2B]/10 px-5 py-4">{footer}</div>
        )}
      </aside>
    </div>
  );
}
