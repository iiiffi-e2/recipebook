import { create } from "zustand";
import type { ImportItem, ChatMessage, ShoppingItem, MealPlanEntry, Recipe } from "./types";
import { demoShoppingList, demoMealPlan } from "./demo-data";

export type HeroImageSource = "default" | "upload" | "generated";

export interface HeroOverride {
  url: string;
  source: HeroImageSource;
}

interface AppState {
  importQueue: ImportItem[];
  addToImportQueue: (items: ImportItem[]) => void;
  updateImportItem: (id: string, updates: Partial<ImportItem>) => void;
  clearImportQueue: () => void;

  importedRecipes: Recipe[];
  addImportedRecipe: (recipe: Recipe) => void;

  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;

  shoppingList: ShoppingItem[];
  toggleShoppingItem: (id: string) => void;
  clearCheckedItems: () => void;

  mealPlan: MealPlanEntry[];
  addMealPlanEntry: (entry: MealPlanEntry) => void;
  removeMealPlanEntry: (id: string) => void;

  checkedIngredients: Record<string, string[]>;
  toggleIngredient: (recipeId: string, ingredientId: string) => void;
  clearIngredients: (recipeId: string) => void;

  activeTimers: { recipeId: string; stepId: string; minutes: number; startedAt: number }[];
  startTimer: (recipeId: string, stepId: string, minutes: number) => void;
  stopTimer: (recipeId: string, stepId: string) => void;

  heroOverrides: Record<string, HeroOverride>;
  setHeroImage: (recipeId: string, url: string, source: HeroImageSource) => void;
  resetHeroImage: (recipeId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  importQueue: [],
  addToImportQueue: (items) =>
    set((state) => ({ importQueue: [...state.importQueue, ...items] })),
  updateImportItem: (id, updates) =>
    set((state) => ({
      importQueue: state.importQueue.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),
  clearImportQueue: () => set({ importQueue: [] }),

  importedRecipes: [],
  addImportedRecipe: (recipe) =>
    set((state) => ({
      importedRecipes: [
        recipe,
        ...state.importedRecipes.filter((existing) => existing.id !== recipe.id),
      ],
    })),

  chatMessages: [],
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  clearChat: () => set({ chatMessages: [] }),

  shoppingList: demoShoppingList,
  toggleShoppingItem: (id) =>
    set((state) => ({
      shoppingList: state.shoppingList.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      ),
    })),
  clearCheckedItems: () =>
    set((state) => ({
      shoppingList: state.shoppingList.filter((item) => !item.checked),
    })),

  mealPlan: demoMealPlan,
  addMealPlanEntry: (entry) =>
    set((state) => ({ mealPlan: [...state.mealPlan, entry] })),
  removeMealPlanEntry: (id) =>
    set((state) => ({
      mealPlan: state.mealPlan.filter((entry) => entry.id !== id),
    })),

  checkedIngredients: {},
  toggleIngredient: (recipeId, ingredientId) =>
    set((state) => {
      const current = state.checkedIngredients[recipeId] || [];
      const updated = current.includes(ingredientId)
        ? current.filter((id) => id !== ingredientId)
        : [...current, ingredientId];
      return {
        checkedIngredients: { ...state.checkedIngredients, [recipeId]: updated },
      };
    }),
  clearIngredients: (recipeId) =>
    set((state) => ({
      checkedIngredients: { ...state.checkedIngredients, [recipeId]: [] },
    })),

  activeTimers: [],
  startTimer: (recipeId, stepId, minutes) =>
    set((state) => ({
      activeTimers: [
        ...state.activeTimers.filter(
          (t) => !(t.recipeId === recipeId && t.stepId === stepId)
        ),
        { recipeId, stepId, minutes, startedAt: Date.now() },
      ],
    })),
  stopTimer: (recipeId, stepId) =>
    set((state) => ({
      activeTimers: state.activeTimers.filter(
        (t) => !(t.recipeId === recipeId && t.stepId === stepId)
      ),
    })),

  heroOverrides: {},
  setHeroImage: (recipeId, url, source) =>
    set((state) => ({
      heroOverrides: {
        ...state.heroOverrides,
        [recipeId]: { url, source },
      },
    })),
  resetHeroImage: (recipeId) =>
    set((state) => {
      const next = { ...state.heroOverrides };
      delete next[recipeId];
      return { heroOverrides: next };
    }),
}));

export function useRecipeHero(recipeId: string, defaultUrl: string) {
  const override = useAppStore((s) => s.heroOverrides[recipeId]);
  return {
    heroImage: override?.url ?? defaultUrl,
    heroSource: override?.source ?? ("default" as HeroImageSource),
    isCustom: Boolean(override),
  };
}
