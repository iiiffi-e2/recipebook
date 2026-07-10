"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
import { DEFAULT_RECIPE_HERO } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

export function isMissingHeroSrc(src?: string | null): boolean {
  if (!src || !src.trim()) return true;
  // Stock Unsplash fallback is not a real recipe photo — show branded placeholder instead.
  if (src === DEFAULT_RECIPE_HERO) return true;
  return false;
}

type PlaceholderSize = "sm" | "md" | "lg";

export function RecipeHeroPlaceholder({
  title,
  showInitial = false,
  size = "md",
  className,
}: {
  title?: string;
  showInitial?: boolean;
  size?: PlaceholderSize;
  className?: string;
}) {
  const initial = title?.trim()?.charAt(0)?.toUpperCase() ?? "";
  const iconClass =
    size === "sm" ? "h-5 w-5" : size === "lg" ? "h-12 w-12" : "h-8 w-8";

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center",
        "bg-gradient-to-br from-cream via-ivory to-sage-muted/50",
        className
      )}
      aria-hidden={showInitial && initial ? undefined : true}
      role={showInitial && initial ? "img" : undefined}
      aria-label={showInitial && title ? title : undefined}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-sage/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-6 h-36 w-36 rounded-full bg-sage-light/25 blur-2xl" />
      </div>
      {showInitial && initial ? (
        <span
          className={cn(
            "relative font-serif font-medium text-sage/35 select-none",
            size === "sm" ? "text-3xl" : size === "lg" ? "text-8xl" : "text-5xl"
          )}
        >
          {initial}
        </span>
      ) : (
        <UtensilsCrossed className={cn("relative text-sage/70", iconClass)} strokeWidth={1.5} />
      )}
      {showInitial && initial && (
        <UtensilsCrossed
          className={cn("relative mt-2 text-sage/50", size === "lg" ? "h-6 w-6" : "h-4 w-4")}
          strokeWidth={1.5}
        />
      )}
    </div>
  );
}

type RecipeImageProps = {
  src?: string | null;
  alt: string;
  title?: string;
  /** Show title initial on the placeholder (detail hero). Cards stay icon-only. */
  showInitial?: boolean;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  placeholderSize?: PlaceholderSize;
};

export function RecipeImage({
  src,
  alt,
  title,
  showInitial = false,
  className,
  imageClassName,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  placeholderSize = "md",
}: RecipeImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const missing = isMissingHeroSrc(src) || failed;
  const isLocal = Boolean(src && (src.startsWith("blob:") || src.startsWith("data:")));

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {missing ? (
        <RecipeHeroPlaceholder
          title={title ?? alt}
          showInitial={showInitial}
          size={placeholderSize}
        />
      ) : isLocal ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt}
          className={cn("absolute inset-0 h-full w-full object-cover", imageClassName)}
          onError={() => setFailed(true)}
        />
      ) : (
        <Image
          src={src!}
          alt={alt}
          fill
          className={cn("object-cover", imageClassName)}
          sizes={sizes}
          priority={priority}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
