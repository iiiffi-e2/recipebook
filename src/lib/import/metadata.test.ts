import { describe, it, expect } from "vitest";
import {
  getCaptureTime,
  filenameStem,
  numericSuffix,
  preClusterByMetadata,
} from "./metadata";
import type { ImportImageMeta } from "./types";

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

function meta(partial: Partial<ImportImageMeta> & { id: string }): ImportImageMeta {
  return {
    fileName: `${partial.id}.jpg`,
    fileType: "image/jpeg",
    fileSize: 1000,
    captureTime: 0,
    ...partial,
  };
}

describe("preClusterByMetadata", () => {
  it("groups sequential filenames captured close together", () => {
    const items = [
      meta({ id: "a", fileName: "IMG_0412.jpg", captureTime: 1000 }),
      meta({ id: "b", fileName: "IMG_0413.jpg", captureTime: 4000 }),
    ];
    const clusters = preClusterByMetadata(items);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("splits images far apart in time into separate clusters", () => {
    const items = [
      meta({ id: "a", fileName: "IMG_0412.jpg", captureTime: 1000 }),
      meta({ id: "b", fileName: "IMG_0413.jpg", captureTime: 1_000_000 }),
    ];
    const clusters = preClusterByMetadata(items);
    expect(clusters).toHaveLength(2);
  });

  it("splits unrelated filenames even when close in time", () => {
    const items = [
      meta({ id: "a", fileName: "cake.jpg", captureTime: 1000 }),
      meta({ id: "b", fileName: "soup.jpg", captureTime: 2000 }),
    ];
    const clusters = preClusterByMetadata(items);
    expect(clusters).toHaveLength(2);
  });

  it("puts each image in its own cluster for a typical bulk drop", () => {
    const items = [
      meta({ id: "a", fileName: "lasagna.jpg", captureTime: 1000 }),
      meta({ id: "b", fileName: "tacos.jpg", captureTime: 500_000 }),
      meta({ id: "c", fileName: "pie.jpg", captureTime: 900_000 }),
    ];
    const clusters = preClusterByMetadata(items);
    expect(clusters).toHaveLength(3);
  });
});
