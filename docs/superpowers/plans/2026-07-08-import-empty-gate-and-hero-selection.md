# Empty-Recipe Gate + Best-of-Group Hero — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Never save empty recipes from unusable screenshots (attach as notes to a related recipe in the same batch, or skip with a clear message), and pick the best food-photo hero from all images in a group instead of always using the first.

**Architecture:** Pure helpers decide “usable?” and “nearest sibling recipe.” After ingest, unusable groups call a new append-originals API instead of `saveRecipe`. Hero selection scores every image with the existing photo-region detector and crops the winner. A batch registry + second pass handles attach when the parent recipe finishes later in the queue.

**Tech Stack:** Next.js 16 App Router, React 19, Vitest, existing `hero-crop.ts` / Supabase `recipe_originals`.

---

## File Structure

**New files:**
- `src/lib/import/usable-recipe.ts` — `isUsableRecipe(raw)`
- `src/lib/import/attach-nearest.ts` — `findNearestCompletedRecipe(...)`, `ATTACH_TIME_WINDOW_MS`
- `src/lib/import/usable-recipe.test.ts`
- `src/lib/import/attach-nearest.test.ts`
- `src/lib/import/hero-pick.test.ts` — ranking helper tests
- `src/app/api/recipes/[id]/originals/route.ts` — append files as originals

**Modified files:**
- `src/lib/import/hero-crop.ts` — export score + `scorePhotoRegion` / `pickBestHeroFromFiles`
- `src/lib/types.ts` — `ImportStatus` += `"skipped"`
- `src/components/import-dropzone.tsx` — gate, attach, second pass, best-of-group hero, skipped UI
- `src/app/api/ingest/group/route.ts` — grouping prompt notes tweak
- `src/lib/supabase/recipes.ts` — `appendRecipeOriginals(...)`

## Constants

- `ATTACH_TIME_WINDOW_MS = 120_000` (2 minutes) for nearest-recipe attach.
- Reuse `PHOTO_SCORE_THRESHOLD` (0.35) from hero-crop for “photo-like enough.”

---

### Task 1: Usable-recipe gate (pure)

**Files:**
- Create: `src/lib/import/usable-recipe.ts`
- Test: `src/lib/import/usable-recipe.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { isUsableRecipe } from "./usable-recipe";

describe("isUsableRecipe", () => {
  it("returns false when ingredients and instructions are empty", () => {
    expect(isUsableRecipe({ ingredients: [], instructions: [] })).toBe(false);
    expect(isUsableRecipe({})).toBe(false);
  });

  it("returns true when at least one ingredient has a name", () => {
    expect(
      isUsableRecipe({
        ingredients: [{ name: "flour" }],
        instructions: [],
      })
    ).toBe(true);
  });

  it("returns true when at least one instruction has text", () => {
    expect(
      isUsableRecipe({
        ingredients: [],
        instructions: [{ text: "Mix well" }],
      })
    ).toBe(true);
  });

  it("ignores blank ingredient names and blank instruction text", () => {
    expect(
      isUsableRecipe({
        ingredients: [{ name: "  " }, { ingredient: "" }],
        instructions: [{ text: "" }, "   "],
      })
    ).toBe(false);
  });

  it("accepts string instructions", () => {
    expect(isUsableRecipe({ instructions: ["Bake 20 minutes"] })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/import/usable-recipe.test.ts`  
Expected: FAIL — cannot find module `./usable-recipe`

- [ ] **Step 3: Write minimal implementation**

```ts
type RawIngredient = { name?: string; ingredient?: string };
type RawInstruction = { text?: string; instruction?: string } | string;

export function isUsableRecipe(raw: {
  ingredients?: RawIngredient[];
  instructions?: RawInstruction[];
}): boolean {
  const hasIngredient = (raw.ingredients ?? []).some((item) => {
    const name = String(item.name ?? item.ingredient ?? "").trim();
    return name.length > 0;
  });
  if (hasIngredient) return true;

  return (raw.instructions ?? []).some((item) => {
    if (typeof item === "string") return item.trim().length > 0;
    const text = String(item.text ?? item.instruction ?? "").trim();
    return text.length > 0;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/import/usable-recipe.test.ts`  
