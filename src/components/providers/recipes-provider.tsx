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
import { demoRecipes, demoCollections, searchRecipes as searchDemoRecipes } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Collection, Recipe } from "@/lib/types";

interface FamilyInfo {
  familyId: string;
  name: string;
  slug: string;
  role: "owner" | "editor" | "viewer";
}

interface RecipesContextValue {
  recipes: Recipe[];
  collections: Collection[];
  loading: boolean;
  configured: boolean;
  usingDatabase: boolean;
  family: FamilyInfo | null;
  refreshRecipes: () => Promise<void>;
  refreshCollections: () => Promise<void>;
  addCollection: (name: string, description?: string) => Promise<Collection | null>;
  updateCollection: (id: string, name: string) => Promise<Collection | null>;
  deleteCollection: (id: string) => Promise<boolean>;
}

const RecipesContext = createContext<RecipesContextValue | null>(null);

export function RecipesProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [recipes, setRecipes] = useState<Recipe[]>(configured ? [] : demoRecipes);
  const [collections, setCollections] = useState<Collection[]>(
    configured ? [] : demoCollections
  );
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [loading, setLoading] = useState(configured);

  const refreshCollections = useCallback(async () => {
    if (!configured) {
      setCollections(demoCollections);
      return;
    }

    try {
      const response = await fetch("/api/collections");
      if (!response.ok) {
        setCollections([]);
        return;
      }

      const data = (await response.json()) as { collections?: Collection[] };
      setCollections(data.collections ?? []);
    } catch (error) {
      console.error("Failed to refresh collections:", error);
      setCollections([]);
    }
  }, [configured]);

  const addCollection = useCallback(
    async (name: string, description?: string): Promise<Collection | null> => {
      if (!configured) return null;

      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) return null;

      const data = (await response.json()) as { collection?: Collection };
      if (data.collection) {
        setCollections((prev) => [...prev, data.collection!]);
      }
      return data.collection ?? null;
    },
    [configured]
  );

  const updateCollection = useCallback(
    async (id: string, name: string): Promise<Collection | null> => {
      if (!configured) return null;

      const response = await fetch(`/api/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) return null;

      const data = (await response.json()) as { collection?: Collection };
      if (data.collection) {
        setCollections((prev) =>
          prev.map((collection) =>
            collection.id === id ? data.collection! : collection
          )
        );
      }
      return data.collection ?? null;
    },
    [configured]
  );

  const deleteCollection = useCallback(
    async (id: string): Promise<boolean> => {
      if (!configured) return false;

      const response = await fetch(`/api/collections/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) return false;

      setCollections((prev) => prev.filter((collection) => collection.id !== id));
      setRecipes((prev) =>
        prev.map((recipe) => ({
          ...recipe,
          collections: recipe.collections.filter((collectionId) => collectionId !== id),
        }))
      );
      return true;
    },
    [configured]
  );

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
    void refreshCollections();
  }, [refreshRecipes, refreshCollections]);

  const value = useMemo(
    () => ({
      recipes,
      collections,
      loading,
      configured,
      usingDatabase: configured,
      family,
      refreshRecipes,
      refreshCollections,
      addCollection,
      updateCollection,
      deleteCollection,
    }),
    [recipes, collections, loading, configured, family, refreshRecipes, refreshCollections, addCollection, updateCollection, deleteCollection]
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
  const { recipes, configured, loading: listLoading } = useRecipesContext();
  const [remoteRecipe, setRemoteRecipe] = useState<Recipe | undefined>();
  const [remoteStatus, setRemoteStatus] = useState<"idle" | "loading" | "done">(
    "idle"
  );

  const localRecipe = useMemo(() => {
    const fromList = recipes.find((recipe) => recipe.id === id);
    if (fromList) return fromList;
    if (!configured) {
      return demoRecipes.find((recipe) => recipe.id === id);
    }
    return undefined;
  }, [recipes, id, configured]);

  // Reset remote lookup whenever the recipe id changes.
  useEffect(() => {
    setRemoteRecipe(undefined);
    setRemoteStatus("idle");
  }, [id]);

  useEffect(() => {
    // Nothing to fetch if we already have it locally or aren't using a DB.
    if (localRecipe || !configured) return;
    // Wait for the recipe list to finish loading before deciding it's missing.
    if (listLoading) return;

    let cancelled = false;
    setRemoteStatus("loading");

    fetch(`/api/recipes/${id}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.recipe) {
          setRemoteRecipe(data.recipe as Recipe);
        }
        setRemoteStatus("done");
      })
      .catch(() => {
        if (!cancelled) setRemoteStatus("done");
      });

    return () => {
      cancelled = true;
    };
  }, [configured, id, localRecipe, listLoading]);

  const recipe = localRecipe ?? remoteRecipe;

  // Only consider the lookup finished once the list has loaded and any
  // remote fetch has resolved. This prevents a premature "not found".
  const loading =
    !recipe &&
    configured &&
    (listLoading || remoteStatus === "idle" || remoteStatus === "loading");

  return { recipe, loading };
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

export function useCollections() {
  const {
    collections,
    addCollection,
    updateCollection,
    deleteCollection,
    refreshCollections,
    usingDatabase,
  } = useRecipesContext();
  return {
    collections,
    addCollection,
    updateCollection,
    deleteCollection,
    refreshCollections,
    usingDatabase,
  };
}
