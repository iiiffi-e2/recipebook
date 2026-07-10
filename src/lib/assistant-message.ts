import type { Recipe } from "@/lib/types";

export type AssistantMessagePart =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "link"; text: string; href: string; bold?: boolean };

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function recipeAlreadyLinked(content: string, recipeId: string): boolean {
  return content.includes(`/app/recipes/${recipeId}`);
}

export function linkRecipeReferences(
  content: string,
  recipes: Recipe[]
): { content: string; recipeReferences: string[] } {
  const referenced = new Set<string>();
  let result = content;

  const sorted = [...recipes].sort((a, b) => b.title.length - a.title.length);

  for (const recipe of sorted) {
    if (recipeAlreadyLinked(result, recipe.id)) {
      referenced.add(recipe.id);
      continue;
    }

    const escapedTitle = escapeRegex(recipe.title);
    const boldPattern = new RegExp(`\\*\\*(${escapedTitle})\\*\\*`, "gi");
    const plainPattern = new RegExp(`(?<!\\[)(${escapedTitle})(?!\\])`, "gi");

    const boldLinked = result.replace(boldPattern, (_match, title: string) => {
      referenced.add(recipe.id);
      return `**[${title}](/app/recipes/${recipe.id})**`;
    });
    if (boldLinked !== result) {
      result = boldLinked;
      continue;
    }

    result = result.replace(plainPattern, (match) => {
      referenced.add(recipe.id);
      return `[${match}](/app/recipes/${recipe.id})`;
    });
  }

  return { content: result, recipeReferences: [...referenced] };
}

export function parseAssistantMessage(content: string): AssistantMessagePart[] {
  const parts: AssistantMessagePart[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    const boldLinkMatch = remaining.match(
      /^\*\*\[([^\]]+)\]\((\/app\/recipes\/[^)]+)\)\*\*/
    );
    if (boldLinkMatch) {
      parts.push({
        type: "link",
        text: boldLinkMatch[1],
        href: boldLinkMatch[2],
        bold: true,
      });
      remaining = remaining.slice(boldLinkMatch[0].length);
      continue;
    }

    const linkMatch = remaining.match(/^\[([^\]]+)\]\((\/app\/recipes\/[^)]+)\)/);
    if (linkMatch) {
      parts.push({
        type: "link",
        text: linkMatch[1],
        href: linkMatch[2],
      });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push({ type: "bold", text: boldMatch[1] });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    const textMatch = remaining.match(/^[^[*]+/);
    if (textMatch) {
      parts.push({ type: "text", text: textMatch[0] });
      remaining = remaining.slice(textMatch[0].length);
      continue;
    }

    parts.push({ type: "text", text: remaining[0] });
    remaining = remaining.slice(1);
  }

  return parts;
}
