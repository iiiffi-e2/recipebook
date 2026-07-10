import { describe, it, expect } from "vitest";
import { normalizeCategory, RECIPE_CATEGORIES } from "./categories";

describe("normalizeCategory", () => {
  it("returns canonical categories unchanged", () => {
    for (const category of RECIPE_CATEGORIES) {
      expect(normalizeCategory(category)).toBe(category);
    }
  });

  it("maps common synonyms to canonical categories", () => {
    expect(normalizeCategory("Entrée")).toBe("Main Course");
    expect(normalizeCategory("main course")).toBe("Main Course");
    expect(normalizeCategory("Desserts")).toBe("Dessert");
    expect(normalizeCategory("Soups")).toBe("Soup");
    expect(normalizeCategory("Beverage")).toBe("Drink");
    expect(normalizeCategory("Appetizers")).toBe("Appetizer");
    expect(normalizeCategory("Imported")).toBe("Main Course");
    expect(normalizeCategory("Dinner")).toBe("Main Course");
  });

  it("falls back to Main Course for unknown values", () => {
    expect(normalizeCategory("")).toBe("Main Course");
    expect(normalizeCategory(undefined)).toBe("Main Course");
    expect(normalizeCategory("mystery category")).toBe("Main Course");
  });
});
