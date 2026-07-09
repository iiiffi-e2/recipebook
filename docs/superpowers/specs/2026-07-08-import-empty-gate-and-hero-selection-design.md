# Import Empty-Recipe Gate + Best-of-Group Hero — Design

**Date:** 2026-07-08  
**Status:** Approved design (pending user review of written spec)

## Problem

Manual testing of multi-image import surfaced two bugs:

1. **Empty standalone recipe.** A notes screenshot that belonged with a recipe was split into its own group. Extraction produced a recipe with no ingredients and no instructions, and we still saved it.
2. **Wrong hero image.** A group of three screenshots (ingredients, instructions, food photo) used the ingredients screenshot as the hero. We already crop a photo region from an upload (`extractHeroFromUpload`), but we only run it on the **first** image in the group — so a food photo later in the group is never considered.

## Goals

- Never create a recipe that has no usable content (no ingredients and no instructions).
- When an unusable group looks related to another recipe in the same batch, attach its images as originals/notes on that recipe instead of discarding them.
- When nothing related exists, skip creating a recipe and tell the user clearly.
- Prefer a real food photo as the hero when one exists in the group, without extra AI cost.
- Reduce how often notes pages get split into their own groups in the first place.

## Non-Goals

- Cross-batch attachment (only attach within the current import batch).
- Manual “attach this image to recipe X” UI beyond the existing review merge/split controls.
- Changing how users can later replace a hero on the recipe detail page.
- PDF support.

## Decisions

| Topic | Choice |
|-------|--------|
| Empty groups | Post-extract gate: refuse to save; try attach-to-nearest; else skip with message |
| Grouping | Also tighten the AI grouping prompt so notes/tips stay with the parent recipe |
| Hero | Score every image in the group with the existing photo-region detector; pick the best; crop it |

## Design

### 1. Usable-recipe gate

A recipe is **usable** if it has at least one ingredient with a non-empty name **or** at least one instruction with non-empty text.

After `/api/ingest` returns for a group:

1. Normalize the extracted payload.
2. If usable → continue with today’s save path (including hero selection below).
3. If **not** usable → do **not** call `POST /api/recipes`. Instead run the attach/skip path.

### 2. Attach-to-nearest (same batch only)

When a group fails the usable gate:

1. Look at other groups from this batch that already completed successfully and produced a saved `recipeId`.
2. Pick the nearest candidate using the same cheap signals as metadata pre-clustering:
   - Capture-time proximity (within a generous window, e.g. 2 minutes — notes are often taken right after the recipe screenshots).
   - Shared filename stem / near-consecutive numeric suffixes.
3. If a candidate is found:
   - Append the unusable group’s files as additional `recipe_originals` on that recipe (new small API or extend an existing originals upload path).
   - Mark the queue item as **skipped** (new status) with a message like:  
     `No usable recipe found — attached as notes to “Chicken Tacos”`.
4. If no candidate is found:
   - Mark the queue item as **skipped** with:  
     `No usable recipe found in this screenshot`.
   - Do not create a recipe and do not upload the files as a new recipe.

**Ordering note:** Groups are processed sequentially today. An unusable group that appears *before* its parent in the queue cannot attach yet. Mitigation: after the full batch finishes, do a second pass over skipped-unattached items and retry attach against any recipes that completed later in the same batch. If still no match, leave the skip message as-is.

### 3. Queue status

Extend `ImportStatus` with `"skipped"`:

- UI: show the skip message (terracotta/muted, not a hard error icon — or a distinct “skipped” treatment).
- `skipped` does not count as a successful import; “View in Cookbook” still keys off `completed`.

### 4. Grouping prompt tweak

Update `/api/ingest/group` so the model is told that:

- Notes, tips, nutrition, or side screenshots that clearly belong to the same dish should stay in that recipe’s group.
- Only create a separate group when the image is a distinct recipe (or clearly unrelated).

This reduces how often the empty-gate fires; the gate remains the safety net.

### 5. Best-of-group hero selection

Today: `extractHeroFromUpload(firstImage)` only.

Change to:

1. For each image file in the group, run the existing photo-region detector and obtain a **score** (export or reuse the region’s cell-score / region confidence from `hero-crop.ts`).
2. Pick the image with the highest score that clears a minimum threshold (reuse `PHOTO_SCORE_THRESHOLD` / region presence).
3. Crop that image’s photo region and use the crop as `heroFile` / `heroImageUrl` (same persistence path as today).
4. If no image scores well enough, fall back to current behavior (no crop / first image as gallery hero).

No extra OpenAI call. All images in the group remain in `recipe_originals` / gallery regardless of which one wins hero.

### 6. Affected code (expected)

- `src/lib/import/hero-crop.ts` — expose a score (or `scoreAndCrop`) so we can compare across files.
- `src/components/import-dropzone.tsx` — usable gate, attach/skip + second pass, best-of-group hero.
- `src/lib/types.ts` / import queue UI — `skipped` status + messaging.
- `src/app/api/ingest/group/route.ts` — grouping prompt tweak.
- `src/lib/supabase/recipes.ts` + recipes API — append originals to an existing recipe (attach path).
- Unit tests for: usable check, nearest-candidate selection, hero score ranking.

## Success criteria

- Notes-only screenshot that was wrongly split off does **not** become its own empty recipe; it either attaches to the related recipe or is skipped with a clear message.
- Group of [ingredients, instructions, food photo] uses the food photo (or a crop of it) as the hero, not the ingredients page.
- Distinct single-image recipes and paste-text import still work unchanged.
- Bulk import of many distinct recipes still creates one recipe each when content is usable.

## Out of scope / later

- Letting the user manually re-attach a skipped image from the queue UI.
- Cross-session “this notes image belongs to recipe X from last week.”
