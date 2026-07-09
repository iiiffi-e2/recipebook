export const THUMBNAIL_MAX_DIM = 512;
export const THUMBNAIL_QUALITY = 0.6;

export async function createThumbnail(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return "";
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return "";

  const scale = Math.min(1, THUMBNAIL_MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return "";
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", THUMBNAIL_QUALITY);
}
