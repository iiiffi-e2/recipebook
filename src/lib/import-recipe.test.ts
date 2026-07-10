import { describe, it, expect } from "vitest";
import { normalizeExtractedRecipe } from "./import-recipe";

describe("normalizeExtractedRecipe", () => {
  it("normalizes instructions when the model returns a single string", () => {
    const recipe = normalizeExtractedRecipe(
      {
        title: "Pancakes",
        instructions: "Mix batter. Cook on a hot griddle until golden.",
      },
      "imported-1"
    );

    expect(recipe.instructions).toEqual([
      {
        id: "1",
        step: 1,
        text: "Mix batter. Cook on a hot griddle until golden.",
      },
    ]);
  });

  it("normalizes ingredients when the model returns a single string", () => {
    const recipe = normalizeExtractedRecipe(
      {
        title: "Pancakes",
        ingredients: "2 cups flour, 1 cup milk",
      },
      "imported-1"
    );

    expect(recipe.ingredients).toEqual([
      {
        id: "1",
        amount: "",
        unit: "",
        name: "2 cups flour, 1 cup milk",
      },
    ]);
  });

  it("keeps array instructions and ingredients working", () => {
    const recipe = normalizeExtractedRecipe(
      {
        title: "Soup",
        ingredients: [{ amount: "1", unit: "cup", name: "broth" }],
        instructions: [{ step: 1, text: "Simmer" }, "Serve hot"],
      },
      "imported-2"
    );

    expect(recipe.ingredients).toHaveLength(1);
    expect(recipe.instructions).toEqual([
      { id: "1", step: 1, text: "Simmer" },
      { id: "2", step: 2, text: "Serve hot" },
    ]);
  });

  it("normalizes category values during import", () => {
    const recipe = normalizeExtractedRecipe(
      {
        title: "Steak Dinner",
        category: "Entrée",
      },
      "imported-3"
    );

    expect(recipe.category).toBe("Main Course");
  });
});
