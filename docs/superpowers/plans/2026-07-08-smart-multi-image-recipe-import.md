# Smart Multi-Image Recipe Import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one recipe span multiple uploaded images (screenshots / card front+back) while still supporting bulk import where each image is its own recipe, using cheap metadata pre-clustering plus confidence-gated AI vision grouping and a review screen for uncertain groups.

**Architecture:** A staged client pipeline replaces the current per-file loop in `ImportDropzone`: (1) pre-cluster dropped images by capture time + filename, (2) a new `/api/ingest/group` vision pass confirms clusters and returns a confidence per group, (3) confident groups auto-save while uncertain groups go to a review screen with merge/split/reorder controls, (4) each confirmed group is extracted into ONE recipe via a multi-image `/api/ingest` call and persisted with multiple `recipe_originals`.

**Tech Stack:** Next.js 16 (App Router route handlers), React 19, Zustand, Supabase, OpenAI GPT-4o vision, Vitest (new, for pure logic).

---

## Read Before Coding

Per `AGENTS.md`, this Next.js version has breaking changes. Before editing any route handler or client component, read the relevant guide under `node_modules/next/dist/docs/` (route handlers, file conventions). The existing handlers in `src/app/api/ingest/route.ts` and `src/app/api/recipes/route.ts` already show the correct pattern for this version — mirror them.

## File Structure

**New files:**
- `src/lib/import/types.ts` — shared types: `ImportImageMeta`, `RecipeGroup`, `GroupingResult`.
- `src/lib/import/metadata.ts` — pure helpers: `getCaptureTime`, `filenameStem`, `numericSuffix`, `preClusterByMetadata`.
- `src/lib/import/grouping.ts` — pure review ops: `mergeGroups`, `splitImageToNewGroup`, `reorderImageInGroup`, `explodeGroup`, `applyConfidenceGate`.
- `src/lib/import/thumbnail.ts` — client-only `createThumbnail(file)` (canvas downscale).
- `src/app/api/ingest/group/route.ts` — AI grouping confirmation endpoint.
- `src/components/import/import-review.tsx` — review screen (uncertain groups).
- `vitest.config.ts` — test runner config.
- `src/lib/import/metadata.test.ts`, `src/lib/import/grouping.test.ts` — unit tests.

**Modified files:**
- `src/app/api/ingest/route.ts` — accept multiple files → one combined extraction.
- `src/app/api/recipes/route.ts` — accept multiple files per recipe.
- `src/lib/supabase/recipes.ts` — `saveRecipe` persists an array of files as multiple originals.
- `src/lib/import-recipe.ts` — `normalizeExtractedRecipe` accepts multiple preview URLs.
- `src/lib/store.ts` — group/review state.
- `src/components/import-dropzone.tsx` — staged pipeline + review integration.
- `package.json` — add Vitest scripts/deps.

## Constants (used across tasks)

- `PRECLUSTER_TIME_WINDOW_MS = 30_000` — max capture-time gap to consider two adjacent images the same recipe.
- `GROUP_CONFIDENCE_THRESHOLD = 0.8` — at/above → auto-save; below → review.
- `GROUP_CHUNK_SIZE = 12` — timeline window per AI grouping call (bounds cost on large batches).
- `THUMBNAIL_MAX_DIM = 512`, `THUMBNAIL_QUALITY = 0.6`.

---

## Task 1: Test infrastructure + shared types

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/import/types.ts`

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest@^3`
Expected: `vitest` added to `devDependencies`.

- [ ] **Step 2: Add test script to `package.json`**

In the `"scripts"` block, add a `test` entry alongside the existing scripts:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run"
  },
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create `src/lib/import/types.ts`**

```ts
export interface ImportImageMeta {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  captureTime: number;
  previewUrl?: string;
  thumbnail?: string;
}

export interface RecipeGroup {
  id: string;
  imageIds: string[];
  confidence: number;
  needsReview: boolean;
}

export interface GroupingResult {
  groups: RecipeGroup[];
}
```

- [ ] **Step 5: Verify the toolchain runs**

Run: `npx vitest run`
Expected: exits 0 with "No test files found" (no tests yet). This confirms config + alias load.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/import/types.ts
git commit -m "chore: add vitest and shared import grouping types"
```

---

## Task 2: Metadata helpers (capture time + filename)

**Files:**
- Create: `src/lib/import/metadata.ts`
- Test: `src/lib/import/metadata.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/import/metadata.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/import/metadata.test.ts`
Expected: FAIL — cannot import from `./metadata` (module not found).

- [ ] **Step 3: Implement `src/lib/import/metadata.ts` (helpers only for now)**

```ts
import type { ImportImageMeta } from "./types";

export const PRECLUSTER_TIME_WINDOW_MS = 30_000;

