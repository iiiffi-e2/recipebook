import { describe, it, expect } from "vitest";
import { parseTagsParam, tagsMatch, tagFilterHref } from "./tags";

describe("parseTagsParam", () => {
  it("parses comma-separated tags and deduplicates", () => {
    expect(parseTagsParam("kid-friendly, vegetarian, kid-friendly")).toEqual([
      "kid-friendly",
      "vegetarian",
    ]);
  });

  it("returns an empty array for blank values", () => {
    expect(parseTagsParam(null)).toEqual([]);
    expect(parseTagsParam("")).toEqual([]);
  });
});

describe("tagsMatch", () => {
  it("matches any selected tag", () => {
    expect(tagsMatch(["vegetarian", "quick-meals"], ["kid-friendly", "vegetarian"])).toBe(
      true
    );
    expect(tagsMatch(["slow-cooker"], ["vegetarian"])).toBe(false);
  });
});

describe("tagFilterHref", () => {
  it("adds a tag to the active filter list", () => {
    expect(tagFilterHref("vegetarian", ["kid-friendly"])).toBe(
      "/app?tags=kid-friendly,vegetarian"
    );
  });

  it("does not duplicate an active tag", () => {
    expect(tagFilterHref("kid-friendly", ["kid-friendly"])).toBe("/app?tags=kid-friendly");
  });
});
