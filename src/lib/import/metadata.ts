import type { ImportImageMeta } from "./types";

export const PRECLUSTER_TIME_WINDOW_MS = 30_000;

export function getCaptureTime(file: File): number {
  if (file.lastModified && file.lastModified > 0) {
    return file.lastModified;
  }

  const match = file.name.match(
    /(20\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_ ]?(\d{2})?[-_:]?(\d{2})?[-_:]?(\d{2})?/
  );
  if (match) {
    const [, y, mo, d, h = "0", mi = "0", s = "0"] = match;
    const parsed = new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s)
    ).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }

  return 0;
}

export function filenameStem(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").toLowerCase();
  const stripped = base
    .replace(/[\s._-]*\d+([\s._-]\d+)*$/, "")
    .replace(/[\s._-]+$/, "");
  return stripped.length > 0 ? stripped : base;
}

export function numericSuffix(fileName: string): number | null {
  const base = fileName.replace(/\.[^.]+$/, "");
  const match = base.match(/(\d+)$/);
  return match ? Number(match[1]) : null;
}
