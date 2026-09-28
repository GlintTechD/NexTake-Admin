import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Plus } from "lucide-react";

interface CategoryComboboxProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  /** Called whenever a typed (non-option) category should be saved for reuse. */
  onCommitCustom?: (category: string) => void;
  placeholder?: string;
  inputClassName?: string;
}

/**
 * Typeable category field: type anything freely, or pick a saved
 * option from the dropdown. Typed categories are committed as saved
 * options via `onCommitCustom`.
 */
export default function CategoryCombobox({
  id,
  value,
  onChange,
  options,
  onCommitCustom,
  placeholder = "Type or pick a category",
  inputClassName = "w-full rounded-xl border border-[#071A2B]/20 px-3.5 py-2.5 text-sm font-semibold text-[#071A2B] focus:border-[#071A2B] focus:outline-none focus:ring-2 focus:ring-[#7FFFD4]/30",
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmedFilter = filterText.trim();

  const filteredOptions = useMemo(() => {
    if (!trimmedFilter) return options;
    const query = trimmedFilter.toLowerCase();
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, trimmedFilter]);

  const exactMatch = useMemo(
    () =>
      options.some(
        (option) => option.toLowerCase() === trimmedFilter.toLowerCase()
      ),
    [options, trimmedFilter]
  );
  const showAddRow = trimmedFilter !== "" && !exactMatch;

  // Close when clicking outside the combobox
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  const selectOption = (option: string) => {
    onChange(option);
    setFilterText("");
    setHighlight(-1);
    setOpen(false);
  };

  const commitCustom = () => {
    const trimmed = trimmedFilter || value.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setFilterText("");
    setHighlight(-1);
    setOpen(false);
    onCommitCustom?.(trimmed);
  };

  const handleBlur = () => {
    // Focus truly left the field: close the list and save a typed category
    const trimmed = value.trim();
    if (trimmed && trimmed !== value) onChange(trimmed);
    setOpen(false);
    setHighlight(-1);
    if (trimmed && !options.some((o) => o.toLowerCase() === trimmed.toLowerCase())) {
      onCommitCustom?.(trimmed);
    }
  };

  const rowCount = filteredOptions.length + (showAddRow ? 1 : 0);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setFilterText("");
        setHighlight(0);
        return;
      }
      if (rowCount === 0) return;
      setHighlight((current) => {
        if (event.key === "ArrowDown") return current + 1 >= rowCount ? 0 : current + 1;
        return current - 1 < 0 ? rowCount - 1 : current - 1;
      });
      return;
    }

    if (event.key === "Enter" && open && highlight >= 0 && rowCount > 0) {
      event.preventDefault();
      if (highlight < filteredOptions.length) {
        selectOption(filteredOptions[highlight]);
      } else {
        commitCustom();
      }
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setFilterText(event.target.value);
          setHighlight(-1);
          setOpen(true);
        }}
        onFocus={() => {
          setFilterText("");
          setHighlight(-1);
          setOpen(true);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${inputClassName} pr-9`}
      />

      <button
        type="button"
        tabIndex={-1}
        aria-label="Show category options"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setFilterText("");
          setHighlight(-1);
          setOpen((current) => !current);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-[#071A2B] cursor-pointer"
      >
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && rowCount > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-52 overflow-auto rounded-xl border border-[#071A2B]/20 bg-white py-1 shadow-lg"
        >
          {filteredOptions.map((option, index) => (
            <li
              key={option}
              role="option"
              aria-selected={option === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
              onMouseEnter={() => setHighlight(index)}
              className={`flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2 text-sm font-semibold text-[#071A2B] ${
                index === highlight ? "bg-[#7FFFD4]/30" : "hover:bg-[#7FFFD4]/15"
              }`}
            >
              <span className="truncate">{option}</span>
              {option === value && <Check className="w-3.5 h-3.5 shrink-0 text-[#071A2B]" />}
            </li>
          ))}

          {showAddRow && (
            <li
              role="option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={commitCustom}
              onMouseEnter={() => setHighlight(filteredOptions.length)}
              className={`flex cursor-pointer items-center gap-2 border-t border-[#071A2B]/10 px-3.5 py-2 text-sm font-semibold text-[#071A2B] ${
                highlight === filteredOptions.length
                  ? "bg-[#7FFFD4]/30"
                  : "hover:bg-[#7FFFD4]/15"
              }`}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Add “{trimmedFilter}”</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
