"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { demoRecipes, searchRecipes as searchDemoRecipes } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Recipe } from "@/lib/types";

interface FamilyInfo {
  familyId: string;
  name: string;
  slug: string;
  role: "owner" | "editor" | "viewer";
}

interface RecipesContextValue {
  recipes: Recipe[];
  loading: boolean;
  configured: boolean;
  usingDatabase: boolean;
  family: FamilyInfo | null;
  refreshRecipes: () => Promise<void>;
}

const RecipesContext = createContext<RecipesContextValue | null>(null);

export function RecipesProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [recipes, setRecipes] = useState<Recipe[]>(configured ? [] : demoRecipes);
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [loading, setLoading] = useState(configured);

  const refreshRecipes = useCallback(async () => {
    if (!configured) {
      setRecipes(demoRecipes);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/recipes");
      if (!response.ok) {
        setRecipes([]);
        return;
      }

      const data = (await response.json()) as {
        recipes?: Recipe[];
        family?: FamilyInfo | null;
      };

      setRecipes(data.recipes ?? []);
      setFamily(data.family ?? null);
    } catch (error) {
      console.error("Failed to refresh recipes:", error);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    void refreshRecipes();
  }, [refreshRecipes]);

  const value = useMemo(
    () => ({
      recipes,
      loading,
      configured,
      usingDatabase: configured,
      family,
      refreshRecipes,
    }),
    [recipes, loading, configured, family, refreshRecipes]
  );

  return <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>;
}

export function useRecipesContext() {
  const context = useContext(RecipesContext);
  if (!context) {
    throw new Error("useRecipesContext must be used within RecipesProvider");
  }
  return context;
}

export function useAllRecipes() {
  const { recipes } = useRecipesContext();
  return recipes;
}

export function useRecipe(id: string) {
  const { recipes, configured } = useRecipesContext();
  const [remoteRecipe, setRemoteRecipe] = useState<Recipe | undefined>();
  const [loadingRemote, setLoadingRemote] = useState(false);

  const localRecipe = useMemo(() => {
    const fromList = recipes.find((recipe) => recipe.id === id);
    if (fromList) return fromList;
    if (!configured) {
      return demoRecipes.find((recipe) => recipe.id === id);
    }
    return undefined;
  }, [recipes, id, configured]);

  useEffect(() => {
    if (localRecipe || !configured) {
      setRemoteRecipe(undefined);
      return;
    }

    let cancelled = false;
    setLoadingRemote(true);

    fetch(`/api/recipes/${id}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.recipe) {
          setRemoteRecipe(data.recipe as Recipe);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingRemote(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [configured, id, localRecipe]);

  return localRecipe ?? remoteRecipe ?? (loadingRemote ? undefined : undefined);
}

export function useSearchRecipes(query: string) {
  const { recipes } = useRecipesContext();
  const trimmed = query.trim();

  return useMemo(() => {
    if (!trimmed) return recipes;
    return searchDemoRecipes(trimmed, recipes);
  }, [recipes, trimmed]);
}

export function useFamilyInfo() {
  const { family, refreshRecipes } = useRecipesContext();
  return { family, refreshRecipes };
}
