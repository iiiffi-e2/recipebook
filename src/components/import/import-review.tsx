"use client";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import {
  mergeGroups,
  splitImageToNewGroup,
  reorderImageInGroup,
  explodeGroup,
} from "@/lib/import/grouping";
import type { ImportImageMeta } from "@/lib/import/types";

export function ImportReview({ onConfirm }: { onConfirm: () => void }) {
  const { reviewImages, reviewGroups, setReviewGroups } = useAppStore();

  if (reviewGroups.length === 0) return null;

  const imageById = new Map<string, ImportImageMeta>(reviewImages.map((i) => [i.id, i]));

  return (
    <div className="space-y-6 rounded-2xl bg-ivory p-6 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-medium">Review groupings</h3>
          <p className="text-sm text-charcoal-muted">
            We grouped some images we weren&apos;t sure about. Each card becomes one recipe.
          </p>
        </div>
        <Button onClick={onConfirm}>Looks good, import</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {reviewGroups.map((group, groupIndex) => (
          <div key={group.id} className="rounded-xl bg-cream p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">
                Recipe {groupIndex + 1}
                {group.needsReview && (
                  <span className="ml-2 rounded-full bg-terracotta/15 px-2 py-0.5 text-xs text-terracotta">
                    check this
                  </span>
                )}
              </span>
              <div className="flex gap-2">
                {groupIndex > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setReviewGroups(
                        mergeGroups(reviewGroups, reviewGroups[groupIndex - 1].id, group.id)
                      )
                    }
                  >
                    Merge up
                  </Button>
                )}
                {group.imageIds.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReviewGroups(explodeGroup(reviewGroups, group.id))}
                  >
                    Split all
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {group.imageIds.map((imageId, imageIndex) => {
                const image = imageById.get(imageId);
                return (
                  <div key={imageId} className="w-24">
                    {image?.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.previewUrl}
                        alt={image.fileName}
                        className="h-24 w-24 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-lg bg-sage-muted" />
                    )}
                    <div className="mt-1 flex justify-between">
                      <button
                        type="button"
                        className="text-xs text-charcoal-muted disabled:opacity-30"
                        disabled={imageIndex === 0}
                        onClick={() =>
                          setReviewGroups(
                            reorderImageInGroup(reviewGroups, group.id, imageIndex, imageIndex - 1)
                          )
                        }
                      >
                        ←
                      </button>
                      {group.imageIds.length > 1 && (
                        <button
                          type="button"
                          className="text-xs text-terracotta"
                          onClick={() =>
                            setReviewGroups(
                              splitImageToNewGroup(reviewGroups, group.id, imageId)
                            )
                          }
                        >
                          split
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-xs text-charcoal-muted disabled:opacity-30"
                        disabled={imageIndex === group.imageIds.length - 1}
                        onClick={() =>
                          setReviewGroups(
                            reorderImageInGroup(reviewGroups, group.id, imageIndex, imageIndex + 1)
                          )
                        }
                      >
                        →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
