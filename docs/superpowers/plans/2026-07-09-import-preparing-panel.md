# Import Preparing Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show immediate prep feedback in the import dropzone (ready count + thumbnails + grouping stage) so users are not left staring at a silent page between file drop and Import Queue.

**Architecture:** Pure helpers in `prep-progress.ts` own phase/progress math. A presentational `ImportPreparingPanel` renders the dropzone takeover UI. `ImportDropzone` drives prep state while building thumbnails, flips to grouping before `/api/ingest/group`, then clears prep and continues the existing queue/review path.

**Tech Stack:** Next.js App Router, React 19, Framer Motion, react-dropzone, Vitest, existing ivory/sage import styles.

---

## File Structure

**New files:**
- `src/lib/import/prep-progress.ts` — prep phase types + pure helpers (`createPrepState`, `appendPrepItem`, `beginGrouping`, `prepProgressRatio`, `createPrepError`, `clearPrepState`)
- `src/lib/import/prep-progress.test.ts`
- `src/components/import/import-preparing-panel.tsx` — presentational preparing/error panel

**Modified files:**
- `src/components/import-dropzone.tsx` — prep state, incremental file prep, disable drop while busy, swap idle dropzone ↔ preparing panel

**Spec:** `docs/superpowers/specs/2026-07-09-import-preparing-panel-design.md`

---

### Task 1: Prep progress helpers (pure)

**Files:**
- Create: `src/lib/import/prep-progress.ts`
- Test: `src/lib/import/prep-progress.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import {
  appendPrepItem,
  beginGrouping,
  clearPrepState,
  createPrepError,
  createPrepState,
  prepProgressRatio,
  type PrepItem,
} from "./prep-progress";

const sampleItem = (id: string): PrepItem => ({
  id,
  fileName: `${id}.jpg`,
  previewUrl: `blob:${id}`,
  kind: "image",
});

describe("prep-progress", () => {
  it("createPrepState starts preparing with zero ready", () => {
    const state = createPrepState(3);
    expect(state).toEqual({
      phase: "preparing",
      total: 3,
      ready: 0,
      items: [],
      error: null,
    });
  });

  it("appendPrepItem adds the item and increments ready", () => {
    let state = createPrepState(2);
    state = appendPrepItem(state, sampleItem("a"));
    expect(state.ready).toBe(1);
    expect(state.items).toHaveLength(1);
    state = appendPrepItem(state, sampleItem("b"));
    expect(state.ready).toBe(2);
    expect(state.items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("beginGrouping switches phase and keeps items", () => {
    let state = createPrepState(1);
    state = appendPrepItem(state, sampleItem("a"));
    state = beginGrouping(state);
    expect(state.phase).toBe("grouping");
    expect(state.items).toHaveLength(1);
    expect(state.ready).toBe(1);
  });

  it("prepProgressRatio is ready/total, 1 when grouping, 0 when total is 0", () => {
    expect(prepProgressRatio(createPrepState(4))).toBe(0);
    expect(prepProgressRatio(appendPrepItem(createPrepState(4), sampleItem("a")))).toBe(0.25);
    expect(prepProgressRatio(beginGrouping(createPrepState(2)))).toBe(1);
    expect(prepProgressRatio(createPrepState(0))).toBe(0);
  });

  it("createPrepError keeps items and sets message", () => {
    let state = createPrepState(1);
    state = appendPrepItem(state, sampleItem("a"));
    state = createPrepError(state, "Grouping failed");
    expect(state.phase).toBe("error");
    expect(state.error).toBe("Grouping failed");
    expect(state.items).toHaveLength(1);
  });

  it("clearPrepState returns idle empty state", () => {
    expect(clearPrepState()).toEqual({
      phase: "idle",
      total: 0,
      ready: 0,
      items: [],
      error: null,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/import/prep-progress.test.ts`  
Expected: FAIL — cannot find module `./prep-progress`

- [ ] **Step 3: Write minimal implementation**

```ts
export type PrepPhase = "idle" | "preparing" | "grouping" | "error";

export type PrepItem = {
  id: string;
  fileName: string;
  previewUrl?: string;
  kind: "image" | "file";
};

export type PrepState = {
  phase: PrepPhase;
  total: number;
  ready: number;
  items: PrepItem[];
  error: string | null;
};

export function createPrepState(total: number): PrepState {
  return {
    phase: "preparing",
    total,
    ready: 0,
    items: [],
    error: null,
  };
}

export function appendPrepItem(state: PrepState, item: PrepItem): PrepState {
  return {
    ...state,
    ready: state.ready + 1,
    items: [...state.items, item],
  };
}

export function beginGrouping(state: PrepState): PrepState {
  return { ...state, phase: "grouping", error: null };
}

export function prepProgressRatio(state: PrepState): number {
  if (state.phase === "grouping") return 1;
  if (state.total <= 0) return 0;
  return state.ready / state.total;
}

export function createPrepError(state: PrepState, message: string): PrepState {
  return { ...state, phase: "error", error: message };
}

export function clearPrepState(): PrepState {
  return {
    phase: "idle",
    total: 0,
    ready: 0,
    items: [],
    error: null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/import/prep-progress.test.ts`  
