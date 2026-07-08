"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Sparkles,
  Loader2,
  ImageIcon,
  RotateCcw,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore, useRecipeHero, type HeroImageSource } from "@/lib/store";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RecipeHeroProps {
  recipe: Recipe;
  children?: React.ReactNode;
}

const sourceLabels: Record<HeroImageSource, string> = {
  default: "Default",
  upload: "Your photo",
  generated: "AI generated",
};

function HeroImage({ src, alt }: { src: string; alt: string }) {
  const isLocal = src.startsWith("blob:") || src.startsWith("data:");

  if (isLocal) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
    );
  }

  return <Image src={src} alt={alt} fill className="object-cover" priority unoptimized={isLocal || src.startsWith("data:")} />;
}

export function RecipeHero({ recipe, children }: RecipeHeroProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { heroImage, heroSource, isCustom } = useRecipeHero(recipe.id, recipe.heroImage);
  const { setHeroImage, resetHeroImage } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const objectUrl = URL.createObjectURL(file);
      setHeroImage(recipe.id, objectUrl, "upload");
    } catch {
      setError("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/recipes/hero/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recipe.title,
          description: recipe.description,
          category: recipe.category,
          cuisine: recipe.cuisine,
          tags: recipe.tags,
          cookingMethod: recipe.cookingMethod,
          servings: recipe.servings,
          ingredients: recipe.ingredients.map((i) =>
            [i.amount, i.unit, i.name, i.notes].filter(Boolean).join(" ").trim()
          ),
          instructions: recipe.instructions.map((i) => i.text),
        }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      const data = await response.json();
      setHeroImage(recipe.id, data.imageUrl, data.source === "fallback" ? "default" : "generated");

      if (data.source === "fallback" && data.message) {
        setError(data.message);
      }
    } catch {
      setError("Could not generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const isLoading = isGenerating || isUploading;

  return (
    <div className="mb-10">
      <div
        className="group relative aspect-[21/9] overflow-hidden rounded-3xl"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <HeroImage src={heroImage} alt={recipe.title} />

        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm">
            <div className="text-center text-ivory">
              <Loader2 className="mx-auto h-10 w-10 animate-spin" />
              <p className="mt-3 font-serif text-lg">
                {isGenerating ? "Creating your hero image..." : "Uploading..."}
              </p>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-transparent" />

        {/* Source badge */}
        {isCustom && !isLoading && (
          <div className="absolute left-4 top-4 z-10">
            <Badge variant="secondary" className="bg-ivory/90 backdrop-blur-sm">
              {heroSource === "generated" && <Sparkles className="mr-1 h-3 w-3" />}
              {heroSource === "upload" && <Camera className="mr-1 h-3 w-3" />}
              {sourceLabels[heroSource]}
            </Badge>
          </div>
        )}

        {/* Edit controls */}
        <AnimatePresence>
          {showControls && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute right-4 top-4 z-10 flex gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = "";
                }}
              />
              <Button
                size="sm"
                variant="secondary"
                className="bg-ivory/95 backdrop-blur-sm shadow-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
              <Button
                size="sm"
                className="bg-ivory/95 text-charcoal hover:bg-ivory backdrop-blur-sm shadow-sm"
                onClick={handleGenerate}
              >
                <Sparkles className="h-4 w-4" />
                Generate
              </Button>
              {isCustom && (
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-ivory/95 backdrop-blur-sm"
                  onClick={() => resetHeroImage(recipe.id)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12">{children}</div>
      </div>

      {/* Mobile-friendly controls (always visible on small screens) */}
      <div className="mt-4 flex flex-wrap gap-2 md:hidden">
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <Upload className="h-4 w-4" />
          Upload hero
        </Button>
        <Button size="sm" onClick={handleGenerate} disabled={isLoading}>
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </Button>
        {isCustom && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => resetHeroImage(recipe.id)}
            disabled={isLoading}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      {error && (
        <p className={cn("mt-3 text-sm text-terracotta")}>{error}</p>
      )}

      {!isCustom && !showControls && (
        <p className="mt-3 hidden text-sm text-charcoal-muted md:block">
          <ImageIcon className="mr-1 inline h-4 w-4" />
          Hover to upload your own photo or generate one with AI
        </p>
      )}
    </div>
  );
}
