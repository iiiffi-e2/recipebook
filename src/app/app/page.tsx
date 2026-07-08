"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { RecipeCard } from "@/components/recipe-card";
import { CollectionsSection } from "@/components/collections-section";
import { categoryFilters } from "@/lib/demo-data";
import { useAllRecipes, useSearchRecipes, useRecipesContext, useCollections } from "@/lib/recipes";
import { cn } from "@/lib/utils";

function CookbookContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const allRecipes = useAllRecipes();
  const searchedRecipes = useSearchRecipes(searchQuery);
  const { loading, usingDatabase } = useRecipesContext();
  const { collections } = useCollections();

  const filteredRecipes = useMemo(() => {
    let recipes = searchQuery ? searchedRecipes : allRecipes;

    if (activeCategory !== "All") {
      recipes = recipes.filter(
        (r) => r.category.toLowerCase() === activeCategory.toLowerCase()
      );
    }

    if (activeCollectionId) {
      recipes = recipes.filter((r) => r.collections.includes(activeCollectionId));
    }

    return recipes;
  }, [searchQuery, activeCategory, activeCollectionId, allRecipes, searchedRecipes]);

  const subtitle = searchQuery
    ? `${filteredRecipes.length} recipes found`
    : usingDatabase
      ? allRecipes.length > 0
        ? `${allRecipes.length} recipes in your family cookbook`
        : "Import your first recipe to get started"
      : "Six generations of recipes, stories, and traditions";

  return (
    <>
      <Header
        title={searchQuery ? `Results for "${searchQuery}"` : "Our Cookbook"}
        subtitle={subtitle}
        showSearch
      />

      {!searchQuery && (
        <CollectionsSection
          activeCollectionId={activeCollectionId}
          onSelectCollection={setActiveCollectionId}
        />
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
      {loading ? (
        <div className="rounded-2xl bg-ivory p-16 text-center">
          <p className="font-serif text-2xl text-charcoal-muted">Loading your cookbook...</p>
        </div>
      ) : filteredRecipes.length > 0 ? (
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
          <p className="mt-2 text-charcoal-muted">
            {usingDatabase
              ? activeCollectionId
                ? "No recipes in this collection yet. Edit a recipe to add it here."
                : "Import your first recipe to start building your family cookbook"
              : "Try a different search or import new recipes"}
          </p>
        </motion.div>
      )}

      {/* Quick stats */}
      {!searchQuery && allRecipes.length > 0 && (
        <div className="mt-16 grid grid-cols-2 gap-6 lg:grid-cols-3">
          {[
            { label: "Recipes", value: String(allRecipes.length) },
            { label: "Collections", value: String(collections.length) },
            {
              label: "Categories",
              value: String(new Set(allRecipes.map((r) => r.category)).size),
            },
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
