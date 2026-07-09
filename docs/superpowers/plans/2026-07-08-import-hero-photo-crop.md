# Import Hero Photo Crop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On recipe import, detect the largest photo-like region in an uploaded image and use a crop of it as the default hero, while keeping full originals.

**Architecture:** Pure scoring/region logic in `hero-crop.ts` (unit-tested with synthetic ImageData), browser wrappers for decode/crop, wired through import dropzone + `normalizeExtractedRecipe` + `saveRecipe` via optional `heroFile`.

**Tech Stack:** TypeScript, canvas/`createImageBitmap`, Vitest, Next.js FormData + Supabase storage

---

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/import/hero-crop.ts` | Detect photo region + crop helpers |
| `src/lib/import/hero-crop.test.ts` | Unit tests for scoring/region selection |
| `src/lib/import-recipe.ts` | Prefer `heroImageUrl` for hero |
| `src/components/import-dropzone.tsx` | Call extract + pass hero / `heroFile` |
| `src/app/api/recipes/route.ts` | Parse optional `heroFile` |
| `src/lib/supabase/recipes.ts` | Upload hero separately from originals |

### Task 1: Core detection (TDD)

**Files:**
- Create: `src/lib/import/hero-crop.ts`
- Create: `src/lib/import/hero-crop.test.ts`

- [x] Write failing tests for `findPhotoRegionFromImageData` (photo block in middle of flat chrome → box; full-photo image → null; tiny speck → null)
- [x] Implement scoring + region merge + confidence gates
- [x] Implement `extractHeroFromUpload` / `cropHeroImage` wrappers
- [x] Run `npm test` — pass

### Task 2: Normalize + import wiring

**Files:**
- Modify: `src/lib/import-recipe.ts`
- Modify: `src/components/import-dropzone.tsx`

- [x] Add `heroImageUrl` option to `normalizeExtractedRecipe`
- [x] In `processGroup`, call `extractHeroFromUpload(files[0])`, pass URL, append `heroFile` to FormData
- [x] Track/revoke crop object URLs correctly

### Task 3: Persist hero file

**Files:**
- Modify: `src/app/api/recipes/route.ts`
- Modify: `src/lib/supabase/recipes.ts`

- [x] Accept `heroFile` in POST multipart
- [x] In `saveRecipe`, upload originals as today; if `heroFile`, set `hero_image` to that path instead of `files[0]`

### Task 4: Verify

- [x] `npm test` green
- [ ] Manual: re-import Sloppy Joes screenshot → card shows food, not gray wall
