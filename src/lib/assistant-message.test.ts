import { describe, expect, it } from "vitest";
import { linkRecipeReferences, parseAssistantMessage } from "./assistant-message";
import type { Recipe } from "./types";

function makeRecipe(id: string, title: string): Recipe {
  return {
    id,
    title,
    heroImage: "",
    gallery: [],
    ingredients: [],
    instructions: [],
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    difficulty: "easy",
    category: "Main",
    tags: [],
    mealTypes: ["dinner"],
    source: { type: "family" },
    originals: [],
    memories: [],
    comments: [],
    cookingHistory: [],
    versions: [],
    timeline: [],
    collections: [],
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
}

describe("linkRecipeReferences", () => {
  const recipes = [
    makeRecipe("pie-1", "Grandma Rose's Apple Pie"),
    makeRecipe("chili-1", "Dad's Championship Chili"),
  ];

  it("links plain recipe titles", () => {
    const { content, recipeReferences } = linkRecipeReferences(
      "Try Grandma Rose's Apple Pie for dessert.",
      recipes
    );

    expect(content).toBe(
      "Try [Grandma Rose's Apple Pie](/app/recipes/pie-1) for dessert."
    );
    expect(recipeReferences).toEqual(["pie-1"]);
  });

  it("links bold recipe titles", () => {
    const { content } = linkRecipeReferences(
      "• **Dad's Championship Chili** (Main, 30 min)",
      recipes
    );

    expect(content).toBe(
      "• **[Dad's Championship Chili](/app/recipes/chili-1)** (Main, 30 min)"
    );
  });

  it("does not double-link existing markdown links", () => {
    const input =
      "See [Grandma Rose's Apple Pie](/app/recipes/pie-1) for details.";
    const { content } = linkRecipeReferences(input, recipes);

    expect(content).toBe(input);
  });
});

describe("parseAssistantMessage", () => {
  it("renders recipe links and bold links", () => {
    const parts = parseAssistantMessage(
      "Try [Apple Pie](/app/recipes/pie-1) or **[Chili](/app/recipes/chili-1)** tonight."
    );

    expect(parts).toEqual([
      { type: "text", text: "Try " },
      { type: "link", text: "Apple Pie", href: "/app/recipes/pie-1" },
      { type: "text", text: " or " },
      {
        type: "link",
        text: "Chili",
        href: "/app/recipes/chili-1",
        bold: true,
      },
      { type: "text", text: " tonight." },
    ]);
  });
});
