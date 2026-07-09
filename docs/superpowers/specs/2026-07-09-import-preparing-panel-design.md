# Import Preparing Panel — Design

**Date:** 2026-07-09  
**Status:** Approved design (pending user review of written spec)

## Problem

When a user drops a batch of screenshots on the import page, nothing visible happens until thumbnail creation and AI grouping finish. Only then does the Import Queue appear. Large batches feel stuck — users wait with no feedback that work is underway.

The silent gap is **prep only** (local previews/thumbnails + `/api/ingest/group`). Storage upload and AI extraction already surface later via the Import Queue and are out of scope.

## Goals

- Show immediate feedback the moment files are accepted.
- Communicate progress while files are prepared (count + visible thumbnails).
- Communicate when grouping is running.
- Hand off cleanly to the existing Import Queue / review UI when prep finishes.
- Keep the idle dropzone UX unchanged when not preparing.

## Non-Goals

- Per-file Storage upload progress.
- Changes to AI extraction / Import Queue processing UI.
- Cancel mid-prep.
- Parallel multi-batch drops while preparing.
- New shared UI kit components (e.g. Progress primitive) unless already present.

## Decisions

| Topic | Choice |
|-------|--------|
| Scope | Prep only (thumbnails + grouping), not storage/AI |
| Detail | Overall status **and** compact thumbnail/file list |
| Placement | Inline dropzone takeover (same container as the idle dropzone) |
| State | Local React state in `ImportDropzone` only |
| Second drop | Disabled while preparing/grouping |

## Design

### 1. Behavior & states

On drop / file choose / paste, the dashed dropzone immediately switches into a preparing panel and stays there until grouping finishes or fails.

| State | User-facing copy | Notes |
|-------|------------------|--------|
| `preparing` | Title: “Preparing your files”; subtitle: “X of N ready” | Increment `X` as each file’s preview/thumbnail (or non-image tile) is ready |
| `grouping` | Title: “Grouping recipes…”; subtitle: “Organizing into recipes…” | Thumbnails remain visible; progress bar at 100% of file prep |
| `error` | Short error + “Dismiss” button | Clears prep state and `fileMapRef` entries for the failed batch; returns to idle so the user can drop again |
| Done | Panel exits | Existing `addToImportQueue` / `setReview` / processing path unchanged |

While `preparing` or `grouping`, the dropzone does not accept new files. Source-type chips below the dropzone stay visible. Import Queue and review UI appear only after prep succeeds, as today.

### 2. UI layout

Reuse the existing rounded dashed dropzone container so layout does not jump:

- **Header:** spinner + stage title
- **Subtitle:** ready count or grouping message
- **Progress bar:** simple filled bar (sage on ivory) — no new Progress component; plain divs
- **Thumbnail grid:** compact squares; ~3–4 columns on mobile, denser on desktop; scrollable for large batches; non-images use a file-icon tile; newly ready thumbs fade in via existing Framer Motion patterns

When prep finishes, AnimatePresence returns the idle dropzone; Import Queue / `ImportReview` render below as they do today.

### 3. Implementation

All changes live in `ImportDropzone` (optionally a small presentational child in the same file or `src/components/import/` if the JSX gets heavy).

**Local state:**

- `prepPhase`: `idle | preparing | grouping | error`
- `prepTotal`, `prepReady`
- `prepItems`: `{ id, fileName, previewUrl?, kind: "image" | "file" }[]`
- `prepError`: string | null

**`processFiles` refactor:**

1. Set `preparing`, `prepTotal = files.length`, `prepReady = 0`, clear `prepItems`.
2. For each file: create id, store in `fileMapRef`, build preview URL / thumbnail (same as today), append to `prepItems`, increment `prepReady`.
3. Set `grouping`, then call `/api/ingest/group` and apply confidence gate (unchanged).
4. On success: reset prep to idle, then `addToImportQueue` / `processConfirmedGroups` / `setReview` as today.
5. On failure: set `error` with a readable message; keep thumbnails visible for context; Dismiss clears prep state and failed-batch `fileMapRef` entries (no automatic retry — user drops again).

**Cleanup:** Continue tracking object URLs in `objectUrlsRef` and revoke on unmount; prep-only URLs that become queue preview URLs follow the existing adoption rules.

**No changes** to Zustand import queue shape, APIs, or Storage upload path.

### 4. Error handling

- Grouping API failure or unexpected throw during prep → `prepPhase = error` with message (prefer server `error` when present, else a short generic string).
- Dismiss clears prep state and returns to the idle dropzone; files already in `fileMapRef` for a failed batch should be cleared so a retry starts clean.

### 5. Testing

- Prefer a focused unit/UI-level check if the prep state machine is extracted; otherwise manual verification is enough for this UI-only change:
  - Drop many images → preparing panel appears immediately with rising “X of N”.
  - After thumbnails, copy switches to grouping; then Import Queue appears.
  - Non-image file shows icon tile.
  - Forced grouping failure shows error + dismiss restores dropzone.
  - Dropzone does not accept a second drop while preparing.

## Summary

Replace the silent post-drop wait with an inline preparing panel in the dropzone: live ready count, thumbnail grid, then a grouping stage, before handing off to the existing Import Queue.
