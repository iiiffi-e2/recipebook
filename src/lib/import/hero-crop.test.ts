import { describe, it, expect } from "vitest";
import {
  findPhotoRegionFromImageData,
  findScoredPhotoRegionFromImageData,
  scoreWholeImageFromImageData,
  PHOTO_SCORE_THRESHOLD,
  type CropBox,
} from "./hero-crop";
import { pickBestHeroCandidate } from "./hero-pick";

function makeImageData(width: number, height: number, fill: (x: number, y: number) => [number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = fill(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

/** Flat near-white chrome with a textured photo block in the middle. */
function screenshotWithPhotoBlock(): ImageData {
  const w = 240;
  const h = 480;
  return makeImageData(w, h, (x, y) => {
    const inPhoto = y >= 120 && y < 360 && x >= 20 && x < 220;
    if (!inPhoto) {
      // Flat UI / text bands
      if (y < 80) return [250, 250, 250];
      if (y >= 400) return [245, 245, 245];
      return [248, 248, 248];
    }
    // High-variance "food photo" texture
    const n = ((x * 17 + y * 31) % 97) / 97;
    return [
      Math.floor(80 + n * 140),
      Math.floor(40 + ((x * 13 + y) % 80)),
      Math.floor(30 + ((y * 7 + x) % 60)),
    ];
  });
}

/** Entire frame is textured like a food photo. */
function fullFramePhoto(): ImageData {
  return makeImageData(240, 180, (x, y) => {
    const n = ((x * 17 + y * 31) % 97) / 97;
    return [
      Math.floor(60 + n * 160),
      Math.floor(50 + ((x * 11 + y * 3) % 100)),
      Math.floor(40 + ((y * 9 + x) % 70)),
    ];
  });
}

/** Flat page with only a tiny speck of texture. */
function tinySpeck(): ImageData {
  return makeImageData(240, 480, (x, y) => {
    if (x >= 110 && x < 130 && y >= 230 && y < 250) {
      const n = ((x + y) % 17) / 17;
      return [Math.floor(n * 255), 80, 40];
    }
    return [250, 250, 250];
  });
}

function coversExpected(box: CropBox, expected: CropBox, slack = 30): boolean {
  return (
    box.x <= expected.x + slack &&
    box.y <= expected.y + slack &&
    box.x + box.width >= expected.x + expected.width - slack &&
    box.y + box.height >= expected.y + expected.height - slack
  );
}

describe("findPhotoRegionFromImageData", () => {
  it("finds the photo block in a tall screenshot with chrome", () => {
    const image = screenshotWithPhotoBlock();
    const box = findPhotoRegionFromImageData(image);
    expect(box).not.toBeNull();
    expect(
      coversExpected(box!, { x: 20, y: 120, width: 200, height: 240 })
    ).toBe(true);
  });

  it("returns null when the whole image is already a photo", () => {
    expect(findPhotoRegionFromImageData(fullFramePhoto())).toBeNull();
  });

  it("returns null when the only textured region is too small", () => {
    expect(findPhotoRegionFromImageData(tinySpeck())).toBeNull();
  });
});

/** Dense dark text lines on a light page — high edges, low color. */
function textHeavyPage(): ImageData {
  return makeImageData(240, 480, (x, y) => {
    const onGlyph = y % 8 < 3 && x % 5 !== 0;
    return onGlyph ? [30, 30, 30] : [250, 250, 248];
  });
}

/** Recipe-card style: chrome + real food photo block. */
function recipeCardWithFoodPhoto(): ImageData {
  return screenshotWithPhotoBlock();
}

describe("scoreWholeImageFromImageData", () => {
  it("scores a full-frame food photo above the photo threshold", () => {
    expect(scoreWholeImageFromImageData(fullFramePhoto())).toBeGreaterThanOrEqual(
      PHOTO_SCORE_THRESHOLD
    );
  });

  it("scores a flat text-like page below the photo threshold", () => {
    const flat = makeImageData(240, 480, () => [250, 250, 250]);
    expect(scoreWholeImageFromImageData(flat)).toBeLessThan(PHOTO_SCORE_THRESHOLD);
  });

  it("scores dense text pages below the photo threshold", () => {
    expect(scoreWholeImageFromImageData(textHeavyPage())).toBeLessThan(PHOTO_SCORE_THRESHOLD);
  });
});

describe("hero pick prefers food over text crops", () => {
  it("ranks a food photo region above a text-heavy region", () => {
    const food = findScoredPhotoRegionFromImageData(recipeCardWithFoodPhoto());
    const textCrop = findScoredPhotoRegionFromImageData(textHeavyPage());
    // When text fills the frame, scoring falls back to whole-image — that path
    // previously outranked real food photos because glyph edges look "photo-like".
    const textWhole = scoreWholeImageFromImageData(textHeavyPage());

    expect(food).not.toBeNull();
    const foodScore = food!.score;
    const textScore = Math.max(textCrop?.score ?? 0, textWhole);

    expect(foodScore).toBeGreaterThan(textScore);
    expect(textWhole).toBeLessThan(PHOTO_SCORE_THRESHOLD);
    expect(
      pickBestHeroCandidate(
        [
          { index: 0, score: foodScore },
          { index: 1, score: textScore },
        ],
        PHOTO_SCORE_THRESHOLD
      )?.index
    ).toBe(0);
  });
});
