import { useMemo } from "react";
import { demoRecipes, searchRecipes as searchDemoRecipes } from "./demo-data";
import { useAppStore } from "./store";
import type { Recipe } from "./types";

export function useImportedRecipes(): Recipe[] {
  return useAppStore((state) => state.importedRecipes);
}

export function useAllRecipes(): Recipe[] {
  const importedRecipes = useImportedRecipes();

  return useMemo(
    () => [...importedRecipes, ...demoRecipes],
    [importedRecipes]
  );
}

export function useRecipe(id: string): Recipe | undefined {
  const allRecipes = useAllRecipes();

  return useMemo(
    () => allRecipes.find((recipe) => recipe.id === id),
    [allRecipes, id]
  );
}

export function useSearchRecipes(query: string): Recipe[] {
  const allRecipes = useAllRecipes();
  const trimmed = query.trim();

  return useMemo(() => {
    if (!trimmed) return allRecipes;

    const demoIds = new Set(demoRecipes.map((recipe) => recipe.id));
    const demoMatches = searchDemoRecipes(trimmed);
    const importedOnly = allRecipes.filter((recipe) => !demoIds.has(recipe.id));
    const importedMatches = searchDemoRecipes(trimmed, importedOnly);

    return [...importedMatches, ...demoMatches];
  }, [allRecipes, trimmed]);
}