Expected: PASS (all cases)

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/usable-recipe.ts src/lib/import/usable-recipe.test.ts
git commit -m "feat: add isUsableRecipe gate for empty import extracts"
```

---

### Task 2: Nearest completed recipe (pure)

**Files:**
- Create: `src/lib/import/attach-nearest.ts`
- Test: `src/lib/import/attach-nearest.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { findNearestCompletedRecipe, ATTACH_TIME_WINDOW_MS } from "./attach-nearest";
import type { CompletedBatchRecipe } from "./attach-nearest";

function completed(
  partial: Partial<CompletedBatchRecipe> & { recipeId: string }
): CompletedBatchRecipe {
  return {
    title: "Recipe",
    captureTimes: [1000],
    fileNames: ["IMG_0412.jpg"],
    ...partial,
  };
}

describe("findNearestCompletedRecipe", () => {
  it("returns null when there are no completed recipes", () => {
    expect(
      findNearestCompletedRecipe({
        captureTimes: [1000],
        fileNames: ["notes.jpg"],
        completed: [],
      })
    ).toBeNull();
  });

  it("picks a recipe within the time window with shared stem", () => {
    const result = findNearestCompletedRecipe({
      captureTimes: [5000],
      fileNames: ["IMG_0415.jpg"],
      completed: [
        completed({
          recipeId: "r1",
          title: "Tacos",
          captureTimes: [1000],
          fileNames: ["IMG_0412.jpg", "IMG_0413.jpg"],
        }),
        completed({
          recipeId: "r2",
          title: "Pie",
          captureTimes: [900_000],
          fileNames: ["pie.jpg"],
        }),
      ],
    });
    expect(result?.recipeId).toBe("r1");
    expect(result?.title).toBe("Tacos");
  });

  it("rejects candidates outside the time window even with similar names", () => {
    const result = findNearestCompletedRecipe({
      captureTimes: [ATTACH_TIME_WINDOW_MS + 50_000],
      fileNames: ["IMG_0415.jpg"],
      completed: [
        completed({
          recipeId: "r1",
          captureTimes: [1000],
          fileNames: ["IMG_0412.jpg"],
        }),
      ],
    });
    expect(result).toBeNull();
  });

  it("matches by consecutive numeric suffix within the window", () => {
    const result = findNearestCompletedRecipe({
      captureTimes: [4000],
      fileNames: ["photo11.png"],
      completed: [
        completed({
          recipeId: "r1",
          title: "Soup",
          captureTimes: [1000],
          fileNames: ["photo10.png"],
        }),
      ],
    });
    expect(result?.recipeId).toBe("r1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/import/attach-nearest.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
import { filenameStem, numericSuffix } from "./metadata";

export const ATTACH_TIME_WINDOW_MS = 120_000;

export type CompletedBatchRecipe = {
  recipeId: string;
  title: string;
  captureTimes: number[];
  fileNames: string[];
};

function minTimeDistance(a: number[], b: number[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const t of a) {
    for (const u of b) {
      best = Math.min(best, Math.abs(t - u));
    }
  }
  return best;
}

function namesRelated(aNames: string[], bNames: string[]): boolean {
  for (const a of aNames) {
    for (const b of bNames) {
      const stemA = filenameStem(a);
      const stemB = filenameStem(b);
      if (stemA.length > 0 && stemA === stemB) return true;
      const numA = numericSuffix(a);
      const numB = numericSuffix(b);
      if (numA !== null && numB !== null && Math.abs(numA - numB) <= 2) return true;
    }
  }
  return false;
}

export function findNearestCompletedRecipe(params: {
  captureTimes: number[];
  fileNames: string[];
  completed: CompletedBatchRecipe[];
  timeWindowMs?: number;
}): CompletedBatchRecipe | null {
  const windowMs = params.timeWindowMs ?? ATTACH_TIME_WINDOW_MS;
  let best: { recipe: CompletedBatchRecipe; distance: number } | null = null;

  for (const recipe of params.completed) {
    const distance = minTimeDistance(params.captureTimes, recipe.captureTimes);
    if (distance > windowMs) continue;
    if (!namesRelated(params.fileNames, recipe.fileNames)) continue;
    if (!best || distance < best.distance) {
      best = { recipe, distance };
    }
  }

  return best?.recipe ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/import/attach-nearest.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/attach-nearest.ts src/lib/import/attach-nearest.test.ts
git commit -m "feat: add nearest completed-recipe matcher for note attachment"
```

---

### Task 3: Best-of-group hero scoring

**Files:**
- Modify: `src/lib/import/hero-crop.ts`
- Create: `src/lib/import/hero-pick.ts` (pure ranking over scored candidates)
- Test: `src/lib/import/hero-pick.test.ts`

Expose a numeric score from the detector path, then a pure `pickBestHeroCandidate` for ranking. Keep `extractHeroFromUpload` working for single-file callers.

- [ ] **Step 1: Write the failing ranking tests**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/import/hero-pick.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement `hero-pick.ts`**

```ts
export type HeroScoreCandidate = { index: number; score: number };

export function pickBestHeroCandidate(
  candidates: HeroScoreCandidate[],
  threshold: number
): HeroScoreCandidate | null {
  let best: HeroScoreCandidate | null = null;
  for (const candidate of candidates) {
    if (candidate.score < threshold) continue;
    if (!best || candidate.score > best.score) best = candidate;
  }
  return best;
}
```

- [ ] **Step 4: Export score helpers from `hero-crop.ts`**

1. Change `const PHOTO_SCORE_THRESHOLD = 0.35` to `export const PHOTO_SCORE_THRESHOLD = 0.35`.
2. Refactor `findPhotoRegionFromImageData` to also compute a region score (mean of cell scores inside the connected region). Add:

```ts
export type ScoredCropBox = CropBox & { score: number };

export function findScoredPhotoRegionFromImageData(
  image: ImageData
): ScoredCropBox | null {
  // Same grid/mask/region logic as findPhotoRegionFromImageData, but also:
  // score = average of scores[r][c] for cells in the region bounding box
  // (or of mask-true cells in that box). Return { ...box, score } or null
  // using the same area/aspect filters.
}
```

Keep `findPhotoRegionFromImageData` as a thin wrapper that returns only the box (call `findScoredPhotoRegionFromImageData` and strip `score`) so existing behavior stays.

3. Add:

```ts
export async function scorePhotoRegion(
  file: File
): Promise<{ box: CropBox; score: number } | null> {
  // Same decode path as detectPhotoRegion, but use findScoredPhotoRegionFromImageData
  // and scale the box back to full resolution. Return null on failure.
}

export async function pickBestHeroFromFiles(
  files: File[]
): Promise<{ file: File; blob: Blob; score: number } | null> {
  const imageFiles = files.filter((f) => f.type.startsWith("image/"));
  const scored: Array<{ index: number; score: number; file: File; box: CropBox }> = [];

  for (let index = 0; index < imageFiles.length; index += 1) {
    const file = imageFiles[index];
    const result = await scorePhotoRegion(file);
    if (result) scored.push({ index, score: result.score, file, box: result.box });
  }

  const best = pickBestHeroCandidate(
    scored.map((s) => ({ index: s.index, score: s.score })),
    PHOTO_SCORE_THRESHOLD
  );
  if (!best) return null;

  const winner = scored.find((s) => s.index === best.index);
  if (!winner) return null;

  const blob = await cropHeroImage(winner.file, winner.box);
  if (!blob) return null;
  return { file: winner.file, blob, score: winner.score };
}
```

Import `pickBestHeroCandidate` from `./hero-pick` inside `hero-crop.ts`.

Update `extractHeroFromUpload` to optionally keep using `detectPhotoRegion` + crop (unchanged public behavior).

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/lib/import/hero-pick.test.ts`  
Expected: PASS

Also run: `npx tsc --noEmit`  
Expected: no errors from these files

- [ ] **Step 6: Commit**

```bash
git add src/lib/import/hero-crop.ts src/lib/import/hero-pick.ts src/lib/import/hero-pick.test.ts
git commit -m "feat: score and pick best food-photo hero across a group"
```

---

### Task 4: Append originals API

**Files:**
- Modify: `src/lib/supabase/recipes.ts` — add `appendRecipeOriginals`
- Create: `src/app/api/recipes/[id]/originals/route.ts`

- [ ] **Step 1: Add `appendRecipeOriginals` to `src/lib/supabase/recipes.ts`**

Place near `saveRecipe`. Reuse `inferOriginalType` and `RECIPE_UPLOADS_BUCKET`:

```ts
export async function appendRecipeOriginals(
  supabase: SupabaseClient,
  params: {
    familyId: string;
    recipeId: string;
    files: File[];
  }
): Promise<void> {
  const { familyId, recipeId, files } = params;
  if (files.length === 0) return;

  // Ensure recipe belongs to family
  const { data: existing, error: lookupError } = await supabase
    .from("recipes")
    .select("id")
    .eq("id", recipeId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!existing) throw new Error("Recipe not found");

  for (let index = 0; index < files.length; index += 1) {
    const current = files[index];
    const safeName = current.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${familyId}/${recipeId}/${Date.now()}-note-${index}-${safeName}`;

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
      file_name: current.name,
      file_size: current.size,
    });
    if (originalError) throw originalError;
  }
}
```

- [ ] **Step 2: Create `src/app/api/recipes/[id]/originals/route.ts`**

Mirror auth/family patterns from `src/app/api/recipes/[id]/hero/route.ts` and `src/app/api/recipes/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserFamily } from "@/lib/supabase/family";
import { appendRecipeOriginals } from "@/lib/supabase/recipes";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  try {
    const { id: recipeId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const family = await getUserFamily(supabase, user.id);
    if (!family) {
      return NextResponse.json({ error: "No family" }, { status: 400 });
    }

    const formData = await request.formData();
    const files = formData.getAll("file").filter((v): v is File => v instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    await appendRecipeOriginals(supabase, {
      familyId: family.familyId,
      recipeId,
      files,
    });

    return NextResponse.json({ ok: true, recipeId, count: files.length });
  } catch (error) {
    console.error("Append originals error:", error);
    return NextResponse.json({ error: "Failed to attach images" }, { status: 500 });
  }
}
```

(If this Next.js version’s `params` is sync not `Promise`, match whatever `src/app/api/recipes/[id]/hero/route.ts` already uses.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`  
Expected: clean for these files

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/recipes.ts src/app/api/recipes/[id]/originals/route.ts
git commit -m "feat: add API to append note images to an existing recipe"
```

---

### Task 5: `skipped` import status + queue UI

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/components/import-dropzone.tsx` (status display only in this task)

- [ ] **Step 1: Extend `ImportStatus`**

In `src/lib/types.ts`:

```ts
export type ImportStatus = "pending" | "processing" | "completed" | "failed" | "skipped";
```

- [ ] **Step 2: Update queue status text in `import-dropzone.tsx`**

In the status subtitle block, add a branch for `skipped` that shows `item.error` (we’ll store the human message in `error`):

```tsx
{item.status === "processing"
  ? "Extracting recipe with AI..."
  : item.status === "completed"
    ? "Added to your cookbook"
    : item.status === "skipped"
      ? item.error || "No usable recipe found"
      : item.status === "failed"
        ? item.error || "Import failed"
        : `${(item.fileSize / 1024).toFixed(1)} KB`}
```

For the trailing icon, treat `skipped` like a soft state (e.g. reuse `AlertCircle` with muted classes, or no icon). Example:

```tsx
{item.status === "skipped" && (
  <AlertCircle className="h-5 w-5 text-charcoal-muted" />
)}
```

Do **not** change processing logic yet.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`  
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/components/import-dropzone.tsx
git commit -m "feat: add skipped import status for unusable screenshots"
```

---

### Task 6: Grouping prompt — keep notes with parent recipe

**Files:**
- Modify: `src/app/api/ingest/group/route.ts`

- [ ] **Step 1: Update the grouping user prompt text**

Replace the text content in `groupChunk` with wording that includes notes/tips:

```ts
      text:
        "These images may be photos/screenshots of recipes. Some images are multiple " +
        "pages/screenshots of the SAME recipe (e.g. ingredients on one, steps on another, " +
        "front/back of a card, OR notes/tips/nutrition that belong to that dish). " +
        "Keep notes and side screenshots in the same group as their recipe. " +
        "Only create a separate group when the image is a distinct recipe or clearly unrelated. " +
        "Return ONLY JSON: " +
        '{"groups":[{"imageIds":["id1","id2"],"confidence":0.0}]}. ' +
        "confidence is 0..1 that the grouping is correct. Every id must appear exactly once. " +
        "Order imageIds within a group by page order. Ids: " +
        withThumbs.map((i) => i.id).join(", "),
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/ingest/group/route.ts
git commit -m "fix: keep recipe notes/tips in the same import group"
```

---

### Task 7: Wire gate + best-of-group hero + attach into `processGroup`

**Files:**
- Modify: `src/components/import-dropzone.tsx`

This is the main integration. Keep `fileMapRef` / object-URL cleanup behavior.

- [ ] **Step 1: Add imports**

```tsx
import { isUsableRecipe } from "@/lib/import/usable-recipe";
import {
  findNearestCompletedRecipe,
  type CompletedBatchRecipe,
} from "@/lib/import/attach-nearest";
import { pickBestHeroFromFiles } from "@/lib/import/hero-crop";
```

Remove the unused `extractHeroFromUpload` import if nothing else needs it.

- [ ] **Step 2: Add a batch registry ref**

Next to `fileMapRef`:

```tsx
  const batchCompletedRef = useRef<CompletedBatchRecipe[]>([]);
  const pendingAttachRef = useRef<
    Array<{
      queueId: string;
      group: RecipeGroup;
      images: ImportImageMeta[];
      files: File[];
    }>
  >([]);
```

Clear both at the start of `processFiles` (beginning of the callback):

```tsx
      batchCompletedRef.current = [];
      pendingAttachRef.current = [];
```

- [ ] **Step 3: Replace hero selection in `processGroup`**

Replace the block that does `extractHeroFromUpload(firstImage)` with:

```tsx
        let heroBlob: Blob | null = null;
        let heroImageUrl: string | undefined;
        const bestHero = await pickBestHeroFromFiles(files);
        if (bestHero) {
          heroBlob = bestHero.blob;
          heroImageUrl = URL.createObjectURL(heroBlob);
          objectUrlsRef.current.add(heroImageUrl);
        }
```

- [ ] **Step 4: After normalize, gate on usability**

Right after `normalizeExtractedRecipe(...)`, before the `usingDatabase` save:

```tsx
        if (!isUsableRecipe(data.recipe ?? {})) {
          const captureTimes = groupImages.map((img) => img.captureTime);
          const fileNames = groupImages.map((img) => img.fileName);
          const nearest = findNearestCompletedRecipe({
            captureTimes,
            fileNames,
            completed: batchCompletedRef.current,
          });

          if (nearest && usingDatabase) {
            const formData = new FormData();
            for (const file of files) formData.append("file", file);
            const attachResponse = await fetch(`/api/recipes/${nearest.recipeId}/originals`, {
              method: "POST",
              body: formData,
            });
            if (!attachResponse.ok) {
              throw new Error("Failed to attach notes to related recipe");
            }
            await refreshRecipes();
            updateImportItem(queueId, {
              status: "skipped",
              error: `No usable recipe found — attached as notes to “${nearest.title}”`,
              recipeId: nearest.recipeId,
              recipeTitle: nearest.title,
            });
          } else if (nearest && !usingDatabase) {
            // Local mode: no originals API; still skip creating an empty recipe.
            updateImportItem(queueId, {
              status: "skipped",
              error: `No usable recipe found — related to “${nearest.title}” (notes not attached in local mode)`,
              recipeId: nearest.recipeId,
              recipeTitle: nearest.title,
            });
          } else {
            // Parent may not be saved yet — defer for second pass.
            pendingAttachRef.current.push({ queueId, group, images, files: [...files] });
            updateImportItem(queueId, {
              status: "skipped",
              error: "No usable recipe found in this screenshot",
            });
          }

          if (heroImageUrl) {
            URL.revokeObjectURL(heroImageUrl);
            objectUrlsRef.current.delete(heroImageUrl);
          }
          for (const id of group.imageIds) {
            fileMapRef.current.delete(id);
          }
          await new Promise((resolve) => setTimeout(resolve, 400));
          return;
        }
```

- [ ] **Step 5: On successful save, register the completed recipe**

After a successful DB or local save (both branches), push:

```tsx
          batchCompletedRef.current.push({
            recipeId: /* persistData.recipe.id or recipe.id */,
            title: /* persistData.recipe.title or recipe.title */,
            captureTimes: groupImages.map((img) => img.captureTime),
            fileNames: groupImages.map((img) => img.fileName),
          });
```

- [ ] **Step 6: Type-check + lint this file**

Run: `npx tsc --noEmit`  
Expected: clean for `import-dropzone.tsx`

- [ ] **Step 7: Commit**

```bash
git add src/components/import-dropzone.tsx
git commit -m "feat: skip empty imports, attach notes, pick best-of-group hero"
```

---

### Task 8: Second-pass attach after the batch

**Files:**
- Modify: `src/components/import-dropzone.tsx`

- [ ] **Step 1: Add `retryPendingAttaches` helper inside the component**

```tsx
  const retryPendingAttaches = useCallback(async () => {
    const pending = [...pendingAttachRef.current];
    pendingAttachRef.current = [];

    for (const item of pending) {
      const groupImages = item.group.imageIds
        .map((id) => item.images.find((img) => img.id === id))
        .filter((img): img is ImportImageMeta => Boolean(img));
      const nearest = findNearestCompletedRecipe({
        captureTimes: groupImages.map((img) => img.captureTime),
        fileNames: groupImages.map((img) => img.fileName),
        completed: batchCompletedRef.current,
      });

      if (!nearest) {
        // Keep existing skip message on the queue item.
        continue;
      }

      if (usingDatabase) {
        const formData = new FormData();
        for (const file of item.files) formData.append("file", file);
        const attachResponse = await fetch(`/api/recipes/${nearest.recipeId}/originals`, {
          method: "POST",
          body: formData,
        });
        if (!attachResponse.ok) continue;
        await refreshRecipes();
      }

      updateImportItem(item.queueId, {
        status: "skipped",
        error: `No usable recipe found — attached as notes to “${nearest.title}”`,
        recipeId: nearest.recipeId,
        recipeTitle: nearest.title,
      });
    }
  }, [refreshRecipes, updateImportItem, usingDatabase]);
```

- [ ] **Step 2: Call it at the end of `processConfirmedGroups`**

```tsx
  const processConfirmedGroups = useCallback(
    async (groups: RecipeGroup[], images: ImportImageMeta[]) => {
      setIsProcessing(true);
      for (const group of groups) {
        await processGroup(group, images);
      }
      await retryPendingAttaches();
      setIsProcessing(false);
    },
    [processGroup, retryPendingAttaches]
  );
```

Also call `retryPendingAttaches` at the end of `handleConfirmReview` after `processConfirmedGroups` (already covered if `processConfirmedGroups` always retries).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`  
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add src/components/import-dropzone.tsx
git commit -m "feat: second-pass attach for notes that finished before their parent recipe"
```

---

### Task 9: Verification

- [ ] **Step 1: Run unit tests**

Run: `npm run test`  
Expected: all existing + new tests PASS

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit` and `npm run lint`  
Expected: no new errors in feature files (pre-existing family/recipes-provider lint may remain)

- [ ] **Step 3: Manual checks** (document results; do not claim pass without running)

1. Drop [ingredients, instructions, food photo] for one recipe → one recipe; hero is the food photo (or crop), not ingredients.
2. Drop a notes screenshot that was previously split alone with a related recipe → no empty recipe; queue shows attached/skipped message; notes appear on the parent’s originals/gallery.
3. Drop a truly unrelated blank/notes image alone → skipped with “No usable recipe found in this screenshot”; no new recipe row.
4. Paste text / single usable image still imports normally.

- [ ] **Step 4: Commit only if any small fixups were needed; otherwise done**

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Usable gate (≥1 ingredient or instruction) | Task 1, 7 |
| Attach-to-nearest same batch | Task 2, 7 |
| Second pass for ordering | Task 8 |
| `skipped` status + message | Task 5, 7 |
| Grouping prompt notes tweak | Task 6 |
| Best-of-group hero score + crop | Task 3, 7 |
| Append originals API | Task 4 |
| No empty recipe created | Task 7 |
| Manual verification | Task 9 |

No TBD placeholders. Types: `CompletedBatchRecipe` defined in Task 2 and reused in Task 7–8. `pickBestHeroFromFiles` defined in Task 3 and used in Task 7.
