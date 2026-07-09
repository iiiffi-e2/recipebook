import { describe, it, expect, vi } from "vitest";
import {
  formatUploadError,
  isRetryableUploadError,
  withUploadRetries,
} from "./upload-reliability";

describe("isRetryableUploadError", () => {
  it("treats Failed to fetch as retryable", () => {
    expect(isRetryableUploadError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("treats generic network errors as retryable", () => {
    expect(isRetryableUploadError(new Error("NetworkError when attempting to fetch"))).toBe(
      true
    );
    expect(isRetryableUploadError(new Error("fetch failed"))).toBe(true);
  });

  it("does not retry auth or validation errors", () => {
    expect(isRetryableUploadError(new Error("new row violates row-level security"))).toBe(
      false
    );
    expect(isRetryableUploadError(new Error("The resource already exists"))).toBe(false);
  });
});

describe("formatUploadError", () => {
  it("maps Failed to fetch to a clear user message", () => {
    expect(formatUploadError(new TypeError("Failed to fetch"))).toMatch(/network/i);
  });

  it("passes through specific storage errors", () => {
    expect(formatUploadError(new Error("Bucket not found"))).toBe("Bucket not found");
  });
});

describe("withUploadRetries", () => {
  it("returns on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withUploadRetries(fn, { attempts: 3, delayMs: 0 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries retryable failures then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue("ok");

    await expect(withUploadRetries(fn, { attempts: 3, delayMs: 0 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-retryable errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Bucket not found"));
    await expect(withUploadRetries(fn, { attempts: 3, delayMs: 0 })).rejects.toThrow(
      "Bucket not found"
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws the last error after exhausting attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(withUploadRetries(fn, { attempts: 2, delayMs: 0 })).rejects.toThrow(
      "Failed to fetch"
    );
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
