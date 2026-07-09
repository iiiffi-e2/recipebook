import { describe, it, expect } from "vitest";
import { getCaptureTime, filenameStem, numericSuffix } from "./metadata";

describe("getCaptureTime", () => {
  it("uses lastModified when present", () => {
    const file = { name: "a.jpg", lastModified: 1000 } as File;
    expect(getCaptureTime(file)).toBe(1000);
  });

  it("falls back to a parsed timestamp in the filename", () => {
    const file = { name: "Screenshot_20240102_030405.png", lastModified: 0 } as File;
    // 2024-01-02 03:04:05 local -> a positive epoch
    expect(getCaptureTime(file)).toBeGreaterThan(0);
  });

  it("returns a number even with no signals", () => {
    const file = { name: "recipe.png", lastModified: 0 } as File;
    expect(typeof getCaptureTime(file)).toBe("number");
  });
});

describe("filenameStem", () => {
  it("strips extension, trailing digits and separators, lowercases", () => {
    expect(filenameStem("IMG_0412.JPG")).toBe("img");
    expect(filenameStem("Screenshot-2024-01-02-12.png")).toBe("screenshot");
    expect(filenameStem("cake.png")).toBe("cake");
  });
});

describe("numericSuffix", () => {
  it("returns the trailing number", () => {
    expect(numericSuffix("IMG_0412.jpg")).toBe(412);
    expect(numericSuffix("photo10.png")).toBe(10);
  });
  it("returns null when there is no trailing number", () => {
    expect(numericSuffix("cake.png")).toBeNull();
  });
});
