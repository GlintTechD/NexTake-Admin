/**
 * NexTake console primitives.
 *
 * Every component here is a direct extraction of class strings already used
 * across `DashboardHome`, `BlogManager` and `WebsiteManager` — same navy
 * (#071A2B), same aquamarine accent (#7FFFD4), same radii, borders and type
 * scale. The public website is untouched; these only standardise the admin
 * surface so new screens match the ones that already exist.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                  BUTTON                                    */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[#7FFFD4] text-[#071A2B] hover:bg-[#68f0c5] shadow-md shadow-[#7FFFD4]/20 font-bold",
  secondary:
    "bg-[#071A2B] text-white hover:bg-[#0f2c45] font-semibold border border-[#0f2c45]",
  outline:
    "bg-white text-[#071A2B] border border-[#071A2B]/20 hover:bg-slate-50 font-semibold",
  ghost: "bg-transparent text-[#071A2B] hover:bg-slate-100 font-semibold",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 font-semibold shadow-sm shadow-rose-600/20",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-xs gap-1.5 rounded-lg",
  md: "px-4 py-2.5 text-sm gap-2 rounded-xl",
  lg: "px-5 py-3 text-sm gap-2 rounded-xl",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   BADGE                                    */
/* -------------------------------------------------------------------------- */

export type BadgeTone =
  | "neutral"
  | "mint"
  | "navy"
  | "amber"
  | "rose"
  | "emerald"
  | "violet"
  | "sky";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  mint: "bg-[#7FFFD4]/25 text-[#071A2B] border-[#7FFFD4]/50",
  navy: "bg-[#071A2B] text-[#7FFFD4] border-[#071A2B]",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
  title,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, BadgeTone> = {
  published: "emerald",
  scheduled: "sky",
  draft: "neutral",
  "in review": "amber",
  "in_review": "amber",
  approved: "mint",
  "changes requested": "rose",
  "changes_requested": "rose",
  unpublished: "rose",
  archived: "violet",
  active: "emerald",
  invited: "amber",
  suspended: "rose",
  pending: "amber",
  accepted: "emerald",
  rejected: "rose",
  sent: "emerald",
  paused: "amber",
  verified: "emerald",
  reported: "amber",
  unverified: "rose",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = status.toLowerCase();
  const normalized = key.replace(/_/g, " ");
  const tone = STATUS_TONES[key] ?? STATUS_TONES[normalized] ?? "neutral";
  return (
    <Badge tone={tone} className={className}>
      {normalized}
    </Badge>
  );
}

/** Marks records that ship with the sample workspace rather than the database. */
export function OriginBadge({ origin }: { origin: "sample" | "live" }) {
  if (origin === "live") return null;
  return (
    <Badge tone="violet" title="Shipped example record — replace with real reporting">
      sample
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   CARD                                     */
/* -------------------------------------------------------------------------- */

export function Card({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`rounded-2xl border border-[#071A2B]/15 bg-white shadow-xs ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className = "",
  id,
  padded = true,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  padded?: boolean;
}) {
  return (
    <Card id={id} className={className}>
      {(title || actions) && (
        <div className="flex flex-col gap-3 border-b border-[#071A2B]/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-bold tracking-tight text-[#071A2B]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </Card>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "mint",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: BadgeTone;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#071A2B]/15 bg-white p-5 shadow-xs transition-all hover:border-[#071A2B]/30">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#071A2B] text-[#7FFFD4]">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold tracking-tight text-[#071A2B]">
          {value}
        </span>
      </div>
      {hint && (
        <div className="mt-2">
          <Badge tone={tone}>{hint}</Badge>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              FEEDBACK / STATES                             */
/* -------------------------------------------------------------------------- */

export function Notice({
  tone = "info",
  title,
  children,
  actions,
  className = "",
}: {
  tone?: "info" | "warning" | "success" | "danger";
  title?: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-[#071A2B]/15 bg-slate-50 text-[#071A2B]",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    danger: "border-rose-200 bg-rose-50 text-rose-900",
  } as const;

  return (
    <div className={`rounded-xl border px-4 py-3 text-xs ${tones[tone]} ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          {title && <p className="text-sm font-bold">{title}</p>}
          {children && <div className="leading-relaxed">{children}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-[#071A2B]/20 bg-slate-50/50 px-4 py-14 text-center">
      {icon && <div className="flex justify-center text-slate-400">{icon}</div>}
      <h3 className="text-base font-bold text-[#071A2B]">{title}</h3>
      {description && (
        <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-500">
          {description}
        </p>
      )}
      {action && <div className="flex justify-center pt-1">{action}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "mint",
  className = "",
}: {
  value: number;
  tone?: "mint" | "navy" | "amber" | "rose";
  className?: string;
}) {
  const tones = {
    mint: "bg-[#7FFFD4]",
    navy: "bg-[#071A2B]",
    amber: "bg-amber-400",
    rose: "bg-rose-500",
  } as const;

  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${tones[tone]}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/** Compact dependency-free bar chart used by analytics and dashboards. */
export function Sparkbars({
  points,
  height = 120,
  labelSuffix = "",
}: {
  points: Array<{ label: string; value: number }>;
  height?: number;
  labelSuffix?: string;
}) {
  const max = Math.max(1, ...points.map((point) => point.value));

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1" style={{ height }}>
        {points.map((point, index) => (
          <div key={`${point.label}-${index}`} className="group relative flex-1">
            <div
              className="w-full rounded-t bg-[#7FFFD4]/70 transition-colors group-hover:bg-[#7FFFD4]"
              style={{ height: Math.max(2, (point.value / max) * height) }}
              title={`${point.label}: ${point.value}${labelSuffix}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-medium text-slate-400">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}
