/** Max dimension for images uploaded to Supabase Storage (mobile-friendly). */
export const STORAGE_MAX_DIM = 2048;
/** Soft size threshold — compress even if under max dim when larger than this. */
export const STORAGE_SIZE_THRESHOLD = 1_200_000;
export const STORAGE_JPEG_QUALITY = 0.78;

export function shouldCompressForStorage(input: {
  type: string;
  size: number;
  width: number;
  height: number;
}): boolean {
  if (!input.type.startsWith("image/")) return false;
  if (Math.max(input.width, input.height) > STORAGE_MAX_DIM) return true;
  return input.size >= STORAGE_SIZE_THRESHOLD;
}

/**
 * Downscale/compress an image before uploading to Storage so mobile imports
 * are less likely to hit "Failed to fetch" on large originals.
 * Non-images and already-small images are returned unchanged.
 */
export async function resizeImageForStorage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const needsCompress = shouldCompressForStorage({
    type: file.type,
    size: file.size,
    width: bitmap.width,
    height: bitmap.height,
  });

  if (!needsCompress) {
    bitmap.close();
    return file;
  }

  const scale = Math.min(1, STORAGE_MAX_DIM / Math.max(bitmap.width, bitmap.height));
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
    canvas.toBlob((result) => resolve(result), "image/jpeg", STORAGE_JPEG_QUALITY);
  });
  if (!blob) return file;

  // Prefer the compressed blob only when it actually helps.
  if (blob.size >= file.size && scale >= 1) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

export async function resizeFilesForStorage(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => resizeImageForStorage(file)));
}

export async function resizeBlobForStorage(
  blob: Blob | File,
  fileName = "hero.jpg"
): Promise<Blob | File> {
  const file =
    blob instanceof File
      ? blob
      : new File([blob], fileName, { type: blob.type || "image/jpeg" });
  return resizeImageForStorage(file);
}
