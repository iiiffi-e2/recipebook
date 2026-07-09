"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Camera,
  FileText,
  Image as ImageIcon,
  Clipboard,
  FolderOpen,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecipesContext } from "@/components/providers/recipes-provider";
import { useAppStore } from "@/lib/store";
import { normalizeExtractedRecipe } from "@/lib/import-recipe";
import { pickBestHeroFromFiles } from "@/lib/import/hero-crop";
import { resizeFilesForIngest } from "@/lib/import/ingest-resize";
import { isUsableRecipe } from "@/lib/import/usable-recipe";
import {
  findNearestCompletedRecipe,
  type CompletedBatchRecipe,
} from "@/lib/import/attach-nearest";
import { recipeToSaveInput } from "@/lib/supabase/recipes";
import { uploadRecipeFilesDirect } from "@/lib/import/direct-upload";
import { formatUploadError } from "@/lib/import/upload-reliability";
import { createThumbnail } from "@/lib/import/thumbnail";
import { getCaptureTime, preClusterByMetadata } from "@/lib/import/metadata";
import { applyConfidenceGate } from "@/lib/import/grouping";
import { ImportReview } from "@/components/import/import-review";
import { ImportPreparingPanel } from "@/components/import/import-preparing-panel";
import {
  appendPrepItem,
  beginGrouping,
  clearPrepState,
  createPrepError,
  createPrepState,
  type PrepState,
} from "@/lib/import/prep-progress";
import type { ImportImageMeta, RecipeGroup } from "@/lib/import/types";
import type { ImportItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = {
  "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic"],
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

const INGEST_TIMEOUT_MS = 120_000;

async function ingestGroup(files: File[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INGEST_TIMEOUT_MS);
  try {
    // Downscale for the AI call only — full-res files are still saved as originals.
    const ingestFiles = await resizeFilesForIngest(files);
    const formData = new FormData();
    for (const file of ingestFiles) formData.append("file", file);

    const response = await fetch("/api/ingest", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 413) {
        throw new Error(
          "Images were too large to process. Try fewer screenshots, or smaller photos."
        );
      }
      throw new Error(data?.error || "Import failed");
    }

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

function buildQueueItems(groups: RecipeGroup[], images: ImportImageMeta[]): ImportItem[] {
  return groups.map((g) => {
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
}

export function ImportDropzone() {
  const {
    importQueue,
    addToImportQueue,
    updateImportItem,
    addImportedRecipe,
    reviewGroups,
    reviewImages,
    setReview,
    clearReview,
  } = useAppStore();
  const { usingDatabase, refreshRecipes, family } = useRecipesContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const fileMapRef = useRef<Map<string, File>>(new Map());
  const batchCompletedRef = useRef<CompletedBatchRecipe[]>([]);
  const pendingAttachRef = useRef<
    Array<{
      queueId: string;
      group: RecipeGroup;
      images: ImportImageMeta[];
      files: File[];
    }>
  >([]);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const [prep, setPrep] = useState<PrepState>(() => clearPrepState());
  const isPreparing = prep.phase === "preparing" || prep.phase === "grouping";

  // Revoke any object URLs still outstanding when leaving the import view.
  // URLs adopted by a locally-stored recipe (non-DB mode) are removed from the
  // set as they're used, so they survive navigation.
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

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

        let heroBlob: Blob | null = null;
        let heroImageUrl: string | undefined;
        const bestHero = await pickBestHeroFromFiles(files);
        if (bestHero) {
          heroBlob = bestHero.blob;
          heroImageUrl = URL.createObjectURL(heroBlob);
          objectUrlsRef.current.add(heroImageUrl);
        }

        const recipe = normalizeExtractedRecipe(data.recipe ?? {}, recipeId, {
          previewUrls,
          heroImageUrl,
          fileName: groupImages[0]?.fileName,
        });

        if (!isUsableRecipe(data.recipe ?? {})) {
          const captureTimes = groupImages.map((img) => img.captureTime);
          const fileNames = groupImages.map((img) => img.fileName);
          const nearest = findNearestCompletedRecipe({
            captureTimes,
            fileNames,
            completed: batchCompletedRef.current,
          });

          if (nearest && usingDatabase) {
            if (!family?.familyId) {
              throw new Error("No family available for upload");
            }
            const { originals } = await uploadRecipeFilesDirect({
              familyId: family.familyId,
              recipeId: nearest.recipeId,
              files,
            });
            const attachResponse = await fetch(`/api/recipes/${nearest.recipeId}/originals`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ uploadedOriginals: originals }),
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
            updateImportItem(queueId, {
              status: "skipped",
              error: `No usable recipe found — related to “${nearest.title}” (notes not attached in local mode)`,
              recipeId: nearest.recipeId,
              recipeTitle: nearest.title,
            });
          } else {
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

        if (usingDatabase) {
          if (!family?.familyId) {
            throw new Error("No family available for upload");
          }
          const recipeId = crypto.randomUUID();
          const heroFile = heroBlob
            ? new File([heroBlob], "hero.jpg", { type: heroBlob.type || "image/jpeg" })
            : null;
          const { originals, heroStoragePath } = await uploadRecipeFilesDirect({
            familyId: family.familyId,
            recipeId,
            files,
            heroFile,
          });

          const persistResponse = await fetch("/api/recipes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...recipeToSaveInput(recipe),
              recipeId,
              fileName: groupImages[0]?.fileName ?? "recipe",
              uploadedOriginals: originals,
              heroStoragePath,
            }),
          });
          const persistData = await persistResponse.json().catch(() => null);
          if (!persistResponse.ok) {
            throw new Error(persistData?.error || "Failed to save recipe to database");
          }
          // Crop URL was only for optimistic local display; DB has its own path.
          if (heroImageUrl) {
            URL.revokeObjectURL(heroImageUrl);
            objectUrlsRef.current.delete(heroImageUrl);
          }
          await refreshRecipes();
          updateImportItem(queueId, {
            status: "completed",
            recipeId: persistData.recipe.id,
            recipeTitle: persistData.recipe.title,
          });
          batchCompletedRef.current.push({
            recipeId: persistData.recipe.id,
            title: persistData.recipe.title,
            captureTimes: groupImages.map((img) => img.captureTime),
            fileNames: groupImages.map((img) => img.fileName),
          });
        } else {
          addImportedRecipe(recipe);
          // These previews (and optional crop) now back a stored recipe; don't revoke them.
          previewUrls.forEach((url) => objectUrlsRef.current.delete(url));
          if (heroImageUrl) objectUrlsRef.current.delete(heroImageUrl);
          updateImportItem(queueId, {
            status: "completed",
            recipeId: recipe.id,
            recipeTitle: recipe.title,
          });
          batchCompletedRef.current.push({
            recipeId: recipe.id,
            title: recipe.title,
            captureTimes: groupImages.map((img) => img.captureTime),
            fileNames: groupImages.map((img) => img.fileName),
          });
        }
      } catch (error) {
        updateImportItem(queueId, {
          status: "failed",
          error:
            error instanceof Error && error.name === "AbortError"
              ? "Import timed out. Try fewer/smaller images."
              : formatUploadError(error),
        });
      }

      // The group's files are no longer needed once processed.
      for (const id of group.imageIds) {
        fileMapRef.current.delete(id);
      }

      await new Promise((resolve) => setTimeout(resolve, 400));
    },
    [addImportedRecipe, family?.familyId, refreshRecipes, updateImportItem, usingDatabase]
  );

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
        continue;
      }

      if (usingDatabase) {
        if (!family?.familyId) continue;
        try {
          const { originals } = await uploadRecipeFilesDirect({
            familyId: family.familyId,
            recipeId: nearest.recipeId,
            files: item.files,
          });
          const attachResponse = await fetch(`/api/recipes/${nearest.recipeId}/originals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uploadedOriginals: originals }),
          });
          if (!attachResponse.ok) continue;
          await refreshRecipes();
        } catch {
          continue;
        }
      }

      updateImportItem(item.queueId, {
        status: "skipped",
        error: `No usable recipe found — attached as notes to “${nearest.title}”`,
        recipeId: nearest.recipeId,
        recipeTitle: nearest.title,
      });
    }
  }, [family?.familyId, refreshRecipes, updateImportItem, usingDatabase]);

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

  const handleConfirmReview = useCallback(async () => {
    const groups = reviewGroups;
    const images = reviewImages;
    clearReview();
    addToImportQueue(buildQueueItems(groups, images));
    await processConfirmedGroups(groups, images);
  }, [reviewGroups, reviewImages, clearReview, addToImportQueue, processConfirmedGroups]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        processFiles(acceptedFiles);
      }
    },
    [processFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
    disabled: isPreparing || prep.phase === "error",
  });

  const handlePaste = async () => {
    if (isPreparing || prep.phase === "error") return;
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        const blob = new Blob([text], { type: "text/plain" });
        const file = new File([blob], "pasted-recipe.txt", { type: "text/plain" });
        processFiles([file]);
      }
    } catch {
      // Clipboard access denied
    }
  };

  const sourceTypes = [
    { icon: ImageIcon, label: "Photos & Screenshots" },
    { icon: FileText, label: "PDFs & Documents" },
    { icon: Camera, label: "Camera Scan" },
    { icon: Clipboard, label: "Copy & Paste" },
    { icon: FolderOpen, label: "Bulk Folder Upload" },
  ];

  const completedCount = importQueue.filter((item) => item.status === "completed").length;

  return (
    <div className="space-y-8">
      {prep.phase === "idle" ? (
        <div
          {...getRootProps()}
          className={cn(
            "relative cursor-pointer rounded-3xl border-2 border-dashed border-sage-muted bg-ivory/50 p-8 text-center transition-all duration-300 sm:p-16",
            isDragActive && "drop-zone-active border-sage bg-sage/5",
            !isDragActive && "hover:border-sage hover:bg-ivory"
          )}
        >
          <input {...getInputProps()} />
          <motion.div
            animate={{ scale: isDragActive ? 1.05 : 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-sage/15">
              <Upload className="h-10 w-10 text-sage" />
            </div>
            <h3 className="font-serif text-2xl font-medium text-charcoal">
              {isDragActive ? "Drop your recipes here" : "Import your family recipes"}
            </h3>
            <p className="mx-auto mt-3 max-w-md text-charcoal-muted">
              Drag and drop photos, screenshots, PDFs, handwritten cards, or entire folders.
              Our AI will extract and organize everything automatically.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button type="button">Choose Files</Button>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePaste();
                }}
              >
                Paste Recipe
              </Button>
            </div>
          </motion.div>
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {sourceTypes.map((source) => (
          <div
            key={source.label}
            className="flex flex-col items-center gap-2 rounded-2xl bg-ivory p-4 text-center shadow-[var(--shadow-soft)]"
          >
            <source.icon className="h-6 w-6 text-sage" />
            <span className="text-xs text-charcoal-muted">{source.label}</span>
          </div>
        ))}
      </div>

      {reviewGroups.length > 0 && <ImportReview onConfirm={handleConfirmReview} />}

      <AnimatePresence>
        {importQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl bg-ivory p-6 shadow-[var(--shadow-soft)]"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-serif text-xl font-medium">
                Import Queue ({importQueue.length})
              </h3>
              <div className="flex items-center gap-3">
                {completedCount > 0 && !isProcessing && (
                  <Link href="/app">
                    <Button size="sm" variant="outline">
                      View in Cookbook
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                {isProcessing && (
                  <span className="flex items-center gap-2 text-sm text-sage">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing with AI...
                  </span>
                )}
              </div>
            </div>
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {importQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl bg-cream p-4"
                >
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt={item.fileName}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sage-muted">
                      <FileText className="h-6 w-6 text-sage" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.recipeTitle || item.fileName}
                    </p>
                    <p className="text-xs text-charcoal-muted">
                      {item.status === "processing"
                        ? "Extracting recipe with AI..."
                        : item.status === "completed"
                          ? "Added to your cookbook"
                          : item.status === "skipped"
                            ? item.error || "No usable recipe found"
                            : item.status === "failed"
                              ? item.error || "Import failed"
                              : `${(item.fileSize / 1024).toFixed(1)} KB`}
                    </p>
                  </div>
                  {item.status === "processing" && (
                    <Loader2 className="h-5 w-5 animate-spin text-sage" />
                  )}
                  {item.status === "completed" && item.recipeId && (
                    <Link href={`/app/recipes/${item.recipeId}`}>
                      <Button size="sm" variant="ghost">
                        Open
                      </Button>
                    </Link>
                  )}
                  {item.status === "completed" && !item.recipeId && (
                    <CheckCircle2 className="h-5 w-5 text-sage" />
                  )}
                  {item.status === "failed" && (
                    <AlertCircle className="h-5 w-5 text-terracotta" />
                  )}
                  {item.status === "skipped" && (
                    <AlertCircle className="h-5 w-5 text-charcoal-muted" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
