# Import Hero Photo Crop — Design

**Date:** 2026-07-08  
**Status:** Approved (pending spec review)

## Problem

When a user imports a screenshot or cookbook page photo, Recipebook already
uses the uploaded image as the recipe hero. For tall page captures (e.g. a
phone screenshot of a recipe blog), `object-cover` on recipe cards crops to
the center/top of the full frame. The food photo often sits lower in the
screenshot, so cards show mostly UI chrome, ads, or empty background — with
only a sliver of the dish visible.

Example: a “Vegan Sloppy Joes” screenshot contains a clear food photo in the
middle/lower portion of the page; the card hero shows the gray wall above the
sandwiches.

## Goals

- Detect the largest photo-like region in an imported image (client-side).
- Crop that region and use it as the default `heroImage`.
- Keep the full original upload in `recipe_originals` / local originals.
- Fall back to the full image when no confident region is found.
- Work even when AI recipe extraction fails (no vision dependency for crop).

## Non-Goals (YAGNI)

- Vision-model crop boxes (deferred; heuristics first).
- Removing floating UI overlays (heart/search buttons) from the cropped photo.
- Manual crop editor UI on import or recipe detail.
- Picking the “best” page among multi-image groups (always use first image).
- Changing card `object-position` as a substitute for cropping.
- PDF page rasterization.

## Key Decisions (from brainstorming)

- **Outcome:** Crop a food-focused hero by default; originals stay full uploads.
- **Detection:** Client-side “largest photo block” heuristics (no extra AI call).
- **When:** Attempt on every imported image; fall back to full image if weak.
- **Approach:** Score a downscaled grid for photo-likeness, merge into
  rectangles, pick the largest confident candidate, crop with padding.

## Architecture

```
Per recipe group (after grouping, during processGroup):
  originals = full uploaded File(s)          — unchanged
  heroCandidate = first image File in group
  cropBlob = extractHeroFromUpload(heroCandidate)
       ├─ detectPhotoRegion (downscaled canvas heuristics)
       └─ cropHeroImage (full-res crop → JPEG/WebP Blob)
  if cropBlob:
    heroImage = objectURL(cropBlob) / upload crop as hero_image
  else:
    heroImage = first original (today’s behavior)
```

Detection runs in the browser so it still works when `/api/ingest` is
unavailable (local fallback / AI failure).

### Module: `src/lib/import/hero-crop.ts`

| Export | Role |
|--------|------|
| `detectPhotoRegion(file)` | Returns `CropBox \| null` in full-image coordinates |
| `cropHeroImage(file, box)` | Returns cropped `Blob` |
| `extractHeroFromUpload(file)` | Detect + crop, or `null` if no good region / any error |

`CropBox`: `{ x, y, width, height }` in source-pixel coordinates.

### Detection algorithm (v1)

Constants (tunable, but fixed for v1):

| Constant | Value | Meaning |
|----------|-------|---------|
| `DETECT_MAX_DIM` | `1024` | Max side length of analysis canvas |
| `GRID_SIZE` | `24` | Cells per side |
| `MIN_AREA_RATIO` | `0.15` | Reject regions smaller than 15% of image |
| `MAX_AREA_RATIO` | `0.85` | Skip crop if region is ≥ 85% (already a photo) |
| `MIN_ASPECT` | `0.4` | Reject ultra-wide/tall strips (width/height) |
| `MAX_ASPECT` | `2.5` | Same, upper bound |
| `PADDING_RATIO` | `0.04` | Expand crop box by 4% of its size |
| `OUTPUT_TYPE` | `image/jpeg` | Cropped hero MIME |
| `OUTPUT_QUALITY` | `0.85` | JPEG quality |

Steps:

1. Decode with `createImageBitmap`; downscale so max dimension is `DETECT_MAX_DIM`.
2. Divide into a `GRID_SIZE` × `GRID_SIZE` grid.
3. Per cell, score photo-likeness from pixel stats:
   - high color variance / edge density → photo-like
   - near-white / near-flat / low-chroma UI bands → not photo-like
4. Grow/merge adjacent high-scoring cells into candidate rectangles.
5. Accept the largest candidate only if all of:
   - area ≥ `MIN_AREA_RATIO` of the image
   - area ≤ `MAX_AREA_RATIO` of the image (otherwise no crop)
   - aspect ratio between `MIN_ASPECT` and `MAX_ASPECT`
6. Expand box by `PADDING_RATIO`; clamp to image bounds.
7. Map box from downscaled space back to full resolution.

If no candidate passes, return `null`.

### Integration — import UI

In `import-dropzone.tsx` `processGroup`:

1. After files are resolved for the group, call
   `extractHeroFromUpload(files[0])` when `files[0]` is an image.
2. On success, create an object URL for the crop blob; track it in
   `objectUrlsRef` like other previews.
3. Pass the crop URL into `normalizeExtractedRecipe` as an explicit hero
   (new option, e.g. `heroImageUrl`), **without** replacing `previewUrls`
   used for originals/gallery.
4. On DB save: append crop as a separate FormData field (e.g. `heroFile`)
   alongside original `file` entries.
5. On any detect/crop failure: omit hero override; behavior identical to today.

`normalizeExtractedRecipe` change:

- Prefer `options.heroImageUrl` for `recipe.heroImage` when present.
- Keep `gallery` / `originals` derived from full `previewUrls` only.

### Integration — persistence

`POST /api/recipes` + `saveRecipe`:

- Continue uploading all original `file` parts to `recipe_originals`.
- If `heroFile` is present, upload it to `recipe-uploads` and set
  `recipes.hero_image` to that storage path.
- If `heroFile` is absent, keep current behavior: `hero_image` = first
  original’s storage path.

Local/demo mode: cropped object URL becomes `heroImage`; originals remain
full preview URLs.

### UI

No new import controls in v1. Recipe detail hero upload / AI generate still
override the imported hero. Manual crop editor is out of scope.

## Error handling

- Any exception in detect/crop → catch, log optionally, return `null`.
- Never block or fail the import because of hero crop.
- HEIC / undecodable images: `createImageBitmap` failure → `null` (same as
  thumbnail helper today).

## Testing

- Unit-test scoring/region selection with synthetic fixtures where possible
  (grid of flat vs textured regions).
- Manual check with the Sloppy Joes screenshot: card should show sandwiches,
  not the gray wall; original still available.
- Manual check with a normal food photo (no chrome): no crop / full image as
  hero.
- Manual check with AI extraction unavailable: crop still applied.

## Future (explicitly deferred)

- Optional vision-model crop refinement when heuristics miss.
- Multi-image “best food photo” selection within a group.
- In-app crop adjuster after import.
