import { pickBestHeroCandidate } from "./hero-pick";

export type CropBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ScoredCropBox = CropBox & { score: number };

export const DETECT_MAX_DIM = 1024;
export const GRID_SIZE = 24;
export const MIN_AREA_RATIO = 0.15;
export const MAX_AREA_RATIO = 0.85;
export const MIN_ASPECT = 0.4;
export const MAX_ASPECT = 2.5;
export const PADDING_RATIO = 0.04;
export const OUTPUT_TYPE = "image/jpeg";
export const OUTPUT_QUALITY = 0.85;

/** Minimum cell score (0–1) to count as photo-like. */
export const PHOTO_SCORE_THRESHOLD = 0.35;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cellScore(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): number {
  let count = 0;
  let sumL = 0;
  let sumL2 = 0;
  let sumSat = 0;
  let edge = 0;

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (r + g + b) / 3;
      const sat = max === 0 ? 0 : (max - min) / max;

      sumL += l;
      sumL2 += l * l;
      sumSat += sat;
      count += 1;

      if (x + 1 < x1) {
        const j = (y * width + (x + 1)) * 4;
        const l2 = (data[j] + data[j + 1] + data[j + 2]) / 3;
        edge += Math.abs(l - l2);
      }
      if (y + 1 < y1) {
        const j = ((y + 1) * width + x) * 4;
        const l2 = (data[j] + data[j + 1] + data[j + 2]) / 3;
        edge += Math.abs(l - l2);
      }
    }
  }

  if (count === 0) return 0;

  const meanL = sumL / count;
  const variance = Math.max(0, sumL2 / count - meanL * meanL);
  const std = Math.sqrt(variance);
  const meanSat = sumSat / count;
  const meanEdge = edge / count;

  // Flat near-white UI / text bands score low.
  const flatPenalty = meanL > 230 && std < 12 ? 0.15 : 1;
  // Dense glyph edges look "textured" but lack color — common false positive
  // on recipe instruction screenshots.
  const textPenalty =
    meanSat < 0.1 && meanEdge > 8 ? 0.2 : meanSat < 0.14 && meanEdge > 14 ? 0.4 : 1;
  // Normalize roughly into 0–1. Favor color/variance over raw edges so food
  // photos beat text crops and ad chrome.
  const varianceScore = clamp(std / 45, 0, 1);
  const satScore = clamp(meanSat / 0.35, 0, 1);
  const edgeScore = clamp(meanEdge / 25, 0, 1);

  return (
    (0.4 * varianceScore + 0.15 * edgeScore + 0.45 * satScore) * flatPenalty * textPenalty
  );
}

function largestConnectedRegion(
  mask: boolean[][],
  rows: number,
  cols: number
): { r0: number; r1: number; c0: number; c1: number; size: number } | null {
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  let best: { r0: number; r1: number; c0: number; c1: number; size: number } | null = null;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (!mask[r][c] || visited[r][c]) continue;

      let r0 = r;
      let r1 = r;
      let c0 = c;
      let c1 = c;
      const stack: Array<[number, number]> = [[r, c]];
      visited[r][c] = true;

      while (stack.length > 0) {
        const [cr, cc] = stack.pop()!;
        r0 = Math.min(r0, cr);
        r1 = Math.max(r1, cr);
        c0 = Math.min(c0, cc);
        c1 = Math.max(c1, cc);

        const neighbors: Array<[number, number]> = [
          [cr - 1, cc],
          [cr + 1, cc],
          [cr, cc - 1],
          [cr, cc + 1],
        ];
        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          if (!mask[nr][nc] || visited[nr][nc]) continue;
          visited[nr][nc] = true;
          stack.push([nr, nc]);
        }
      }

      // Use bounding-box area as the region measure (photo blocks are rectangular).
      const boxSize = (r1 - r0 + 1) * (c1 - c0 + 1);
      if (!best || boxSize > best.size) {
        best = { r0, r1, c0, c1, size: boxSize };
      }
    }
  }

  return best;
}

