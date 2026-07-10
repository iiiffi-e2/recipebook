export function formatTagLabel(tag: string): string {
  return tag.replace(/-/g, " ");
}

export function parseTagsParam(value: string | null): string[] {
  if (!value?.trim()) {
    return [];
  }

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const part of value.split(",")) {
    const tag = part.trim();
    if (!tag) continue;

    const key = tag.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

export function tagsMatch(recipeTags: string[], filterTags: string[]): boolean {
  if (filterTags.length === 0) {
    return true;
  }

  const recipeKeys = new Set(recipeTags.map((tag) => tag.toLowerCase()));
  return filterTags.some((tag) => recipeKeys.has(tag.toLowerCase()));
}

export function tagFilterHref(tag: string, activeTags: string[] = []): string {
  const normalized = tag.toLowerCase();
  const next = activeTags.some((active) => active.toLowerCase() === normalized)
    ? activeTags
    : [...activeTags, tag];

  if (next.length === 0) {
    return "/app";
  }

  return `/app?tags=${next.map(encodeURIComponent).join(",")}`;
}

export function buildTagsQuery(activeTags: string[]): string {
  if (activeTags.length === 0) {
    return "";
  }

  return `tags=${activeTags.map(encodeURIComponent).join(",")}`;
}
