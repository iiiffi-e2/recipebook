import type { Difficulty, MealType, Recipe } from "./types";

const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1200&h=800&fit=crop";

type ExtractedIngredient = {
  amount?: string | number;
  unit?: string;
  name?: string;
  notes?: string;
  ingredient?: string;
};

type ExtractedInstruction = {
  step?: number;
  text?: string;
  instruction?: string;
  timerMinutes?: number | null;
};

type ExtractedRecipe = {
  title?: string;
  description?: string;
  ingredients?: ExtractedIngredient[];
  instructions?: ExtractedInstruction[] | string[];
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number | null;
  difficulty?: string;
  cuisine?: string | null;
  category?: string;
  tags?: string[];
  cookingMethod?: string | null;
  source?: Recipe["source"] | null;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function normalizeDifficulty(value?: string): Difficulty {
  if (value === "easy" || value === "medium" || value === "hard") {
    return value;
  }
  return "medium";
}

function inferMealTypes(category?: string, tags: string[] = []): MealType[] {
  const haystack = `${category ?? ""} ${tags.join(" ")}`.toLowerCase();
  if (haystack.includes("dessert") || haystack.includes("cookie") || haystack.includes("pie")) {
    return ["dessert"];
  }
  if (haystack.includes("breakfast") || haystack.includes("pancake")) {
    return ["breakfast"];
  }
  if (haystack.includes("appetizer")) {
    return ["appetizer"];
  }
  if (haystack.includes("snack")) {
    return ["snack"];
  }
  return ["dinner"];
}

export function normalizeExtractedRecipe(
  raw: ExtractedRecipe,
  recipeId: string,
  options?: { previewUrl?: string; previewUrls?: string[]; fileName?: string }
): Recipe {
  const now = new Date().toISOString();
  const fallbackTitle =
    options?.fileName?.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim() ||
    "Imported Recipe";

  const previews =
    options?.previewUrls && options.previewUrls.length > 0
      ? options.previewUrls
      : options?.previewUrl
        ? [options.previewUrl]
        : [];

  const ingredients = (raw.ingredients ?? []).map((ingredient, index) => ({
    id: String(index + 1),
    amount: String(ingredient.amount ?? ""),
    unit: String(ingredient.unit ?? ""),
    name: String(ingredient.name ?? ingredient.ingredient ?? ""),
    notes: ingredient.notes ? String(ingredient.notes) : undefined,
  }));

  const instructions = (raw.instructions ?? []).map((instruction, index) => {
    if (typeof instruction === "string") {
      return {
        id: String(index + 1),
        step: index + 1,
        text: instruction,
      };
    }

    return {
      id: String(index + 1),
      step: instruction.step ?? index + 1,
      text: String(instruction.text ?? instruction.instruction ?? ""),
      timerMinutes:
        instruction.timerMinutes != null && Number(instruction.timerMinutes) > 0
          ? Number(instruction.timerMinutes)
          : undefined,
    };
  });

  const heroImage = previews[0] ?? DEFAULT_HERO;
  const category = raw.category?.trim() || "Imported";
  const tags = raw.tags ?? [];

  return {
    id: recipeId,
    title: raw.title?.trim() || fallbackTitle,
    description: raw.description?.trim() || undefined,
    heroImage,
    gallery: previews.length > 0 ? previews : [DEFAULT_HERO],
    ingredients,
    instructions,
    prepTime: Number(raw.prepTime ?? 0),
    cookTime: Number(raw.cookTime ?? 0),
    servings: Number(raw.servings ?? 4),
    difficulty: normalizeDifficulty(raw.difficulty),
    cuisine: raw.cuisine ?? undefined,
    category,
    tags,
    mealTypes: inferMealTypes(category, tags),
    cookingMethod: raw.cookingMethod ?? undefined,
    source: raw.source ?? { type: "other", name: "Imported upload" },
    originals: previews.map((url, index) => ({
      id: `orig-${recipeId}-${index}`,
      type: "image" as const,
      url,
      uploadedAt: now,
    })),
    memories: [],
    comments: [],
    cookingHistory: [],
    versions: [],
    timeline: [
      {
        id: `t-${recipeId}`,
        type: "imported",
        title: "Recipe imported",
        description: options?.fileName
          ? `Imported from ${options.fileName}`
          : "Imported with AI extraction",
        timestamp: now,
      },
    ],
    collections: ["imported", slugify(category) || "imported"].filter(
      (value, index, array) => array.indexOf(value) === index
    ),
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
  };
}
