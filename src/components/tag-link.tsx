"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatTagLabel, tagFilterHref } from "@/lib/tags";

interface TagLinkProps {
  tag: string;
  activeTags?: string[];
  className?: string;
  variant?: "pill" | "badge";
}

export function TagLink({
  tag,
  activeTags = [],
  className,
  variant = "pill",
}: TagLinkProps) {
  return (
    <Link
      href={tagFilterHref(tag, activeTags)}
      className={cn(
        variant === "pill"
          ? "rounded-full bg-cream px-2 py-0.5 text-[10px] text-charcoal-muted transition-colors hover:bg-sage/20 hover:text-charcoal"
          : "inline-flex items-center rounded-full border border-warm-gray px-3 py-1 text-xs text-charcoal-muted transition-colors hover:border-sage hover:text-charcoal",
        className
      )}
      onClick={(event) => event.stopPropagation()}
    >
      {formatTagLabel(tag)}
    </Link>
  );
}

interface ActiveTagChipProps {
  tag: string;
  onRemove: (tag: string) => void;
}

export function ActiveTagChip({ tag, onRemove }: ActiveTagChipProps) {
  return (
    <button
      type="button"
      onClick={() => onRemove(tag)}
      className="inline-flex items-center gap-1.5 rounded-full bg-sage/15 px-4 py-2 text-sm text-charcoal transition-colors hover:bg-sage/25"
      aria-label={`Remove ${formatTagLabel(tag)} tag filter`}
    >
      {formatTagLabel(tag)}
      <span aria-hidden className="text-charcoal-muted">
        ×
      </span>
    </button>
  );
}
