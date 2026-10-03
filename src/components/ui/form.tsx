/**
 * Form primitives. Same input treatment used by `BlogManager` and
 * `WebsiteManager` (rounded-xl, `#071A2B/20` border, mint focus ring).
 */

import {
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Plus, X } from "lucide-react";

const FIELD_BASE =
  "w-full rounded-xl border border-[#071A2B]/20 bg-white px-3.5 py-2.5 text-sm text-[#071A2B] placeholder:text-slate-400 focus:border-[#071A2B] focus:outline-none focus:ring-2 focus:ring-[#7FFFD4]/30 disabled:bg-slate-50 disabled:text-slate-500";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className = "",
  htmlFor,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-[11px] font-bold uppercase tracking-wider text-slate-600"
        >
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[11px] font-semibold text-rose-600">{error}</p>
      ) : (
        hint && <p className="text-[11px] text-slate-400">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${FIELD_BASE} ${className}`} />;
}

export function TextArea({
  className = "",
  rows = 4,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} {...rest} className={`${FIELD_BASE} ${className}`} />;
}

export function Select({
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={`${FIELD_BASE} cursor-pointer ${className}`}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  description,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#071A2B]/15 px-3.5 py-2.5 text-xs font-semibold text-[#071A2B] hover:bg-slate-50">
      <input type="checkbox" {...rest} className="mt-0.5 h-4 w-4 accent-[#071A2B]" />
      <span>
        <span className="block">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

/**
 * Tag / multi-value input with controlled-vocabulary suggestions.
 * Values are canonicalised by the caller via `taxonomy.canonicalize`.
 */
export function TagInput({
  values,
  onChange,
  suggestions = [],
  placeholder = "Type a value and press Enter",
  id,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState("");

  const filtered = useMemo(() => {
    const key = draft.trim().toLowerCase();
    if (!key) return [];
    return suggestions
      .filter((suggestion) => suggestion.toLowerCase().includes(key))
      .filter((suggestion) => !values.some((value) => value.toLowerCase() === suggestion.toLowerCase()))
      .slice(0, 6);
  }, [draft, suggestions, values]);

  const commit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!values.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-full border border-[#7FFFD4]/50 bg-[#7FFFD4]/20 px-2.5 py-1 text-[11px] font-semibold text-[#071A2B]"
          >
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((entry) => entry !== value))}
              className="cursor-pointer text-slate-500 hover:text-rose-600"
              aria-label={`Remove ${value}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {values.length === 0 && (
          <span className="text-[11px] text-slate-400">No values yet</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <TextInput
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commit(draft);
            }
          }}
        />
        <button
          type="button"
          onClick={() => commit(draft)}
          className="shrink-0 cursor-pointer rounded-xl border border-[#071A2B]/20 p-2.5 text-[#071A2B] hover:bg-slate-50"
          aria-label="Add value"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filtered.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => commit(suggestion)}
              className="cursor-pointer rounded-full border border-[#071A2B]/15 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-[#7FFFD4] hover:text-[#071A2B]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Repeatable list of plain string values (products, risks, traction, …). */
export function StringListEditor({
  values,
  onChange,
  placeholder = "Add an item",
  rows = 3,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="flex items-start gap-2">
          <TextArea
            rows={1}
            value={value}
            onChange={(event) => {
              const next = [...values];
              next[index] = event.target.value;
              onChange(next);
            }}
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => onChange(values.filter((_, position) => position !== index))}
            className="mt-1 shrink-0 cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            aria-label="Remove item"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[#071A2B]/25 px-3 py-1.5 text-[11px] font-semibold text-[#071A2B] hover:border-[#7FFFD4] hover:bg-[#7FFFD4]/10"
      >
        <Plus className="h-3 w-3" />
        {rows > 1 ? "Add row" : "Add item"}
      </button>
    </div>
  );
}
