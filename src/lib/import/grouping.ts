import type { RecipeGroup } from "./types";

export const GROUP_CONFIDENCE_THRESHOLD = 0.8;

function newGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function mergeGroups(
  groups: RecipeGroup[],
  targetId: string,
  sourceId: string
): RecipeGroup[] {
  const source = groups.find((g) => g.id === sourceId);
  if (!source || targetId === sourceId) return groups;

  return groups
    .filter((g) => g.id !== sourceId)
    .map((g) =>
      g.id === targetId
        ? {
            ...g,
            imageIds: [...g.imageIds, ...source.imageIds],
            confidence: Math.min(g.confidence, source.confidence),
          }
        : g
    );
}

export function splitImageToNewGroup(
  groups: RecipeGroup[],
  groupId: string,
  imageId: string
): RecipeGroup[] {
  const target = groups.find((g) => g.id === groupId);
  if (!target || target.imageIds.length <= 1) return groups;

  const remaining = target.imageIds.filter((id) => id !== imageId);
  if (remaining.length === target.imageIds.length) return groups;

  const updated = groups.map((g) =>
    g.id === groupId ? { ...g, imageIds: remaining } : g
  );
  updated.push({ id: newGroupId(), imageIds: [imageId], confidence: 1, needsReview: false });
  return updated;
}

export function reorderImageInGroup(
  groups: RecipeGroup[],
  groupId: string,
  fromIndex: number,
  toIndex: number
): RecipeGroup[] {
  return groups.map((g) => {
    if (g.id !== groupId) return g;
    const imageIds = [...g.imageIds];
    const [moved] = imageIds.splice(fromIndex, 1);
    if (moved === undefined) return g;
    imageIds.splice(toIndex, 0, moved);
    return { ...g, imageIds };
  });
}

export function explodeGroup(groups: RecipeGroup[], groupId: string): RecipeGroup[] {
  const result: RecipeGroup[] = [];
  for (const g of groups) {
    if (g.id !== groupId) {
      result.push(g);
      continue;
    }
    for (const imageId of g.imageIds) {
      result.push({ id: newGroupId(), imageIds: [imageId], confidence: 1, needsReview: false });
    }
  }
  return result;
}

export function applyConfidenceGate(
  groups: RecipeGroup[],
  threshold: number = GROUP_CONFIDENCE_THRESHOLD
): RecipeGroup[] {
  return groups.map((g) => ({ ...g, needsReview: g.confidence < threshold }));
}
