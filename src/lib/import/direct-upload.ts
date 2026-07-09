import { createClient } from "@/lib/supabase/client";
import { RECIPE_UPLOADS_BUCKET } from "@/lib/supabase/config";
import type { RecipeOriginal } from "@/lib/types";
import { resizeBlobForStorage, resizeFilesForStorage } from "@/lib/import/storage-resize";
import {
  formatUploadError,
  withUploadRetries,
} from "@/lib/import/upload-reliability";

export type UploadedOriginal = {
  storagePath: string;
  fileName: string;
  fileSize: number;
  type: RecipeOriginal["type"];
};

function inferOriginalType(fileType?: string): RecipeOriginal["type"] {
  if (!fileType) return "document";
  if (fileType.startsWith("image/")) return "image";
  if (fileType === "application/pdf") return "pdf";
  return "document";
}

async function uploadWithRetry(
  upload: () => Promise<{ error: { message?: string } | null }>
): Promise<void> {
  await withUploadRetries(async () => {
    const { error } = await upload();
    if (error) throw new Error(error.message || "Failed to upload image");
  });
}

/**
 * Upload files straight to Supabase Storage from the browser so large
 * multi-image imports never pass through the Vercel function body limit.
 * Images are compressed first and transient network failures are retried.
 */
export async function uploadRecipeFilesDirect(params: {
  familyId: string;
  recipeId: string;
  files: File[];
  heroFile?: Blob | File | null;
}): Promise<{ originals: UploadedOriginal[]; heroStoragePath: string | null }> {
  const { familyId, recipeId, files, heroFile } = params;

  try {
    const supabase = createClient();
    const uploadFiles = await resizeFilesForStorage(files);
    const originals: UploadedOriginal[] = [];

    for (let index = 0; index < uploadFiles.length; index += 1) {
      const current = uploadFiles[index];
      const originalName = files[index]?.name ?? current.name;
      const safeName = current.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${familyId}/${recipeId}/${Date.now()}-${index}-${safeName}`;

      await uploadWithRetry(() =>
        supabase.storage.from(RECIPE_UPLOADS_BUCKET).upload(storagePath, current, {
          contentType: current.type || "application/octet-stream",
          upsert: false,
        })
      );

      originals.push({
        storagePath,
        fileName: originalName,
        fileSize: current.size,
        type: inferOriginalType(current.type),
      });
    }

    let heroStoragePath: string | null = originals[0]?.storagePath ?? null;

    if (heroFile && heroFile.size > 0) {
      const compressedHero = await resizeBlobForStorage(heroFile);
      const name =
        compressedHero instanceof File
          ? compressedHero.name
          : heroFile instanceof File
            ? heroFile.name
            : "hero.jpg";
      const type =
        compressedHero instanceof File
          ? compressedHero.type
          : compressedHero.type || "image/jpeg";
      const safeHeroName = name.replace(/[^a-zA-Z0-9._-]/g, "_") || "hero.jpg";
      const heroPath = `${familyId}/${recipeId}/${Date.now()}-hero-${safeHeroName}`;

      await uploadWithRetry(() =>
        supabase.storage.from(RECIPE_UPLOADS_BUCKET).upload(heroPath, compressedHero, {
          contentType: type || "image/jpeg",
          upsert: false,
        })
      );
      heroStoragePath = heroPath;
    }

    return { originals, heroStoragePath };
  } catch (error) {
    throw new Error(formatUploadError(error));
  }
}
