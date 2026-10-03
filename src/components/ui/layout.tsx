/**
 * Page-level layout primitives: headers with breadcrumbs, tabs and section
 * scaffolding used by every console screen.
 */

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  onClick?: () => void;
}

export function PageHeader({
  title,
  description,
  badge,
  breadcrumbs,
  actions,
  children,
}: {
  title: string;
  description?: string;
  badge?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-4 border-b border-[#071A2B]/10 pb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
              {crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  className="cursor-pointer font-semibold hover:text-[#071A2B] hover:underline"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="font-semibold text-[#071A2B]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#071A2B] sm:text-3xl">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {children}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: T; label: string; count?: number; hint?: string }>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto border-b border-[#071A2B]/10 pb-px">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            title={tab.hint}
            className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-xs font-bold transition-colors ${
              isActive
                ? "border-[#7FFFD4] text-[#071A2B]"
                : "border-transparent text-slate-500 hover:border-slate-200 hover:text-[#071A2B]"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={`ml-2 rounded px-1.5 py-0.5 font-mono text-[10px] ${
                  isActive ? "bg-[#7FFFD4] text-[#071A2B]" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Two-column work surface used by editors and dossier screens. */
export function SplitLayout({
  main,
  side,
}: {
  main: ReactNode;
  side: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">{main}</div>
      <div className="space-y-6 lg:col-span-4">{side}</div>
    </div>
  );
}

export function DefinitionList({
  items,
  columns = 2,
}: {
  items: Array<{ label: string; value: ReactNode }>;
  columns?: 1 | 2 | 3;
}) {
  const grid =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <dl className={`grid gap-4 ${grid}`}>
      {items.map((item) => (
        <div key={item.label} className="space-y-0.5">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {item.label}
          </dt>
          <dd className="text-sm font-semibold text-[#071A2B]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
