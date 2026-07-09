"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PrepState } from "@/lib/import/prep-progress";
import { prepProgressRatio } from "@/lib/import/prep-progress";
import { cn } from "@/lib/utils";

type ImportPreparingPanelProps = {
  prep: PrepState;
  onDismissError: () => void;
};

export function ImportPreparingPanel({ prep, onDismissError }: ImportPreparingPanelProps) {
  const ratio = prepProgressRatio(prep);
  const isError = prep.phase === "error";
  const title =
    isError
      ? "Couldn't prepare your files"
      : prep.phase === "grouping"
        ? "Grouping recipes…"
        : "Preparing your files";
  const subtitle = isError
    ? prep.error ?? "Something went wrong"
    : prep.phase === "grouping"
      ? "Organizing into recipes…"
      : `${prep.ready} of ${prep.total} ready`;

  return (
    <div
      className={cn(
        "relative rounded-3xl border-2 border-dashed border-sage-muted bg-ivory/50 p-8 text-center sm:p-16"
      )}
      aria-busy={!isError}
      aria-live="polite"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sage/15">
        {isError ? (
          <AlertCircle className="h-7 w-7 text-terracotta" />
        ) : (
          <Loader2 className="h-7 w-7 animate-spin text-sage" />
        )}
      </div>
      <h3 className="font-serif text-2xl font-medium text-charcoal">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-charcoal-muted">{subtitle}</p>

      {!isError && (
        <div className="mx-auto mt-5 h-2 max-w-md overflow-hidden rounded-full bg-sage-muted/40">
          <div
            className="h-full rounded-full bg-sage transition-[width] duration-300 ease-out"
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
      )}

      {prep.items.length > 0 && (
        <div className="mx-auto mt-6 max-h-48 max-w-2xl overflow-y-auto">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            <AnimatePresence initial={false}>
              {prep.items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="aspect-square overflow-hidden rounded-lg bg-cream"
                >
                  {item.kind === "image" && item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt={item.fileName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FileText className="h-5 w-5 text-sage" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {isError && (
        <div className="mt-6">
          <Button type="button" variant="outline" onClick={onDismissError}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