Expected: PASS (all cases)

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/prep-progress.ts src/lib/import/prep-progress.test.ts
git commit -m "feat: add import prep progress helpers"
```

---

### Task 2: ImportPreparingPanel UI

**Files:**
- Create: `src/components/import/import-preparing-panel.tsx`

- [ ] **Step 1: Create the presentational panel**

Build a panel that matches the dropzone container styling (caller wraps or panel includes the dashed rounded box). Prefer the panel **including** the same outer classes as the idle dropzone so swap is seamless.

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PrepState } from "@/lib/import/prep-progress";
import { prepProgressRatio } from "@/lib/import/prep-progress";
import { cn } from "@/lib/utils";

type ImportPreparingPanelProps = {
  prep: PrepState;
  onDismissError: () => void;
};

export function ImportPreparingPanel({ prep, onDismissError }: ImportPreparingPanelProps) {
  const ratio = prepProgressRatio(prep);
  const isError = prep.phase === "error";
  const title =
    isError
      ? "Couldn’t prepare your files"
      : prep.phase === "grouping"
        ? "Grouping recipes…"
        : "Preparing your files";
  const subtitle = isError
    ? prep.error ?? "Something went wrong"
    : prep.phase === "grouping"
      ? "Organizing into recipes…"
      : `${prep.ready} of ${prep.total} ready`;

  return (
    <div
      className={cn(
        "relative rounded-3xl border-2 border-dashed border-sage-muted bg-ivory/50 p-8 text-center sm:p-12"
      )}
      aria-busy={!isError}
      aria-live="polite"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sage/15">
        {isError ? (
          <AlertCircle className="h-7 w-7 text-terracotta" />
        ) : (
          <Loader2 className="h-7 w-7 animate-spin text-sage" />
        )}
      </div>
      <h3 className="font-serif text-2xl font-medium text-charcoal">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-charcoal-muted">{subtitle}</p>

      {!isError && (
        <div className="mx-auto mt-5 h-2 max-w-md overflow-hidden rounded-full bg-sage-muted/40">
          <div
            className="h-full rounded-full bg-sage transition-[width] duration-300 ease-out"
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
      )}

      {prep.items.length > 0 && (
        <div className="mx-auto mt-6 max-h-48 max-w-2xl overflow-y-auto">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            <AnimatePresence initial={false}>
              {prep.items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="aspect-square overflow-hidden rounded-lg bg-cream"
                >
                  {item.kind === "image" && item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt={item.fileName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FileText className="h-5 w-5 text-sage" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {isError && (
        <div className="mt-6">
          <Button type="button" variant="outline" onClick={onDismissError}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Smoke-check TypeScript on the new file**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | Select-String -Pattern "import-preparing-panel"`  
Expected: no matches (file typechecks; unrelated project errors may still print)

Alternatively open the file in the editor and confirm no red squiggles on imports.

- [ ] **Step 3: Commit**

```bash
git add src/components/import/import-preparing-panel.tsx
git commit -m "feat: add import preparing panel UI"
```

---

### Task 3: Wire prep state into ImportDropzone

**Files:**
- Modify: `src/components/import-dropzone.tsx`

- [ ] **Step 1: Add imports and prep state**

Near the top of `import-dropzone.tsx`, add:

```ts
import { ImportPreparingPanel } from "@/components/import/import-preparing-panel";
import {
  appendPrepItem,
  beginGrouping,
  clearPrepState,
  createPrepError,
  createPrepState,
  type PrepState,
} from "@/lib/import/prep-progress";
```

Inside `ImportDropzone`, after existing `useState` / refs:

```ts
const [prep, setPrep] = useState<PrepState>(() => clearPrepState());
const isPreparing = prep.phase === "preparing" || prep.phase === "grouping";
```

- [ ] **Step 2: Refactor `processFiles` to drive prep progress**

Replace the body of `processFiles` so it:

1. Resets batch refs as today.
2. Calls `setPrep(createPrepState(files.length))` immediately.
3. Builds `images` in a loop; after each file is ready, also:

```ts
setPrep((prev) =>
  appendPrepItem(prev, {
    id,
    fileName: file.name,
    previewUrl,
    kind: file.type.startsWith("image/") ? "image" : "file",
  })
);
```

4. Before the grouping fetch (when `imageMetas.length > 0`):

```ts
setPrep((prev) => beginGrouping(prev));
```

If there are only non-images (no grouping call), still call `beginGrouping` briefly or skip straight to clear — prefer calling `setPrep(clearPrepState())` right before queue handoff either way.

5. Wrap the grouping `fetch` + gate in try/catch. On failure:

```ts
setPrep((prev) =>
  createPrepError(
    prev,
    error instanceof Error ? error.message : "Failed to prepare files"
  )
);
return;
```

Also clear `fileMapRef` entries created for this failed batch (iterate `images` ids and `delete`).

6. On success, **before** `addToImportQueue` / `processConfirmedGroups` / `setReview`:

