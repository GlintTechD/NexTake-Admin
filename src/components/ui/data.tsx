/**
 * Data display + filtering primitives.
 *
 * `DataTable` keeps the desktop table that editors expect and collapses to
 * cards on small screens (brief §27: "convert tables into cards") without
 * duplicating the row markup.
 */

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Hidden below `md` — those values must be present in the card renderer. */
  hideOnMobile?: boolean;
  className?: string;
  align?: "left" | "right" | "center";
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  renderCard,
  onRowClick,
  emptyState,
  selectedIds,
  onToggleSelect,
  footer,
}: {
  rows: T[];
  columns: Column<T>[];
  renderCard?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  footer?: ReactNode;
}) {
  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div className="space-y-4">
      {/* Desktop: table. Mobile: cards. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-[#071A2B]/15 md:block">
        <table className="w-full min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {onToggleSelect && <th className="w-10 px-3 py-3" />}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${
                    column.align === "right"
                      ? "text-right"
                      : column.align === "center"
                      ? "text-center"
                      : ""
                  } ${column.className ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-t border-[#071A2B]/10 transition-colors ${
                  onRowClick ? "cursor-pointer hover:bg-slate-50" : ""
                }`}
              >
                {onToggleSelect && (
                  <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds?.includes(row.id) ?? false}
                      onChange={() => onToggleSelect(row.id)}
                      className="h-4 w-4 accent-[#071A2B]"
                      aria-label="Select row"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 align-top text-[#071A2B] ${
                      column.align === "right"
                        ? "text-right"
                        : column.align === "center"
                        ? "text-center"
                        : ""
                    } ${column.className ?? ""}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renderCard && (
        <div className="space-y-3 md:hidden">
          {rows.map((row) => (
            <div
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`rounded-2xl border border-[#071A2B]/15 bg-white p-4 ${
                onRowClick ? "cursor-pointer active:bg-slate-50" : ""
              }`}
            >
              {renderCard(row)}
            </div>
          ))}
        </div>
      )}

      {footer}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  id,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#071A2B]/15 bg-white py-2.5 pl-10 pr-9 text-sm text-[#071A2B] placeholder:text-slate-400 focus:border-[#071A2B] focus:outline-none focus:ring-2 focus:ring-[#7FFFD4]/30"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#071A2B]"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  id?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
      <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
      <span className="hidden sm:inline">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="cursor-pointer rounded-lg border border-[#071A2B]/10 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-[#071A2B] focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`cursor-pointer whitespace-nowrap rounded-lg font-semibold transition-all ${
            size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
          } ${
            value === option.value
              ? "bg-[#7FFFD4] text-[#071A2B] shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {option.label}
          {typeof option.count === "number" && (
            <span className="ml-1.5 font-mono opacity-70">{option.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) {
    return (
      <p className="text-[11px] text-slate-500">
        {total} record{total === 1 ? "" : "s"}
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
      <span>
        Page {page} of {pageCount} · {total} records
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="cursor-pointer rounded-lg border border-[#071A2B]/15 p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          className="cursor-pointer rounded-lg border border-[#071A2B]/15 p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Row of inline actions that stays usable on touch screens. */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-1">{children}</div>;
}

export function IconAction({
  label,
  onClick,
  icon,
  tone = "neutral",
  disabled,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
  tone?: "neutral" | "danger" | "primary";
  disabled?: boolean;
}) {
  const tones = {
    neutral: "text-slate-500 hover:bg-slate-100 hover:text-[#071A2B]",
    primary: "text-[#071A2B] hover:bg-[#7FFFD4]/25",
    danger: "text-slate-400 hover:bg-rose-50 hover:text-rose-600",
  } as const;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`cursor-pointer rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {icon}
    </button>
  );
}
