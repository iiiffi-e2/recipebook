"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { RecipeCard } from "@/components/recipe-card";
import { demoRecipes, demoCollections, categoryFilters, searchRecipes } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

function CookbookContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filteredRecipes = useMemo(() => {
    let recipes = searchQuery ? searchRecipes(searchQuery) : demoRecipes;

    if (activeCategory !== "All") {
      recipes = recipes.filter(
        (r) => r.category.toLowerCase() === activeCategory.toLowerCase()
      );
    }

    if (activeTag) {
      recipes = recipes.filter((r) => r.tags.includes(activeTag));
    }

    return recipes;
  }, [searchQuery, activeCategory, activeTag]);

  return (
    <>
      <Header
        title={searchQuery ? `Results for "${searchQuery}"` : "Our Cookbook"}
        subtitle={
          searchQuery
            ? `${filteredRecipes.length} recipes found`
            : "Six generations of recipes, stories, and traditions"
        }
        showSearch
      />

      {/* Collections */}
      {!searchQuery && (
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-2xl font-medium text-charcoal">Collections</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {demoCollections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => setActiveTag(activeTag === collection.id ? null : collection.id)}
                className={cn(
                  "flex-shrink-0 rounded-2xl border px-6 py-4 text-left transition-all",
                  activeTag === collection.id
                    ? "border-sage bg-sage/10"
                    : "border-warm-gray/60 bg-ivory hover:border-sage/50"
                )}
              >
                <p className="font-serif text-lg font-medium">{collection.name}</p>
                <p className="text-sm text-charcoal-muted">
                  {collection.recipeCount} recipes
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Category filters */}
      <div className="mb-8 flex flex-wrap gap-2">
        {categoryFilters.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-full px-4 py-2 text-sm transition-all",
              activeCategory === cat
                ? "bg-terracotta text-ivory"
                : "bg-ivory text-charcoal-muted hover:bg-warm-gray"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recipe grid */}
      {filteredRecipes.length > 0 ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe, i) => (
            <RecipeCard key={recipe.id} recipe={recipe} index={i} />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl bg-ivory p-16 text-center"
        >
          <p className="font-serif text-2xl text-charcoal-muted">No recipes found</p>
          <p className="mt-2 text-charcoal-muted">Try a different search or import new recipes</p>
        </motion.div>
      )}

      {/* Quick stats */}
      {!searchQuery && (
        <div className="mt-16 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {[
            { label: "Recipes", value: "6" },
            { label: "Family Members", value: "4" },
            { label: "Stories", value: "4" },
            { label: "Collections", value: "6" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-ivory p-6 text-center shadow-[var(--shadow-soft)]">
              <p className="font-serif text-3xl font-medium text-terracotta">{stat.value}</p>
              <p className="mt-1 text-sm text-charcoal-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function CookbookPage() {
  return (
    <Suspense fallback={<div className="animate-pulse">Loading cookbook...</div>}>
      <CookbookContent />
    </Suspense>
  );
}
