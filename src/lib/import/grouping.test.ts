import { describe, it, expect } from "vitest";
import {
  mergeGroups,
  splitImageToNewGroup,
  reorderImageInGroup,
  explodeGroup,
  applyConfidenceGate,
} from "./grouping";
import type { RecipeGroup } from "./types";

function group(id: string, imageIds: string[], confidence = 1): RecipeGroup {
  return { id, imageIds, confidence, needsReview: false };
}

describe("mergeGroups", () => {
  it("merges b into a preserving order and drops b", () => {
    const groups = [group("g1", ["a"]), group("g2", ["b", "c"])];
    const result = mergeGroups(groups, "g1", "g2");
    expect(result).toHaveLength(1);
    expect(result[0].imageIds).toEqual(["a", "b", "c"]);
    expect(result[0].confidence).toBe(1);
  });

  it("takes the minimum confidence of the two merged groups", () => {
    const groups = [group("g1", ["a"], 0.9), group("g2", ["b"], 0.4)];
    const result = mergeGroups(groups, "g1", "g2");
    expect(result[0].confidence).toBe(0.4);
  });

  it("no-ops when the source id is missing", () => {
    const groups = [group("g1", ["a"]), group("g2", ["b"])];
    const result = mergeGroups(groups, "g1", "missing");
    expect(result).toBe(groups);
    expect(result).toHaveLength(2);
  });

  it("no-ops when targetId equals sourceId", () => {
    const groups = [group("g1", ["a", "b"])];
    const result = mergeGroups(groups, "g1", "g1");
    expect(result).toBe(groups);
    expect(result[0].imageIds).toEqual(["a", "b"]);
  });
});

describe("splitImageToNewGroup", () => {
  it("pulls one image into a new group", () => {
    const groups = [group("g1", ["a", "b", "c"])];
    const result = splitImageToNewGroup(groups, "g1", "b");
    expect(result).toHaveLength(2);
    expect(result[0].imageIds).toEqual(["a", "c"]);
    expect(result[1].imageIds).toEqual(["b"]);
  });

  it("does not leave an empty group when the last image is split out", () => {
    const groups = [group("g1", ["a"])];
    const result = splitImageToNewGroup(groups, "g1", "a");
    expect(result).toHaveLength(1);
    expect(result[0].imageIds).toEqual(["a"]);
  });

  it("no-ops when the imageId is not present in the group", () => {
    const groups = [group("g1", ["a", "b", "c"])];
    const result = splitImageToNewGroup(groups, "g1", "z");
    expect(result).toBe(groups);
    expect(result).toHaveLength(1);
    expect(result[0].imageIds).toEqual(["a", "b", "c"]);
  });
});

describe("reorderImageInGroup", () => {
  it("moves an image from one index to another", () => {
    const groups = [group("g1", ["a", "b", "c"])];
    const result = reorderImageInGroup(groups, "g1", 2, 0);
    expect(result[0].imageIds).toEqual(["c", "a", "b"]);
  });

  it("returns imageIds unchanged when fromIndex is out of range", () => {
    const groups = [group("g1", ["a", "b", "c"])];
    const result = reorderImageInGroup(groups, "g1", -1, 0);
    expect(result[0].imageIds).toEqual(["a", "b", "c"]);
  });

  it("returns imageIds unchanged when toIndex is out of range", () => {
    const groups = [group("g1", ["a", "b", "c"])];
    const result = reorderImageInGroup(groups, "g1", 0, 5);
    expect(result[0].imageIds).toEqual(["a", "b", "c"]);
  });
});

describe("explodeGroup", () => {
  it("splits every image into its own group", () => {
    const groups = [group("g1", ["a", "b", "c"])];
    const result = explodeGroup(groups, "g1");
    expect(result).toHaveLength(3);
    expect(result.map((g) => g.imageIds)).toEqual([["a"], ["b"], ["c"]]);
  });
});

describe("applyConfidenceGate", () => {
  it("flags groups below the threshold for review", () => {
    const groups = [group("g1", ["a"], 0.95), group("g2", ["b", "c"], 0.5)];
    const result = applyConfidenceGate(groups, 0.8);
    expect(result[0].needsReview).toBe(false);
    expect(result[1].needsReview).toBe(true);
  });
});