/**
 * Find the largest photo-like region in ImageData coordinates, with a score
 * equal to the mean of cell scores inside the region bounding box.
 * Returns null when no confident sub-region exists (use full image).
 */
export function findScoredPhotoRegionFromImageData(image: ImageData): ScoredCropBox | null {
  const { data, width, height } = image;
  if (width < 8 || height < 8) return null;

  const cols = GRID_SIZE;
  const rows = GRID_SIZE;
  const cellW = width / cols;
  const cellH = height / rows;
  const scores: number[][] = [];

  for (let r = 0; r < rows; r += 1) {
    const row: number[] = [];
    for (let c = 0; c < cols; c += 1) {
      const x0 = Math.floor(c * cellW);
      const y0 = Math.floor(r * cellH);
      const x1 = Math.min(width, Math.floor((c + 1) * cellW));
      const y1 = Math.min(height, Math.floor((r + 1) * cellH));
      row.push(cellScore(data, width, height, x0, y0, x1, y1));
    }
    scores.push(row);
  }

  const mask = scores.map((row) => row.map((s) => s >= PHOTO_SCORE_THRESHOLD));
  const region = largestConnectedRegion(mask, rows, cols);
  if (!region) return null;

  let scoreSum = 0;
  let scoreCount = 0;
  for (let r = region.r0; r <= region.r1; r += 1) {
    for (let c = region.c0; c <= region.c1; c += 1) {
      scoreSum += scores[r][c];
      scoreCount += 1;
    }
  }
  const score = scoreCount > 0 ? scoreSum / scoreCount : 0;

  let x = Math.floor(region.c0 * cellW);
  let y = Math.floor(region.r0 * cellH);
  let w = Math.ceil((region.c1 + 1) * cellW) - x;
  let h = Math.ceil((region.r1 + 1) * cellH) - y;

  const padX = Math.round(w * PADDING_RATIO);
  const padY = Math.round(h * PADDING_RATIO);
  x = clamp(x - padX, 0, width - 1);
  y = clamp(y - padY, 0, height - 1);
  w = clamp(w + padX * 2, 1, width - x);
  h = clamp(h + padY * 2, 1, height - y);

  const areaRatio = (w * h) / (width * height);
  if (areaRatio < MIN_AREA_RATIO || areaRatio > MAX_AREA_RATIO) return null;

  const aspect = w / h;
  if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) return null;

  // Prefer larger photo regions so a small inset on a text screenshot loses
  // to a bigger food photo block when both clear the threshold.
  const areaWeighted = score * (0.4 + 0.6 * areaRatio);
  return { x, y, width: w, height: h, score: areaWeighted };
}

/**
 * Find the largest photo-like region in ImageData coordinates.
 * Returns null when no confident sub-region exists (use full image).
 */
export function findPhotoRegionFromImageData(image: ImageData): CropBox | null {
  const scored = findScoredPhotoRegionFromImageData(image);
  if (!scored) return null;
  const { x, y, width, height } = scored;
  return { x, y, width, height };
}

function scaleBox(box: CropBox, scaleX: number, scaleY: number, maxW: number, maxH: number): CropBox {
  const x = clamp(Math.floor(box.x * scaleX), 0, maxW - 1);
  const y = clamp(Math.floor(box.y * scaleY), 0, maxH - 1);
  const width = clamp(Math.ceil(box.width * scaleX), 1, maxW - x);
  const height = clamp(Math.ceil(box.height * scaleY), 1, maxH - y);
  return { x, y, width, height };
}

