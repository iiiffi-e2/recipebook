export const RECIPE_CATEGORIES = [
  "Appetizer",
  "Soup",
  "Salad",
  "Main Course",
  "Side Dish",
  "Dessert",
  "Bread & Baking",
  "Drink",
  "Sauce & Condiment",
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export const RECIPE_CATEGORY_FILTERS = ["All", ...RECIPE_CATEGORIES] as const;

export const DEFAULT_RECIPE_CATEGORY: RecipeCategory = "Main Course";

export const CATEGORY_PROMPT =
  "category (exactly one of: Appetizer, Soup, Salad, Main Course, Side Dish, Dessert, Bread & Baking, Drink, Sauce & Condiment)";

const CATEGORY_ALIASES: Record<string, RecipeCategory> = {
  appetizer: "Appetizer",
  appetizers: "Appetizer",
  starter: "Appetizer",
  starters: "Appetizer",
  "hors d'oeuvre": "Appetizer",
  "hors d oeuvre": "Appetizer",
  soup: "Soup",
  soups: "Soup",
  stew: "Soup",
  chili: "Soup",
  chowder: "Soup",
  broth: "Soup",
  salad: "Salad",
  salads: "Salad",
  slaw: "Salad",
  coleslaw: "Salad",
  "main course": "Main Course",
  main: "Main Course",
  mains: "Main Course",
  entree: "Main Course",
  entrée: "Main Course",
  entrees: "Main Course",
  entrées: "Main Course",
  dinner: "Main Course",
  lunch: "Main Course",
  breakfast: "Main Course",
  "main dish": "Main Course",
  "side dish": "Side Dish",
  side: "Side Dish",
  sides: "Side Dish",
  accompaniment: "Side Dish",
  dessert: "Dessert",
  desserts: "Dessert",
  sweets: "Dessert",
  pastry: "Dessert",
  "bread & baking": "Bread & Baking",
  "bread and baking": "Bread & Baking",
  bread: "Bread & Baking",
  baking: "Bread & Baking",
  muffin: "Bread & Baking",
  muffins: "Bread & Baking",
  roll: "Bread & Baking",
  rolls: "Bread & Baking",
  drink: "Drink",
  drinks: "Drink",
  beverage: "Drink",
  beverages: "Drink",
  cocktail: "Drink",
  cocktails: "Drink",
  smoothie: "Drink",
  "sauce & condiment": "Sauce & Condiment",
  "sauce and condiment": "Sauce & Condiment",
  sauce: "Sauce & Condiment",
  sauces: "Sauce & Condiment",
  condiment: "Sauce & Condiment",
  dressing: "Sauce & Condiment",
  marinade: "Sauce & Condiment",
  imported: "Main Course",
  holiday: "Main Course",
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeCategory(value?: string | null): RecipeCategory {
  if (!value?.trim()) {
    return DEFAULT_RECIPE_CATEGORY;
  }

  const exact = RECIPE_CATEGORIES.find(
    (category) => category.toLowerCase() === value.trim().toLowerCase()
  );
  if (exact) {
    return exact;
  }

  const key = normalizeKey(value);
  return CATEGORY_ALIASES[key] ?? DEFAULT_RECIPE_CATEGORY;
}

export function isCanonicalCategory(value: string): value is RecipeCategory {
  return RECIPE_CATEGORIES.includes(value as RecipeCategory);
}