```ts
setPrep(clearPrepState());
```

Keep the rest of confident/uncertain handling unchanged.

Full target shape for the try path around grouping (illustrative — preserve existing variable names and logic):

```ts
const processFiles = useCallback(
  async (files: File[]) => {
    batchCompletedRef.current = [];
    pendingAttachRef.current = [];
    setPrep(createPrepState(files.length));

    const images: ImportImageMeta[] = [];
    try {
      for (const file of files) {
        const id = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        fileMapRef.current.set(id, file);
        const previewUrl = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;
        if (previewUrl) objectUrlsRef.current.add(previewUrl);
        const meta: ImportImageMeta = {
          id,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          captureTime: getCaptureTime(file),
          previewUrl,
          thumbnail: file.type.startsWith("image/")
            ? await createThumbnail(file)
            : undefined,
        };
        images.push(meta);
        setPrep((prev) =>
          appendPrepItem(prev, {
            id,
            fileName: file.name,
            previewUrl,
            kind: file.type.startsWith("image/") ? "image" : "file",
          })
        );
      }

      const imageMetas = images.filter((i) => i.fileType.startsWith("image/"));
      const nonImageGroups: RecipeGroup[] = images
        .filter((i) => !i.fileType.startsWith("image/"))
        .map((i) => ({
          id: `g-${i.id}`,
          imageIds: [i.id],
          confidence: 1,
          needsReview: false,
        }));

      let groups: RecipeGroup[] = [...nonImageGroups];

      if (imageMetas.length > 0) {
        setPrep((prev) => beginGrouping(prev));
        const provisional = preClusterByMetadata(imageMetas).map((c) =>
          c.map((i) => i.id)
        );
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
        const data = (await response.json().catch(() => null)) as {
          groups?: RecipeGroup[];
          error?: string;
        } | null;
        if (!response.ok) {
          throw new Error(data?.error || "Failed to group screenshots");
        }
        const gated = applyConfidenceGate(data?.groups ?? []);
        groups = [...groups, ...gated];
      }

      setPrep(clearPrepState());

      const confident = groups.filter((g) => !g.needsReview);
      const uncertain = groups.filter((g) => g.needsReview);

      addToImportQueue(buildQueueItems(confident, images));
      await processConfirmedGroups(confident, images);

      if (uncertain.length > 0) {
        setReview(images, uncertain);
      }
    } catch (error) {
      for (const img of images) {
        fileMapRef.current.delete(img.id);
      }
      setPrep((prev) =>
        createPrepError(
          prev,
          error instanceof Error ? error.message : "Failed to prepare files"
        )
      );
    }
  },
  [addToImportQueue, processConfirmedGroups, setReview]
);
```

- [ ] **Step 3: Disable dropzone while preparing; swap UI**

Update `useDropzone`:

```ts
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop,
  accept: ACCEPTED_TYPES,
  multiple: true,
  disabled: isPreparing || prep.phase === "error",
});
```

Also guard paste:

```ts
const handlePaste = async () => {
  if (isPreparing || prep.phase === "error") return;
  // ...existing paste logic
};
```

In the JSX, wrap the idle dropzone and preparing panel:

```tsx
{prep.phase === "idle" ? (
  <div {...getRootProps()} className={cn(/* existing dropzone classes */)}>
    <input {...getInputProps()} />
    {/* existing idle content unchanged */}
  </div>
) : (
  <ImportPreparingPanel
    prep={prep}
    onDismissError={() => {
      for (const item of prep.items) {
        fileMapRef.current.delete(item.id);
      }
      setPrep(clearPrepState());
    }}
  />
)}
```

Keep source-type chips, `ImportReview`, and Import Queue blocks as they are today (below).

- [ ] **Step 4: Manual verification checklist**

Run the app (`npm run dev`), open `/app/import`, and verify:

1. Drop ~10+ screenshots → preparing panel appears immediately; “X of N ready” climbs; thumbs fade in.
2. Copy switches to “Grouping recipes…”; then panel clears and Import Queue appears.
3. Drop a PDF/txt → file-icon tile appears in the grid.
4. (Optional) Temporarily force grouping to throw → error panel + Dismiss restores idle dropzone; a new drop works.
5. While preparing, dropzone does not accept another drop.

- [ ] **Step 5: Run unit tests**

Run: `npx vitest run src/lib/import/prep-progress.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/import-dropzone.tsx src/components/import/import-preparing-panel.tsx
git commit -m "feat: show preparing panel while import files are staged"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Immediate feedback on drop | Task 3 (`setPrep(createPrepState)` first) |
| Ready count + thumbnails | Tasks 1–3 |
| Grouping stage copy | Tasks 2–3 |
| Inline dropzone takeover | Tasks 2–3 |
| Disable second drop | Task 3 |
| Error + Dismiss clears fileMap | Task 3 |
| No Storage/AI queue changes | Out of scope — not modified |
| Object URL cleanup unchanged | Task 3 reuses `objectUrlsRef` |

No placeholders left. Types (`PrepState`, `PrepItem`, helpers) are consistent across tasks.
