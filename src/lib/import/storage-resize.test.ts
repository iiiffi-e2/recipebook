import { describe, it, expect } from "vitest";
import {
  STORAGE_MAX_DIM,
  STORAGE_JPEG_QUALITY,
  shouldCompressForStorage,
} from "./storage-resize";

describe("shouldCompressForStorage", () => {
  it("skips non-images", () => {
    expect(
      shouldCompressForStorage({
        type: "application/pdf",
        size: 5_000_000,
        width: 4000,
        height: 3000,
      })
    ).toBe(false);
  });

  it("compresses when either dimension exceeds the storage max", () => {
    expect(
      shouldCompressForStorage({
        type: "image/jpeg",
        size: 500_000,
        width: STORAGE_MAX_DIM + 1,
        height: 800,
      })
    ).toBe(true);
  });

  it("compresses large files even when under max dimension", () => {
    expect(
      shouldCompressForStorage({
        type: "image/png",
        size: 2_000_000,
        width: 1200,
        height: 800,
      })
    ).toBe(true);
  });

  it("skips small images already under limits", () => {
    expect(
      shouldCompressForStorage({
        type: "image/jpeg",
        size: 400_000,
        width: 1200,
        height: 800,
      })
    ).toBe(false);
  });

  it("exports a quality suitable for mobile uploads", () => {
    expect(STORAGE_JPEG_QUALITY).toBeGreaterThan(0.5);
    expect(STORAGE_JPEG_QUALITY).toBeLessThanOrEqual(0.85);
  });
});