export function getCaptureTime(file: File): number {
  if (file.lastModified && file.lastModified > 0) {
    return file.lastModified;
  }

  const match = file.name.match(/(20\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})?(\d{2})?(\d{2})?/);
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
  return fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[\s._-]*\d+([\s._-]\d+)*$/, "")
    .replace(/[\s._-]+$/, "");
}

export function numericSuffix(fileName: string): number | null {
  const base = fileName.replace(/\.[^.]+$/, "");
  const match = base.match(/(\d+)$/);
  return match ? Number(match[1]) : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/import/metadata.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/metadata.ts src/lib/import/metadata.test.ts
git commit -m "feat: add capture-time and filename metadata helpers for import grouping"
```

---

## Task 3: Metadata pre-clustering

**Files:**
- Modify: `src/lib/import/metadata.ts`
- Test: `src/lib/import/metadata.test.ts`

- [ ] **Step 1: Append failing tests to `src/lib/import/metadata.test.ts`**

```ts
import { preClusterByMetadata } from "./metadata";
import type { ImportImageMeta } from "./types";

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/import/metadata.test.ts`
Expected: FAIL — `preClusterByMetadata` is not exported.

- [ ] **Step 3: Add `preClusterByMetadata` to `src/lib/import/metadata.ts`**

Append:

```ts
function adjacentSameRecipe(
  prev: ImportImageMeta,
  next: ImportImageMeta,
  timeWindowMs: number
): boolean {
  const closeInTime = Math.abs(next.captureTime - prev.captureTime) <= timeWindowMs;
  if (!closeInTime) return false;

  const sameStem =
    filenameStem(prev.fileName).length > 0 &&
    filenameStem(prev.fileName) === filenameStem(next.fileName);

  const prevNum = numericSuffix(prev.fileName);
  const nextNum = numericSuffix(next.fileName);
  const consecutive =
    prevNum !== null && nextNum !== null && Math.abs(nextNum - prevNum) <= 1;

  return sameStem || consecutive;
}

export function preClusterByMetadata(
  items: ImportImageMeta[],
  timeWindowMs: number = PRECLUSTER_TIME_WINDOW_MS
): ImportImageMeta[][] {
  const sorted = [...items].sort(
    (a, b) => a.captureTime - b.captureTime || a.fileName.localeCompare(b.fileName)
  );

  const clusters: ImportImageMeta[][] = [];
  for (const item of sorted) {
    const current = clusters[clusters.length - 1];
    const prev = current?.[current.length - 1];
    if (current && prev && adjacentSameRecipe(prev, item, timeWindowMs)) {
      current.push(item);
    } else {
      clusters.push([item]);
    }
  }
  return clusters;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/import/metadata.test.ts`
Expected: PASS (all metadata tests green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/metadata.ts src/lib/import/metadata.test.ts
git commit -m "feat: add metadata pre-clustering for import grouping"
```

---

## Task 4: Grouping review operations + confidence gate

**Files:**
- Create: `src/lib/import/grouping.ts`
- Test: `src/lib/import/grouping.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/import/grouping.test.ts`:

```ts
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
});

describe("reorderImageInGroup", () => {
  it("moves an image from one index to another", () => {
    const groups = [group("g1", ["a", "b", "c"])];
    const result = reorderImageInGroup(groups, "g1", 2, 0);
    expect(result[0].imageIds).toEqual(["c", "a", "b"]);
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/import/grouping.test.ts`
Expected: FAIL — cannot import from `./grouping`.

- [ ] **Step 3: Implement `src/lib/import/grouping.ts`**

```ts
import type { RecipeGroup } from "./types";

export const GROUP_CONFIDENCE_THRESHOLD = 0.8;

function newGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function mergeGroups(
  groups: RecipeGroup[],
  targetId: string,
  sourceId: string
): RecipeGroup[] {
  const source = groups.find((g) => g.id === sourceId);
  if (!source || targetId === sourceId) return groups;

  return groups
    .filter((g) => g.id !== sourceId)
    .map((g) =>
      g.id === targetId
        ? {
            ...g,
            imageIds: [...g.imageIds, ...source.imageIds],
            confidence: Math.min(g.confidence, source.confidence),
          }
        : g
    );
}

export function splitImageToNewGroup(
  groups: RecipeGroup[],
  groupId: string,
  imageId: string
): RecipeGroup[] {
  const target = groups.find((g) => g.id === groupId);
  if (!target || target.imageIds.length <= 1) return groups;

  const remaining = target.imageIds.filter((id) => id !== imageId);
  if (remaining.length === target.imageIds.length) return groups;

  const updated = groups.map((g) =>
    g.id === groupId ? { ...g, imageIds: remaining } : g
  );
  updated.push({ id: newGroupId(), imageIds: [imageId], confidence: 1, needsReview: false });
  return updated;
}

export function reorderImageInGroup(
  groups: RecipeGroup[],
  groupId: string,
  fromIndex: number,
  toIndex: number
): RecipeGroup[] {
  return groups.map((g) => {
    if (g.id !== groupId) return g;
    const imageIds = [...g.imageIds];
    const [moved] = imageIds.splice(fromIndex, 1);
    if (moved === undefined) return g;
    imageIds.splice(toIndex, 0, moved);
    return { ...g, imageIds };
  });
}

export function explodeGroup(groups: RecipeGroup[], groupId: string): RecipeGroup[] {
  const result: RecipeGroup[] = [];
  for (const g of groups) {
    if (g.id !== groupId) {
      result.push(g);
      continue;
    }
    for (const imageId of g.imageIds) {
      result.push({ id: newGroupId(), imageIds: [imageId], confidence: 1, needsReview: false });
    }
  }
  return result;
}

export function applyConfidenceGate(
  groups: RecipeGroup[],
  threshold: number = GROUP_CONFIDENCE_THRESHOLD
): RecipeGroup[] {
  return groups.map((g) => ({ ...g, needsReview: g.confidence < threshold }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/import/grouping.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/grouping.ts src/lib/import/grouping.test.ts
git commit -m "feat: add recipe group review operations and confidence gate"
```

---

## Task 5: Client thumbnail helper

**Files:**
- Create: `src/lib/import/thumbnail.ts`

This is browser-only (canvas). Verified by type-check + manual browser test, not Vitest.

- [ ] **Step 1: Implement `src/lib/import/thumbnail.ts`**

```ts
export const THUMBNAIL_MAX_DIM = 512;
export const THUMBNAIL_QUALITY = 0.6;

export async function createThumbnail(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return "";
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return "";

  const scale = Math.min(1, THUMBNAIL_MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return "";
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", THUMBNAIL_QUALITY);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from `thumbnail.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/import/thumbnail.ts
git commit -m "feat: add client thumbnail downscaler for grouping vision pass"
```

---

## Task 6: AI grouping API route

**Files:**
- Create: `src/app/api/ingest/group/route.ts`

Accepts JSON `{ images: [{id, fileName, captureTime, thumbnail}], provisionalGroups: string[][] }` and returns `{ groups: RecipeGroup[] }`. Uses the same OpenAI fetch pattern as `src/app/api/ingest/route.ts`. Chunks the timeline by `GROUP_CHUNK_SIZE` so large batches never send one giant prompt. Degrades to metadata-only groups when OpenAI is unavailable or a chunk fails.

- [ ] **Step 1: Implement the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import type { RecipeGroup } from "@/lib/import/types";

const OPENAI_TIMEOUT_MS = 90_000;
const GROUP_CHUNK_SIZE = 12;

interface GroupImageInput {
  id: string;
  fileName: string;
  captureTime: number;
  thumbnail?: string;
}

async function callOpenAI(body: Record<string, unknown>) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error("OpenAI grouping error:", response.status, await response.text());
      return null;
    }
    return response.json();
  } catch (error) {
    console.error("OpenAI grouping request failed:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function newGroupId(seed: string): string {
  return `group-${seed}-${Math.random().toString(36).slice(2, 8)}`;
}

// A lone image is confidently its own recipe; a metadata cluster of >1 is a
// medium-confidence guess that should be reviewed unless AI confirms it.
function fallbackGroups(provisionalGroups: string[][]): RecipeGroup[] {
  return provisionalGroups.map((imageIds, index) => ({
    id: newGroupId(String(index)),
    imageIds,
    confidence: imageIds.length > 1 ? 0.5 : 0.95,
    needsReview: imageIds.length > 1,
  }));
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function groupChunk(images: GroupImageInput[]): Promise<RecipeGroup[] | null> {
  const withThumbs = images.filter((img) => img.thumbnail);
  if (withThumbs.length === 0) return null;

  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text:
        "These images may be photos/screenshots of recipes. Some images are multiple " +
        "pages/screenshots of the SAME recipe (e.g. ingredients on one, steps on another, " +
        "or front/back of a card). Group them. Return ONLY JSON: " +
        '{"groups":[{"imageIds":["id1","id2"],"confidence":0.0}]}. ' +
        "confidence is 0..1 that the grouping is correct. Every id must appear exactly once. " +
        "Order imageIds within a group by page order. Ids: " +
        withThumbs.map((i) => i.id).join(", "),
    },
    ...withThumbs.map((img) => ({
      type: "image_url",
      image_url: { url: img.thumbnail as string },
    })),
  ];

  const data = await callOpenAI({
    model: "gpt-4o",
    messages: [{ role: "user", content }],
    max_tokens: 800,
    temperature: 0,
  });

  const raw = data?.choices?.[0]?.message?.content as string | undefined;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")) as {
      groups?: Array<{ imageIds?: string[]; confidence?: number }>;
    };
    const validIds = new Set(images.map((i) => i.id));
    const seen = new Set<string>();
    const groups: RecipeGroup[] = [];

    for (const g of parsed.groups ?? []) {
      const imageIds = (g.imageIds ?? []).filter((id) => validIds.has(id) && !seen.has(id));
      imageIds.forEach((id) => seen.add(id));
      if (imageIds.length > 0) {
        groups.push({
          id: newGroupId("ai"),
          imageIds,
          confidence: typeof g.confidence === "number" ? g.confidence : 0.6,
          needsReview: false,
        });
      }
    }

    // Any id the model dropped becomes its own confident group.
    for (const img of images) {
      if (!seen.has(img.id)) {
        groups.push({ id: newGroupId("solo"), imageIds: [img.id], confidence: 0.95, needsReview: false });
      }
    }
    return groups;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      images?: GroupImageInput[];
      provisionalGroups?: string[][];
    };
    const images = body.images ?? [];
    const provisionalGroups = body.provisionalGroups ?? images.map((i) => [i.id]);

    if (images.length === 0) {
      return NextResponse.json({ groups: [] });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ groups: fallbackGroups(provisionalGroups) });
    }

    const sorted = [...images].sort((a, b) => a.captureTime - b.captureTime);
    const chunks = chunk(sorted, GROUP_CHUNK_SIZE);
    const groups: RecipeGroup[] = [];

    for (const c of chunks) {
      const result = await groupChunk(c);
      if (result) {
        groups.push(...result);
      } else {
        // Degrade this chunk to one-image-per-recipe.
        for (const img of c) {
          groups.push({ id: newGroupId("fb"), imageIds: [img.id], confidence: 0.95, needsReview: false });
        }
      }
    }

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Grouping error:", error);
    return NextResponse.json({ error: "Failed to group images" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ingest/group/route.ts
git commit -m "feat: add AI grouping confirmation endpoint with chunking and degrade"
```

---

## Task 7: Multi-image extraction in /api/ingest

**Files:**
- Modify: `src/app/api/ingest/route.ts`

Make the existing route accept multiple `file` entries and send them all in one vision call so the model stitches pages into one recipe. Single-file uploads keep working unchanged (a group of one).

- [ ] **Step 1: Replace the `POST` handler body's file handling**

In `src/app/api/ingest/route.ts`, change the form parsing (currently `formData.get("file")`) and the image branch to collect all files:

Replace lines reading the single file:

```ts
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;

    if (!file && !text) {
      return NextResponse.json({ error: "No file or text provided" }, { status: 400 });
    }
```

with:

```ts
    const formData = await request.formData();
    const files = formData.getAll("file").filter((v): v is File => v instanceof File);
    const file = files[0] ?? null;
    const text = formData.get("text") as string | null;

    if (files.length === 0 && !text) {
      return NextResponse.json({ error: "No file or text provided" }, { status: 400 });
    }
```

- [ ] **Step 2: Send all image files in the vision call**

Replace the image branch (currently the `if (openaiKey && file)` block that builds a single `image_url`) with a loop over `files`:

```ts
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));

    if (openaiKey && imageFiles.length > 0) {
      const imageParts = await Promise.all(
        imageFiles.map(async (f) => {
          const base64 = Buffer.from(await f.arrayBuffer()).toString("base64");
          const mimeType = f.type || "image/jpeg";
          return {
            type: "image_url" as const,
            image_url: { url: `data:${mimeType};base64,${base64}` },
          };
        })
      );

      const data = await callOpenAI({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a recipe extraction expert. The user may provide MULTIPLE images that are different pages/screenshots of ONE single recipe. Combine them into ONE recipe. Return a JSON object with these fields:
              title, description, ingredients (array of {amount, unit, name, notes}), instructions (array of {step, text, timerMinutes}),
              prepTime (minutes), cookTime (minutes), servings, difficulty (easy/medium/hard), cuisine, category, tags (array),
              cookingMethod, source. Clean formatting, remove ads and irrelevant text. Return ONLY valid JSON.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  imageParts.length > 1
                    ? "These images are pages of a single recipe. Extract one combined recipe. Return JSON only."
                    : "Extract the recipe from this image. Return JSON only.",
              },
              ...imageParts,
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const content = data?.choices?.[0]?.message?.content;
      const recipe = parseRecipeContent(content);
      if (recipe) {
        return NextResponse.json({
          success: true,
          recipe,
          recipeId: `imported-${Date.now()}`,
        });
      }
    }
```

Keep the existing PDF-rejection check (it should now guard against any file being a PDF: change `file?.type === "application/pdf"` to `files.some((f) => f.type === "application/pdf")`). Keep the existing text branch and fallback branch as-is (`buildFallbackRecipe(file, text)` still works with the first file).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, then in a terminal:

```bash
curl -s -X POST http://localhost:3000/api/ingest -F "file=@some-recipe.jpg" | head -c 400
```

Expected: JSON with `"success":true` and a `recipe` object (or the fallback recipe if no `OPENAI_API_KEY`).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/ingest/route.ts
git commit -m "feat: extract one recipe from multiple images in ingest route"
```

---

## Task 8: Multi-file persistence

**Files:**
- Modify: `src/lib/supabase/recipes.ts`
- Modify: `src/app/api/recipes/route.ts`
- Modify: `src/lib/import-recipe.ts`

- [ ] **Step 1: Make `saveRecipe` accept multiple files**

In `src/lib/supabase/recipes.ts`, change the `saveRecipe` params to accept `files?: File[]` (keep `file` for backward compatibility) and upload each as its own `recipe_originals` row; set hero to the first uploaded image.

Change the signature params block:

```ts
export async function saveRecipe(
  supabase: SupabaseClient,
  params: {
    familyId: string;
    userId: string;
    recipe: SaveRecipeInput;
    file?: File | null;
    files?: File[];
    fileName?: string;
    fileNames?: string[];
  }
): Promise<Recipe> {
  const { familyId, userId, recipe, fileName, fileNames } = params;
  const files = (params.files ?? (params.file ? [params.file] : [])).filter(Boolean) as File[];
```

Then replace the single-file `if (file) { ... }` block with a loop:

```ts
  let firstStoragePath: string | null = null;

  for (let index = 0; index < files.length; index += 1) {
    const current = files[index];
    const label = fileNames?.[index] ?? (index === 0 ? fileName : undefined) ?? current.name;
    const safeName = label.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${familyId}/${recipeId}/${Date.now()}-${index}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(RECIPE_UPLOADS_BUCKET)
      .upload(storagePath, current, {
        contentType: current.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { error: originalError } = await supabase.from("recipe_originals").insert({
      recipe_id: recipeId,
      type: inferOriginalType(current.type),
      storage_path: storagePath,
      file_name: label,
      file_size: current.size,
    });
    if (originalError) throw originalError;

    if (index === 0) firstStoragePath = storagePath;
  }

  if (firstStoragePath) {
    await supabase.from("recipes").update({ hero_image: firstStoragePath }).eq("id", recipeId);
  }
```

Then update the later references that used `file`/`storagePath` in the `imports` and any log inserts: the `imports` insert should use the first file:

```ts
  const primaryFile = files[0] ?? null;
  await supabase.from("imports").insert({
    family_id: familyId,
    uploaded_by: userId,
    file_name: fileName ?? primaryFile?.name ?? recipe.title,
    file_type: primaryFile?.type ?? null,
    file_size: primaryFile?.size ?? null,
    storage_path: firstStoragePath,
    status: "completed",
    recipe_id: recipeId,
  });
```

Leave the `timeline_events` and `activity` inserts unchanged (they only use `fileName`/`recipe.title`).

- [ ] **Step 2: Accept multiple files in `/api/recipes`**

In `src/app/api/recipes/route.ts`, in the multipart branch, collect all files and pass them through:

```ts
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const recipeJson = formData.get("recipe");

      if (typeof recipeJson !== "string") {
        return NextResponse.json({ error: "Recipe payload required" }, { status: 400 });
      }

      recipeInput = JSON.parse(recipeJson) as SaveRecipeInput;
      files = formData.getAll("file").filter((v): v is File => v instanceof File);
      fileName = (formData.get("fileName") as string | null) ?? files[0]?.name;
    } else {
      recipeInput = (await request.json()) as SaveRecipeInput;
    }
```

Declare `let files: File[] = [];` near the top (replacing `let file: File | null = null;`) and update the `saveRecipe` call:

```ts
    const recipe = await saveRecipe(supabase, {
      familyId: family.familyId,
      userId: user.id,
      recipe: recipeInput,
      files,
      fileName,
    });
```

- [ ] **Step 3: Support multiple previews in `normalizeExtractedRecipe`**

In `src/lib/import-recipe.ts`, change the `options` param to also accept `previewUrls?: string[]` and build gallery/originals from all of them. Update the signature:

```ts
export function normalizeExtractedRecipe(
  raw: ExtractedRecipe,
  recipeId: string,
  options?: { previewUrl?: string; previewUrls?: string[]; fileName?: string }
): Recipe {
```

Compute the list near the top of the function body:

```ts
  const previews =
    options?.previewUrls && options.previewUrls.length > 0
      ? options.previewUrls
      : options?.previewUrl
        ? [options.previewUrl]
        : [];
```

Then replace `heroImage`, `gallery`, and `originals`:

```ts
  const heroImage = previews[0] ?? DEFAULT_HERO;
```

```ts
    gallery: previews.length > 0 ? previews : [DEFAULT_HERO],
```

```ts
    originals: previews.map((url, index) => ({
      id: `orig-${recipeId}-${index}`,
      type: "image" as const,
      url,
      uploadedAt: now,
    })),
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/recipes.ts src/app/api/recipes/route.ts src/lib/import-recipe.ts
git commit -m "feat: persist multiple images per recipe as originals"
```

---

## Task 9: Store state for groups + review

**Files:**
- Modify: `src/lib/store.ts`

Add state to hold the pending review groups and the images they reference so `ImportDropzone` and the review component share it.

- [ ] **Step 1: Add review state to the store interface**

In `src/lib/store.ts`, import the new types at the top:

```ts
import type { ImportImageMeta, RecipeGroup } from "./import/types";
```

Add to the `AppState` interface (near the import queue fields):

```ts
  reviewImages: ImportImageMeta[];
  reviewGroups: RecipeGroup[];
  setReview: (images: ImportImageMeta[], groups: RecipeGroup[]) => void;
  setReviewGroups: (groups: RecipeGroup[]) => void;
  clearReview: () => void;
```

- [ ] **Step 2: Implement the actions in the store**

In the `create<AppState>` body, near `clearImportQueue`:

```ts
  reviewImages: [],
  reviewGroups: [],
  setReview: (images, groups) => set({ reviewImages: images, reviewGroups: groups }),
  setReviewGroups: (groups) => set({ reviewGroups: groups }),
  clearReview: () => set({ reviewImages: [], reviewGroups: [] }),
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat: add import review state to store"
```

---

## Task 10: Review screen component

**Files:**
- Create: `src/components/import/import-review.tsx`

Renders `reviewGroups` as cards of thumbnails with controls: merge (into previous group), split (an image out), reorder (move image left/right), mark-as-separate (explode), and a confirm button. Uses the pure ops from `grouping.ts`.

- [ ] **Step 1: Implement the component**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import {
  mergeGroups,
  splitImageToNewGroup,
  reorderImageInGroup,
  explodeGroup,
} from "@/lib/import/grouping";
import type { ImportImageMeta } from "@/lib/import/types";

export function ImportReview({ onConfirm }: { onConfirm: () => void }) {
  const { reviewImages, reviewGroups, setReviewGroups } = useAppStore();

  if (reviewGroups.length === 0) return null;

  const imageById = new Map<string, ImportImageMeta>(reviewImages.map((i) => [i.id, i]));

  return (
    <div className="space-y-6 rounded-2xl bg-ivory p-6 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-medium">Review groupings</h3>
          <p className="text-sm text-charcoal-muted">
            We grouped some images we weren&apos;t sure about. Each card becomes one recipe.
          </p>
        </div>
        <Button onClick={onConfirm}>Looks good, import</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {reviewGroups.map((group, groupIndex) => (
          <div key={group.id} className="rounded-xl bg-cream p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">
                Recipe {groupIndex + 1}
                {group.needsReview && (
                  <span className="ml-2 rounded-full bg-terracotta/15 px-2 py-0.5 text-xs text-terracotta">
                    check this
                  </span>
                )}
              </span>
              <div className="flex gap-2">
                {groupIndex > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setReviewGroups(
                        mergeGroups(reviewGroups, reviewGroups[groupIndex - 1].id, group.id)
                      )
                    }
                  >
                    Merge up
                  </Button>
                )}
                {group.imageIds.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReviewGroups(explodeGroup(reviewGroups, group.id))}
                  >
                    Split all
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {group.imageIds.map((imageId, imageIndex) => {
                const image = imageById.get(imageId);
                return (
                  <div key={imageId} className="w-24">
                    {image?.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.previewUrl}
                        alt={image.fileName}
                        className="h-24 w-24 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-lg bg-sage-muted" />
                    )}
                    <div className="mt-1 flex justify-between">
                      <button
                        type="button"
                        className="text-xs text-charcoal-muted disabled:opacity-30"
                        disabled={imageIndex === 0}
                        onClick={() =>
                          setReviewGroups(
                            reorderImageInGroup(reviewGroups, group.id, imageIndex, imageIndex - 1)
                          )
                        }
                      >
                        ←
                      </button>
                      {group.imageIds.length > 1 && (
                        <button
                          type="button"
                          className="text-xs text-terracotta"
                          onClick={() =>
                            setReviewGroups(
                              splitImageToNewGroup(reviewGroups, group.id, imageId)
                            )
                          }
                        >
                          split
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-xs text-charcoal-muted disabled:opacity-30"
                        disabled={imageIndex === group.imageIds.length - 1}
                        onClick={() =>
                          setReviewGroups(
                            reorderImageInGroup(reviewGroups, group.id, imageIndex, imageIndex + 1)
                          )
                        }
                      >
                        →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit` and `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/import/import-review.tsx
git commit -m "feat: add import review screen for uncertain groupings"
```

---

## Task 11: Wire ImportDropzone to the staged pipeline

**Files:**
- Modify: `src/components/import-dropzone.tsx`

Replace the per-file loop with: build metadata + thumbnails → pre-cluster → call `/api/ingest/group` → apply confidence gate → auto-process confident groups → if any group needs review, render `<ImportReview>` and process the rest on confirm. Each confident/confirmed group calls the new multi-file ingest + multi-file save.

- [ ] **Step 1: Add imports at the top of the file**

```tsx
import { createThumbnail } from "@/lib/import/thumbnail";
import { getCaptureTime, preClusterByMetadata } from "@/lib/import/metadata";
import { applyConfidenceGate } from "@/lib/import/grouping";
import { ImportReview } from "@/components/import/import-review";
import type { ImportImageMeta, RecipeGroup } from "@/lib/import/types";
```

- [ ] **Step 2: Replace `ingestFile` with a multi-file `ingestGroup`**

Replace the existing `ingestFile` function with:

```tsx
async function ingestGroup(files: File[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INGEST_TIMEOUT_MS);
  try {
    const formData = new FormData();
    for (const file of files) formData.append("file", file);

    const response = await fetch("/api/ingest", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "Import failed");

    return data as {
      success?: boolean;
      recipeId?: string;
      recipe?: Record<string, unknown>;
      message?: string;
    };
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 3: Rework the component body**

Replace the `processFiles` callback and add group-processing helpers. The new flow:

```tsx
export function ImportDropzone() {
  const {
    importQueue,
    addToImportQueue,
    updateImportItem,
    addImportedRecipe,
    reviewImages,
    reviewGroups,
    setReview,
    clearReview,
  } = useAppStore();
  const { usingDatabase, refreshRecipes } = useRecipesContext();
  const [isProcessing, setIsProcessing] = useState(false);

  // Files kept in a ref so async group processing can find the File objects by id.
  const fileMapRef = useRef<Map<string, File>>(new Map());

  const processGroup = useCallback(
    async (group: RecipeGroup, images: ImportImageMeta[]) => {
      const groupImages = group.imageIds
        .map((id) => images.find((img) => img.id === id))
        .filter((img): img is ImportImageMeta => Boolean(img));
      const files = group.imageIds
        .map((id) => fileMapRef.current.get(id))
        .filter((f): f is File => Boolean(f));

      const queueId = groupImages[0]?.id ?? `group-${Date.now()}`;
      updateImportItem(queueId, { status: "processing" });

      try {
        const data = await ingestGroup(files);
        const recipeId = data.recipeId || `imported-${Date.now()}`;
        const previewUrls = groupImages
          .map((img) => img.previewUrl)
          .filter((url): url is string => Boolean(url));
        const recipe = normalizeExtractedRecipe(data.recipe ?? {}, recipeId, {
          previewUrls,
          fileName: groupImages[0]?.fileName,
        });

        if (usingDatabase) {
          const formData = new FormData();
          formData.append("recipe", JSON.stringify(recipeToSaveInput(recipe)));
          for (const file of files) formData.append("file", file);
          formData.append("fileName", groupImages[0]?.fileName ?? "recipe");

          const persistResponse = await fetch("/api/recipes", { method: "POST", body: formData });
          const persistData = await persistResponse.json().catch(() => null);
          if (!persistResponse.ok) {
            throw new Error(persistData?.error || "Failed to save recipe to database");
          }
          await refreshRecipes();
          updateImportItem(queueId, {
            status: "completed",
            recipeId: persistData.recipe.id,
            recipeTitle: persistData.recipe.title,
          });
        } else {
          addImportedRecipe(recipe);
          updateImportItem(queueId, {
            status: "completed",
            recipeId: recipe.id,
            recipeTitle: recipe.title,
          });
        }
      } catch (error) {
        updateImportItem(queueId, {
          status: "failed",
          error:
            error instanceof Error && error.name === "AbortError"
              ? "Import timed out. Try fewer/smaller images."
              : error instanceof Error
                ? error.message
                : "Import failed",
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    },
    [addImportedRecipe, refreshRecipes, updateImportItem, usingDatabase]
  );

  const processConfirmedGroups = useCallback(
    async (groups: RecipeGroup[], images: ImportImageMeta[]) => {
      setIsProcessing(true);
      for (const group of groups) {
        await processGroup(group, images);
      }
      setIsProcessing(false);
    },
    [processGroup]
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      // Build metadata + thumbnails; store File objects by id.
      const images: ImportImageMeta[] = [];
      for (const file of files) {
        const id = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        fileMapRef.current.set(id, file);
        images.push({
          id,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          captureTime: getCaptureTime(file),
          previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
          thumbnail: file.type.startsWith("image/") ? await createThumbnail(file) : undefined,
        });
      }

      // Non-image files (txt) always become their own single-item groups.
      const imageMetas = images.filter((i) => i.fileType.startsWith("image/"));
      const nonImageGroups: RecipeGroup[] = images
        .filter((i) => !i.fileType.startsWith("image/"))
        .map((i) => ({ id: `g-${i.id}`, imageIds: [i.id], confidence: 1, needsReview: false }));

      let groups: RecipeGroup[] = [...nonImageGroups];

      if (imageMetas.length > 0) {
        const provisional = preClusterByMetadata(imageMetas).map((c) => c.map((i) => i.id));
        const response = await fetch("/api/ingest/group", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            images: imageMetas.map((i) => ({
              id: i.id,
              fileName: i.fileName,
              captureTime: i.captureTime,
              thumbnail: i.thumbnail,
            })),
            provisionalGroups: provisional,
          }),
        });
        const data = (await response.json().catch(() => ({ groups: [] }))) as {
          groups: RecipeGroup[];
        };
        const gated = applyConfidenceGate(data.groups ?? []);
        groups = [...groups, ...gated];
      }

      // Add one queue item per group (keyed by its first image id).
      const queueItems: ImportItem[] = groups.map((g) => {
        const first = images.find((i) => i.id === g.imageIds[0]);
        return {
          id: g.imageIds[0],
          fileName:
            g.imageIds.length > 1
              ? `${first?.fileName ?? "recipe"} (+${g.imageIds.length - 1})`
              : first?.fileName ?? "recipe",
          fileType: first?.fileType ?? "",
          fileSize: first?.fileSize ?? 0,
          previewUrl: first?.previewUrl,
          status: "pending" as const,
          uploadedAt: new Date().toISOString(),
        };
      });
      addToImportQueue(queueItems);

      const confident = groups.filter((g) => !g.needsReview);
      const uncertain = groups.filter((g) => g.needsReview);

      await processConfirmedGroups(confident, images);

      if (uncertain.length > 0) {
        setReview(images, uncertain);
      }
    },
    [addToImportQueue, processConfirmedGroups, setReview]
  );

  const handleConfirmReview = useCallback(async () => {
    const groups = reviewGroups;
    const images = reviewImages;
    clearReview();
    await processConfirmedGroups(groups, images);
  }, [reviewGroups, reviewImages, clearReview, processConfirmedGroups]);
```

Add the missing React import for `useRef` at the top:

```tsx
import { useCallback, useRef, useState } from "react";
```

- [ ] **Step 4: Render the review component**

In the returned JSX, add `<ImportReview onConfirm={handleConfirmReview} />` right above the import-queue `AnimatePresence` block:

```tsx
      {reviewGroups.length > 0 && <ImportReview onConfirm={handleConfirmReview} />}

      <AnimatePresence>
        {importQueue.length > 0 && (
```

- [ ] **Step 5: Type-check + lint**

Run: `npx tsc --noEmit` and `npm run lint`
Expected: no new errors. (Note: the queue item for a group now uses the first image's id as `ImportItem.id`; that matches `updateImportItem(queueId, ...)`.)

- [ ] **Step 6: Commit**

```bash
git add src/components/import-dropzone.tsx
git commit -m "feat: stage import through grouping pipeline with review step"
```

---

## Task 12: End-to-end verification + wrap-up

**Files:**
- Modify: `README.md` (brief note on multi-image import behavior)

- [ ] **Step 1: Run the full unit suite**

Run: `npm run test`
Expected: all metadata + grouping tests PASS.

- [ ] **Step 2: Type-check + lint the whole project**

Run: `npx tsc --noEmit` and `npm run lint`
Expected: no new errors introduced by this feature.

- [ ] **Step 3: Manual browser test — bulk (each image = a recipe)**

Run `npm run dev`, open `/app/import`, drop 3 clearly-different recipe photos. Expected: 3 queue items, each completes as its own recipe (no review screen if the AI is confident).

- [ ] **Step 4: Manual browser test — multi-image (one recipe)**

Drop 2 screenshots of the same long recipe (sequential filenames / close timestamps). Expected: they collapse into ONE queue item / one recipe; opening it shows both images in the gallery. If confidence was low, the review screen appears — confirm and verify one recipe results.

- [ ] **Step 5: Manual browser test — review controls**

With a mixed drop that triggers review, verify merge-up, split, split-all, and ← / → reordering visibly change the cards, and that "Looks good, import" produces the expected recipes.

- [ ] **Step 6: Update README**

Add a short bullet under the import section noting: "Multiple screenshots/photos of the same recipe are automatically grouped into one recipe; a review step appears when grouping is uncertain."

- [ ] **Step 7: Commit**

```bash
git add README.md
git commit -m "docs: note multi-image import grouping behavior"
```

---

## Self-Review Notes

- **Spec coverage:** Stage 1 (Task 3), Stage 2 (Task 6), Stage 3 gate (Task 4) + review UI (Tasks 10–11), Stage 4 extraction (Task 7), data model / multiple originals (Task 8). Error isolation per group (Task 11 `processGroup` try/catch), degrade paths (Task 6). All spec sections map to tasks.
- **Types:** `ImportImageMeta`, `RecipeGroup`, `GroupingResult` defined once in `src/lib/import/types.ts` and reused by metadata, grouping, route, store, and UI. Group review ops return `RecipeGroup[]` consistently.
- **Backward compatibility:** single-file ingest/save still works (a group of one; `file`/`files` both accepted in `saveRecipe`).
- **Out of scope (unchanged):** PDF rejection retained; no cross-batch dedup; grouping is per-batch.
```
