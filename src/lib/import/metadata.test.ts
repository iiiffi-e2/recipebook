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

  it("parses hyphen-separated timestamps including minutes and seconds", () => {
    const file = { name: "Screenshot_2024-01-02-03-04-05.png", lastModified: 0 } as File;
    expect(getCaptureTime(file)).toBe(new Date(2024, 0, 2, 3, 4, 5).getTime());
  });

  it("prefers lastModified over a date present in the filename", () => {
    const file = { name: "Screenshot_20240102_030405.png", lastModified: 5000 } as File;
    expect(getCaptureTime(file)).toBe(5000);
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

  it("falls back to the base name for all-numeric filenames", () => {
    expect(filenameStem("12345.png")).toBe("12345");
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
