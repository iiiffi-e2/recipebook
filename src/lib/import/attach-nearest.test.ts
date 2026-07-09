import { describe, it, expect } from "vitest";
import { findNearestCompletedRecipe, ATTACH_TIME_WINDOW_MS } from "./attach-nearest";
import type { CompletedBatchRecipe } from "./attach-nearest";

function completed(
  partial: Partial<CompletedBatchRecipe> & { recipeId: string }
): CompletedBatchRecipe {
  return {
    title: "Recipe",
    captureTimes: [1000],
    fileNames: ["IMG_0412.jpg"],
    ...partial,
  };
}

describe("findNearestCompletedRecipe", () => {
  it("returns null when there are no completed recipes", () => {
    expect(
      findNearestCompletedRecipe({
        captureTimes: [1000],
        fileNames: ["notes.jpg"],
        completed: [],
      })
    ).toBeNull();
  });

  it("picks a recipe within the time window with shared stem", () => {
    const result = findNearestCompletedRecipe({
      captureTimes: [5000],
      fileNames: ["IMG_0415.jpg"],
      completed: [
        completed({
          recipeId: "r1",
          title: "Tacos",
          captureTimes: [1000],
          fileNames: ["IMG_0412.jpg", "IMG_0413.jpg"],
        }),
        completed({
          recipeId: "r2",
          title: "Pie",
          captureTimes: [900_000],
          fileNames: ["pie.jpg"],
        }),
      ],
    });
    expect(result?.recipeId).toBe("r1");
    expect(result?.title).toBe("Tacos");
  });

  it("rejects candidates outside the time window even with similar names", () => {
    const result = findNearestCompletedRecipe({
      captureTimes: [ATTACH_TIME_WINDOW_MS + 50_000],
      fileNames: ["IMG_0415.jpg"],
      completed: [
        completed({
          recipeId: "r1",
          captureTimes: [1000],
          fileNames: ["IMG_0412.jpg"],
        }),
      ],
    });
    expect(result).toBeNull();
  });

  it("matches by consecutive numeric suffix within the window", () => {
    const result = findNearestCompletedRecipe({
      captureTimes: [4000],
      fileNames: ["photo11.png"],
      completed: [
        completed({
          recipeId: "r1",
          title: "Soup",
          captureTimes: [1000],
          fileNames: ["photo10.png"],
        }),
      ],
    });
    expect(result?.recipeId).toBe("r1");
  });
});
