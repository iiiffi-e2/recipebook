import { describe, it, expect } from "vitest";
import { isUsableRecipe } from "./usable-recipe";

describe("isUsableRecipe", () => {
  it("returns false when ingredients and instructions are empty", () => {
    expect(isUsableRecipe({ ingredients: [], instructions: [] })).toBe(false);
    expect(isUsableRecipe({})).toBe(false);
  });

  it("returns true when at least one ingredient has a name", () => {
    expect(
      isUsableRecipe({
        ingredients: [{ name: "flour" }],
        instructions: [],
      })
    ).toBe(true);
  });

  it("returns true when at least one instruction has text", () => {
    expect(
      isUsableRecipe({
        ingredients: [],
        instructions: [{ text: "Mix well" }],
      })
    ).toBe(true);
  });

  it("ignores blank ingredient names and blank instruction text", () => {
    expect(
      isUsableRecipe({
        ingredients: [{ name: "  " }, { ingredient: "" }],
        instructions: [{ text: "" }, "   "],
      })
    ).toBe(false);
  });

  it("accepts string instructions", () => {
    expect(isUsableRecipe({ instructions: ["Bake 20 minutes"] })).toBe(true);
  });
});
