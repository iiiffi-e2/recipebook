# Smart Multi-Image Recipe Import — Design

**Date:** 2026-07-08
**Status:** Approved (pending spec review)

## Problem

The import flow treats every uploaded file as its own recipe. `ImportDropzone`
loops over each dropped file and calls `/api/ingest` + `/api/recipes` once per
file, so N images always produce N recipes.

Users often photograph **one** recipe as several images (front/back of a card,
multiple phone screenshots of a long recipe). Today those become several broken
half-recipes. But bulk upload (many distinct recipes at once) is still a wanted
feature. We need to support **both** in a single flow.

## Goals

- Detect when multiple images belong to the **same** recipe and combine them.
- Preserve bulk import (many distinct recipes in one drop).
- Keep the magic of "just drop everything" — minimal user effort when the app is
  confident, a lightweight safety net when it isn't.
- Handle large batches (100+ images) without blowing token/context limits or
  cost.

## Non-Goals (YAGNI)

- PDF support (still unsupported, unchanged).
- Cross-batch deduplication ("is this recipe already in my book?").
- Grouping across separate upload sessions — grouping is per-upload-batch only.

## Key Decisions (from brainstorming)

- **Grouping method:** AI decides groupings, but gated by confidence (`hybrid_optional`).
- **Confidence gate:** Confident groups auto-save; only uncertain groups go to a
  review screen.
- **Grouping signals:** Cheap metadata pre-clustering (capture time + filename
  sequence) first, then AI vision confirms/refines. Cheapest at scale.
- **Batch size:** Design to handle large batches (100+) gracefully.
- **Review controls:** Full — merge, split, reorder pages, mark-as-separate.

## Architecture — 4 stages

```
Drop N files
  → [Stage 1] Metadata pre-cluster (capture time + filename sequence)  — client, free
  → [Stage 2] AI vision confirms/refines clusters + confidence/group   — thumbnails, chunked, cheap
  → [Stage 3] Confidence gate:
        confident groups → auto extract + save (summary shown after)
        uncertain groups → Review screen (merge / split / reorder / mark-separate)
  → [Stage 4] Per confirmed group: single extraction call over all images → ONE recipe
```

The current per-file loop becomes a per-**group** loop. A group of 1 image
equals today's behavior, so plain bulk uploads still work unchanged.

### Stage 1 — Metadata pre-clustering (client, no cost)

- For each file, read a capture time: EXIF `DateTimeOriginal` when present, else
  `file.lastModified`. Read the filename.
- Provisionally cluster images that are BOTH:
  - within a short capture-time window of each other, AND
  - sequential/similar by filename (e.g. `IMG_0412`, `IMG_0413`).
- Output: provisional clusters. Handles most "burst of screenshots" cases for
  free before any AI call.

### Stage 2 — AI grouping confirmation (cheap vision pass)

- Send **downscaled thumbnails** (not full-res) of images, chunked so large
  batches never exceed token/context limits.
- Model confirms/adjusts the provisional clusters and returns, per group:
  member images, suggested page order, and a `confidence` score.
- Thumbnails + chunking bound the cost of the one expensive stage.

### Stage 3 — Confidence gate + review screen

- Groups with confidence above threshold → auto-proceed to extraction/save
  silently.
- Groups below threshold (or flagged ambiguous) → **Review screen**: each
  proposed recipe is a card of thumbnails. Controls: **merge** two cards,
  **split** a card, **reorder** pages within a card, **mark-as-separate**. One
  "Looks good, import" action.
- After the batch: summary, e.g. "Imported 12 recipes from 30 images (2 groups
  reviewed by you)."

### Stage 4 — Extraction (one recipe per group)

- For each confirmed group, send **all its images together** in a single
  `/api/ingest` call so the model stitches ingredients + instructions across
  pages into one recipe.
- Groups processed sequentially with **per-group error isolation** — one failed
  group does not abort the batch.

## Data Model

Existing schema already supports the multi-image case:

- `recipe_originals` supports **many rows per recipe**.
- `gallery` is already derived from all originals (hero fallback otherwise).

Changes required:

- `/api/ingest` accepts **multiple files** in one request.
- `/api/recipes` (multipart) and `saveRecipe()` accept an **array of files**:
  upload each, insert one `recipe_originals` row per file, set hero = first
  image.

## Error Handling

- Per-group isolation: a group that fails extraction is reported in the queue as
  failed without stopping other groups.
- Stage 2 chunk failure: fall back to the Stage 1 provisional clusters for the
  affected chunk (degrade gracefully rather than abort).
- Missing OpenAI key: fall back to metadata-only grouping + existing fallback
  recipe builder (per group).
- Per-group timeout, consistent with the current `INGEST_TIMEOUT_MS` approach.

## Affected Code (from exploration)

- `src/components/import-dropzone.tsx` — replace per-file loop with staged
  per-group pipeline; add Review screen integration.
- `src/app/api/ingest/route.ts` — accept multiple files; new grouping mode.
- `src/app/api/recipes/route.ts` — accept multiple files per recipe.
- `src/lib/supabase/recipes.ts` (`saveRecipe`) — accept and persist multiple
  originals.
- `src/lib/import-recipe.ts` — normalize with multiple preview images
  (gallery/originals).
- `src/lib/store.ts` / `src/lib/types.ts` — queue/state for groups + review.
- New: grouping logic (metadata pre-cluster + AI confirm) and Review UI
  component.

## Success Criteria

- Dropping front/back photos of one card produces **one** complete recipe.
- Dropping many distinct recipe photos still produces **one recipe each**.
- A mixed drop (some multi-image recipes, some singles) is grouped correctly;
  confident groups need no interaction, uncertain ones surface for review.
- Large batches complete without hitting token/context limits.
- A single failing group does not lose the rest of the batch.
