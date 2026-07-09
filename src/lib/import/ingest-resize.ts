/** Max dimension for images sent to /api/ingest (keeps payloads under Vercel limits). */
export const INGEST_MAX_DIM = 1600;
export const INGEST_JPEG_QUALITY = 0.72;

/**
 * Downscale an image for AI extraction. Originals are still uploaded separately
 * at full resolution when saving the recipe.
 */
export async function resizeImageForIngest(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, INGEST_MAX_DIM / Math.max(bitmap.width, bitmap.height));
  if (scale >= 1 && file.size < 1_200_000) {
    bitmap.close();
    return file;
  }

  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/jpeg", INGEST_JPEG_QUALITY);
  });
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

export async function resizeFilesForIngest(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => resizeImageForIngest(file)));
}