async function decodeToAnalysisCanvas(
  file: File
): Promise<{ canvas: HTMLCanvasElement; fullWidth: number; fullHeight: number } | null> {
  if (!file.type.startsWith("image/")) return null;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;

  const fullWidth = bitmap.width;
  const fullHeight = bitmap.height;
  const scale = Math.min(1, DETECT_MAX_DIM / Math.max(fullWidth, fullHeight));
  const width = Math.max(1, Math.round(fullWidth * scale));
  const height = Math.max(1, Math.round(fullHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return { canvas, fullWidth, fullHeight };
}

export async function detectPhotoRegion(file: File): Promise<CropBox | null> {
  try {
    const decoded = await decodeToAnalysisCanvas(file);
    if (!decoded) return null;

    const { canvas, fullWidth, fullHeight } = decoded;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const box = findPhotoRegionFromImageData(image);
    if (!box) return null;

    return scaleBox(box, fullWidth / canvas.width, fullHeight / canvas.height, fullWidth, fullHeight);
  } catch {
    return null;
  }
}

/** Mean photo-likeness across the whole frame (for full-bleed food photos). */
export function scoreWholeImageFromImageData(image: ImageData): number {
  const { data, width, height } = image;
  if (width < 8 || height < 8) return 0;

  const cols = GRID_SIZE;
  const rows = GRID_SIZE;
  const cellW = width / cols;
  const cellH = height / rows;
  let sum = 0;
  let count = 0;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x0 = Math.floor(c * cellW);
      const y0 = Math.floor(r * cellH);
      const x1 = Math.min(width, Math.floor((c + 1) * cellW));
      const y1 = Math.min(height, Math.floor((r + 1) * cellH));
      sum += cellScore(data, width, height, x0, y0, x1, y1);
      count += 1;
    }
  }

  return count > 0 ? sum / count : 0;
}

export async function scorePhotoRegion(
  file: File
): Promise<{ box: CropBox; score: number; fullFrame?: boolean } | null> {
  try {
    const decoded = await decodeToAnalysisCanvas(file);
    if (!decoded) return null;

    const { canvas, fullWidth, fullHeight } = decoded;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const scored = findScoredPhotoRegionFromImageData(image);
    if (scored) {
      const box = scaleBox(
        scored,
        fullWidth / canvas.width,
        fullHeight / canvas.height,
        fullWidth,
        fullHeight
      );
      return { box, score: scored.score, fullFrame: false };
    }

    // No croppable sub-region — still score full-frame food photos so they
    // can win best-of-group hero selection against text screenshots.
    const wholeScore = scoreWholeImageFromImageData(image);
    if (wholeScore < PHOTO_SCORE_THRESHOLD) return null;
    return {
      box: { x: 0, y: 0, width: fullWidth, height: fullHeight },
      score: wholeScore,
      fullFrame: true,
    };
  } catch {
    return null;
  }
}

export async function cropHeroImage(file: File, box: CropBox): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return null;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(box.width));
    canvas.height = Math.max(1, Math.round(box.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }

    ctx.drawImage(
      bitmap,
      box.x,
      box.y,
      box.width,
      box.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
    bitmap.close();

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), OUTPUT_TYPE, OUTPUT_QUALITY);
    });
  } catch {
    return null;
  }
}

/** Detect + crop; returns null when no good region or on any failure. */
export async function extractHeroFromUpload(file: File): Promise<Blob | null> {
  try {
    if (!file.type.startsWith("image/")) return null;
    const box = await detectPhotoRegion(file);
    if (!box) return null;
    return cropHeroImage(file, box);
  } catch {
    return null;
  }
}

export async function pickBestHeroFromFiles(
  files: File[]
): Promise<{ file: File; blob: Blob; score: number } | null> {
  const imageFiles = files.filter((f) => f.type.startsWith("image/"));
  const scored: Array<{
    index: number;
    score: number;
    file: File;
    box: CropBox;
    fullFrame: boolean;
  }> = [];

  for (let index = 0; index < imageFiles.length; index += 1) {
    const file = imageFiles[index];
    const result = await scorePhotoRegion(file);
    if (result) {
      scored.push({
        index,
        score: result.score,
        file,
        box: result.box,
        fullFrame: result.fullFrame === true,
      });
    }
  }

  const best = pickBestHeroCandidate(
    scored.map((s) => ({ index: s.index, score: s.score })),
    PHOTO_SCORE_THRESHOLD
  );
  if (!best) return null;

  const winner = scored.find((s) => s.index === best.index);
  if (!winner) return null;

  const blob = winner.fullFrame
    ? winner.file
    : await cropHeroImage(winner.file, winner.box);
  if (!blob) return null;
  return { file: winner.file, blob, score: winner.score };
}
