const STOP_WORDS = new Set([
  "about", "after", "again", "also", "among", "because", "being", "could", "from", "have", "into",
  "more", "most", "other", "over", "such", "than", "that", "their", "there", "these", "they", "this",
  "through", "using", "what", "when", "where", "which", "while", "with", "would", "your", "will",
]);

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#.-]+/g, " ").trim();

export const extractKeywords = (title: string, content: string, category: string) => {
  const source = `${title} ${title} ${content} ${category}`;
  const terms = normalize(source).split(/\s+/).filter((term) => term.length >= 3 && !STOP_WORDS.has(term));
  const counts = new Map<string, number>();

  for (const term of terms) counts.set(term, (counts.get(term) ?? 0) + 1);

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 12)
    .map(([term]) => term);
};

export const createSlug = (title: string) =>
  normalize(title).replace(/[.+#]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
