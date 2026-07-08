"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, Heart, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { useRecipeHero } from "@/lib/store";
import type { Recipe } from "@/lib/types";

interface RecipeCardProps {
  recipe: Recipe;
  index?: number;
}

function RecipeCardImage({ recipe }: { recipe: Recipe }) {
  const { heroImage } = useRecipeHero(recipe.id, recipe.heroImage);
  const isLocal = heroImage.startsWith("blob:") || heroImage.startsWith("data:");

  if (isLocal) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={heroImage}
        alt={recipe.title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    );
  }

  return (
    <Image
      src={heroImage}
      alt={recipe.title}
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}

export function RecipeCard({ recipe, index = 0 }: RecipeCardProps) {
  const totalTime = recipe.prepTime + recipe.cookTime;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link href={`/app/recipes/${recipe.id}`} className="group block">
        <article className="overflow-hidden rounded-2xl bg-ivory shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-card)] hover:-translate-y-1">
          <div className="relative aspect-[4/3] overflow-hidden">
            <RecipeCardImage recipe={recipe} />
            {recipe.isFavorite && (
              <div className="absolute right-3 top-3 rounded-full bg-ivory/90 p-2 backdrop-blur-sm">
                <Heart className="h-4 w-4 fill-terracotta text-terracotta" />
              </div>
            )}
            {recipe.source.familyMember && (
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-charcoal/70 px-3 py-1.5 text-xs text-ivory backdrop-blur-sm">
                <Users className="h-3 w-3" />
                {recipe.source.familyMember}
              </div>
            )}
          </div>
          <div className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="sage" className="text-[10px]">
                {recipe.category}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-charcoal-muted">
                <Clock className="h-3 w-3" />
                {formatDuration(totalTime)}
              </span>
            </div>
            <h3 className="font-serif text-xl font-medium text-charcoal group-hover:text-terracotta transition-colors">
              {recipe.title}
            </h3>
            {recipe.description && (
              <p className="mt-2 line-clamp-2 text-sm text-charcoal-muted">
                {recipe.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {recipe.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-cream px-2 py-0.5 text-[10px] text-charcoal-muted"
                >
                  {tag.replace(/-/g, " ")}
                </span>
              ))}
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
