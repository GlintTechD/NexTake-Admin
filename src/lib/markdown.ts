/**
 * Minimal, dependency-free markdown renderer for the console.
 *
 * The existing editor stored plain text in a `<textarea>`; rather than pulling
 * in a heavyweight WYSIWYG bundle (and changing the article storage format),
 * the console keeps text-based content and adds a rich toolbar that writes
 * markdown. Everything renders through this single, auditable function.
 *
 * Security: input is HTML-escaped first, so only the tags this renderer emits
 * can ever reach the DOM.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(value: string): string {
  return value
    /* embeds: [embed](https://…) → responsive iframe */
    .replace(
      /\[embed\]\((https?:[^)\s]+)\)/g,
      '<span class="nt-embed"><iframe src="$1" loading="lazy" title="Embedded media" class="h-64 w-full rounded-xl border border-[#071A2B]/15"></iframe></span>'
    )
    .replace(
      /!\[([^\]]*)\]\((https?:[^)\s]+)\)/g,
      '<img src="$2" alt="$1" loading="lazy" class="my-3 w-full rounded-xl border border-[#071A2B]/10" />'
    )
    .replace(
      /\[([^\]]+)\]\((https?:[^)\s]+|\/[^)\s]*|#[^)\s]*)\)/g,
      '<a href="$2" class="font-semibold text-[#071A2B] underline decoration-[#7FFFD4] decoration-2 underline-offset-2" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em]">$1</code>');
}

export function renderMarkdown(markdown: string): string {
  const escaped = escapeHtml(markdown ?? "");
  const lines = escaped.split(/\r?\n/);
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p class="mb-3 leading-relaxed">${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      const sizes: Record<number, string> = {
        1: "text-2xl font-extrabold mt-5 mb-2",
        2: "text-xl font-extrabold mt-5 mb-2",
        3: "text-lg font-bold mt-4 mb-1.5",
        4: "text-base font-bold mt-4 mb-1.5",
      };
      html.push(
        `<h${level} class="${sizes[level]} tracking-tight text-[#071A2B]">${inline(
          heading[2]
        )}</h${level}>`
      );
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushParagraph();
      closeList();
      html.push('<hr class="my-5 border-[#071A2B]/10" />');
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(
        `<blockquote class="my-3 border-l-4 border-[#7FFFD4] bg-slate-50 px-4 py-2 text-sm italic text-slate-600">${inline(
          quote[1]
        )}</blockquote>`
      );
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      if (listType !== "ul") {
        closeList();
        html.push('<ul class="mb-3 ml-5 list-disc space-y-1">');
        listType = "ul";
      }
      html.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }

    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      if (listType !== "ol") {
        closeList();
        html.push('<ol class="mb-3 ml-5 list-decimal space-y-1">');
        listType = "ol";
      }
      html.push(`<li>${inline(numbered[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(line);
  }

  flushParagraph();
  closeList();

  return html.join("\n");
}

/** Plain-text excerpt of markdown content (used for previews and counts). */
export function toPlainText(markdown: string): string {
  return (markdown ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*`>_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(markdown: string): number {
  return toPlainText(markdown).split(/\s+/).filter(Boolean).length;
}

export function readingTimeLabel(markdown: string): string {
  const words = countWords(markdown);
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

/* -------------------------------------------------------------------------- */
/*                          TOOLBAR TEXT TRANSFORMS                           */
/* -------------------------------------------------------------------------- */

export interface SelectionEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

function wrap(
  value: string,
  start: number,
  end: number,
  prefix: string,
  suffix = prefix,
  placeholder = "text"
): SelectionEdit {
  const selected = value.slice(start, end) || placeholder;
  const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
  return {
    value: next,
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length + selected.length,
  };
}

function linePrefix(
  value: string,
  start: number,
  end: number,
  prefix: string,
  placeholder = "List item"
): SelectionEdit {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const block = value.slice(lineStart, end) || placeholder;
  const transformed = block
    .split("\n")
    .map((line) => `${prefix}${line.replace(/^([-*]|\d+\.)\s+/, "")}`)
    .join("\n");

  const next = `${value.slice(0, lineStart)}${transformed}${value.slice(end)}`;
  return {
    value: next,
    selectionStart: lineStart + prefix.length,
    selectionEnd: lineStart + transformed.length,
  };
}

export const editorCommands = {
  bold: (edit: SelectionEdit): SelectionEdit => wrap(edit.value, edit.selectionStart, edit.selectionEnd, "**"),
  italic: (edit: SelectionEdit): SelectionEdit => wrap(edit.value, edit.selectionStart, edit.selectionEnd, "*"),
  heading: (edit: SelectionEdit): SelectionEdit => linePrefix(edit.value, edit.selectionStart, edit.selectionEnd, "## ", "Section heading"),
  quote: (edit: SelectionEdit): SelectionEdit =>
    linePrefix(edit.value, edit.selectionStart, edit.selectionStart, "> ", "Quoted passage"),
  bulletList: (edit: SelectionEdit): SelectionEdit =>
    linePrefix(edit.value, edit.selectionStart, edit.selectionEnd, "- ", "List item"),
  numberedList: (edit: SelectionEdit): SelectionEdit =>
    linePrefix(edit.value, edit.selectionStart, edit.selectionEnd, "1. ", "List item"),
  link: (edit: SelectionEdit, label: string, href: string): SelectionEdit => {
    const text = label || "link";
    const snippet = `[${text}](${href})`;
    const next = `${edit.value.slice(0, edit.selectionStart)}${snippet}${edit.value.slice(
      edit.selectionEnd
    )}`;
    return {
      value: next,
      selectionStart: edit.selectionStart + snippet.length,
      selectionEnd: edit.selectionStart + snippet.length,
    };
  },
  image: (edit: SelectionEdit, alt: string, url: string): SelectionEdit => {
    const snippet = `![${alt}](${url})`;
    const next = `${edit.value.slice(0, edit.selectionStart)}${snippet}${edit.value.slice(
      edit.selectionEnd
    )}`;
    return {
      value: next,
      selectionStart: edit.selectionStart + snippet.length,
      selectionEnd: edit.selectionStart + snippet.length,
    };
  },
  embed: (edit: SelectionEdit, url: string): SelectionEdit => {
    const snippet = `\n[embed](${url})\n`;
    const next = `${edit.value.slice(0, edit.selectionStart)}${snippet}${edit.value.slice(
      edit.selectionEnd
    )}`;
    return {
      value: next,
      selectionStart: edit.selectionStart + snippet.length,
      selectionEnd: edit.selectionStart + snippet.length,
    };
  },
};
