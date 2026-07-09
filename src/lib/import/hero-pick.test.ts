import { describe, it, expect } from "vitest";
import { pickBestHeroCandidate } from "./hero-pick";

describe("pickBestHeroCandidate", () => {
  it("returns null when no candidates clear the threshold", () => {
    expect(
      pickBestHeroCandidate(
        [
          { index: 0, score: 0.1 },
          { index: 1, score: 0.2 },
        ],
        0.35
      )
    ).toBeNull();
  });

  it("picks the highest scoring candidate above threshold", () => {
    expect(
      pickBestHeroCandidate(
        [
          { index: 0, score: 0.4 },
          { index: 1, score: 0.8 },
          { index: 2, score: 0.5 },
        ],
        0.35
      )
    ).toEqual({ index: 1, score: 0.8 });
  });
});
