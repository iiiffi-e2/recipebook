import { filenameStem, numericSuffix } from "./metadata";

export const ATTACH_TIME_WINDOW_MS = 120_000;

export type CompletedBatchRecipe = {
  recipeId: string;
  title: string;
  captureTimes: number[];
  fileNames: string[];
};

function minTimeDistance(a: number[], b: number[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const t of a) {
    for (const u of b) {
      best = Math.min(best, Math.abs(t - u));
    }
  }
  return best;
}

function namesRelated(aNames: string[], bNames: string[]): boolean {
  for (const a of aNames) {
    for (const b of bNames) {
      const stemA = filenameStem(a);
      const stemB = filenameStem(b);
      if (stemA.length > 0 && stemA === stemB) return true;
      const numA = numericSuffix(a);
      const numB = numericSuffix(b);
      if (numA !== null && numB !== null && Math.abs(numA - numB) <= 2) return true;
    }
  }
  return false;
}

export function findNearestCompletedRecipe(params: {
  captureTimes: number[];
  fileNames: string[];
  completed: CompletedBatchRecipe[];
  timeWindowMs?: number;
}): CompletedBatchRecipe | null {
  const windowMs = params.timeWindowMs ?? ATTACH_TIME_WINDOW_MS;
  let best: { recipe: CompletedBatchRecipe; distance: number } | null = null;

  for (const recipe of params.completed) {
    const distance = minTimeDistance(params.captureTimes, recipe.captureTimes);
    if (distance > windowMs) continue;
    if (!namesRelated(params.fileNames, recipe.fileNames)) continue;
    if (!best || distance < best.distance) {
      best = { recipe, distance };
    }
  }

  return best?.recipe ?? null;
}
