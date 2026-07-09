import { createClient } from "@/lib/supabase/client";
import { RECIPE_UPLOADS_BUCKET } from "@/lib/supabase/config";
import type { RecipeOriginal } from "@/lib/types";

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

/**
 * Upload files straight to Supabase Storage from the browser so large
 * multi-image imports never pass through the Vercel function body limit.
 */
export async function uploadRecipeFilesDirect(params: {
  familyId: string;
  recipeId: string;
  files: File[];
  heroFile?: Blob | File | null;
}): Promise<{ originals: UploadedOriginal[]; heroStoragePath: string | null }> {
  const { familyId, recipeId, files, heroFile } = params;
  const supabase = createClient();
  const originals: UploadedOriginal[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const current = files[index];
    const safeName = current.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${familyId}/${recipeId}/${Date.now()}-${index}-${safeName}`;

    const { error } = await supabase.storage.from(RECIPE_UPLOADS_BUCKET).upload(storagePath, current, {
      contentType: current.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw new Error(error.message || "Failed to upload image");

    originals.push({
      storagePath,
      fileName: current.name,
      fileSize: current.size,
      type: inferOriginalType(current.type),
    });
  }

  let heroStoragePath: string | null = originals[0]?.storagePath ?? null;

  if (heroFile && heroFile.size > 0) {
    const name = heroFile instanceof File ? heroFile.name : "hero.jpg";
    const type = heroFile instanceof File ? heroFile.type : heroFile.type || "image/jpeg";
    const safeHeroName = name.replace(/[^a-zA-Z0-9._-]/g, "_") || "hero.jpg";
    const heroPath = `${familyId}/${recipeId}/${Date.now()}-hero-${safeHeroName}`;

    const { error } = await supabase.storage.from(RECIPE_UPLOADS_BUCKET).upload(heroPath, heroFile, {
      contentType: type || "image/jpeg",
      upsert: false,
    });
    if (error) throw new Error(error.message || "Failed to upload hero image");
    heroStoragePath = heroPath;
  }

  return { originals, heroStoragePath };
}
