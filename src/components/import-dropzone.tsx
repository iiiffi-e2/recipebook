"use client";

import { useCallback, useState } from "react";
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
import { recipeToSaveInput } from "@/lib/supabase/recipes";
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

async function ingestFile(file: File) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INGEST_TIMEOUT_MS);

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/ingest", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
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

export function ImportDropzone() {
  const { importQueue, addToImportQueue, updateImportItem, addImportedRecipe } =
    useAppStore();
  const { usingDatabase, refreshRecipes } = useRecipesContext();
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = useCallback(
    async (files: File[]) => {
      const newItems: ImportItem[] = files.map((file) => ({
        id: `import-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        status: "pending" as const,
        uploadedAt: new Date().toISOString(),
      }));

      addToImportQueue(newItems);
      setIsProcessing(true);

      for (const item of newItems) {
        updateImportItem(item.id, { status: "processing" });

        const file = files.find((candidate) => candidate.name === item.fileName);
        if (!file) {
          updateImportItem(item.id, {
            status: "failed",
            error: "Could not read uploaded file",
          });
          continue;
        }

        try {
          const data = await ingestFile(file);
          const recipeId = data.recipeId || `imported-${Date.now()}`;
          const recipe = normalizeExtractedRecipe(data.recipe ?? {}, recipeId, {
            previewUrl: item.previewUrl,
            fileName: item.fileName,
          });

          if (usingDatabase) {
            const formData = new FormData();
            formData.append("recipe", JSON.stringify(recipeToSaveInput(recipe)));
            formData.append("file", file);
            formData.append("fileName", item.fileName);

            const persistResponse = await fetch("/api/recipes", {
              method: "POST",
              body: formData,
            });
            const persistData = await persistResponse.json().catch(() => null);

            if (!persistResponse.ok) {
              throw new Error(persistData?.error || "Failed to save recipe to database");
            }

            await refreshRecipes();
            updateImportItem(item.id, {
              status: "completed",
              recipeId: persistData.recipe.id,
              recipeTitle: persistData.recipe.title,
            });
          } else {
            addImportedRecipe(recipe);
            updateImportItem(item.id, {
              status: "completed",
              recipeId: recipe.id,
              recipeTitle: recipe.title,
            });
          }
        } catch (error) {
          updateImportItem(item.id, {
            status: "failed",
            error:
              error instanceof Error && error.name === "AbortError"
                ? "Import timed out. Try a smaller image or paste the recipe text instead."
                : error instanceof Error
                  ? error.message
                  : "Import failed",
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      setIsProcessing(false);
    },
    [addImportedRecipe, addToImportQueue, refreshRecipes, updateImportItem, usingDatabase]
  );

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
  });

  const handlePaste = async () => {
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
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
