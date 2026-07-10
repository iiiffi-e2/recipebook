import type {
  Recipe,
  Collection,
  FamilyMember,
  ActivityItem,
  MealPlanEntry,
  ShoppingItem,
} from "./types";

export const demoRecipes: Recipe[] = [
  {
    id: "grandmas-apple-pie",
    title: "Grandma Rose's Apple Pie",
    description:
      "The pie that defined every Thanksgiving at Grandma Rose's house. She always said the secret was cold butter and a patient heart.",
    heroImage:
      "https://images.unsplash.com/photo-1535920527002-b35e967229eb?w=1200&h=800&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1535920527002-b35e967229eb?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1621293955855-f0a8d7812bb6?w=800&h=600&fit=crop",
    ],
    ingredients: [
      { id: "1", amount: "2½", unit: "cups", name: "all-purpose flour" },
      { id: "2", amount: "1", unit: "cup", name: "cold unsalted butter", notes: "cut into cubes" },
      { id: "3", amount: "6", unit: "", name: "Granny Smith apples", notes: "peeled and sliced" },
      { id: "4", amount: "¾", unit: "cup", name: "granulated sugar" },
      { id: "5", amount: "2", unit: "tbsp", name: "fresh lemon juice" },
      { id: "6", amount: "1", unit: "tsp", name: "ground cinnamon" },
      { id: "7", amount: "¼", unit: "tsp", name: "nutmeg" },
      { id: "8", amount: "1", unit: "tbsp", name: "butter", notes: "for dotting" },
      { id: "9", amount: "1", unit: "", name: "egg", notes: "beaten, for egg wash" },
    ],
    instructions: [
      { id: "1", step: 1, text: "Combine flour and salt. Cut in cold butter until mixture resembles coarse crumbs with pea-sized pieces." },
      { id: "2", step: 2, text: "Add ice water one tablespoon at a time, mixing until dough just comes together. Divide in half, wrap, and refrigerate for 1 hour.", timerMinutes: 60 },
      { id: "3", step: 3, text: "Toss apple slices with sugar, lemon juice, cinnamon, and nutmeg. Let sit for 15 minutes.", timerMinutes: 15 },
      { id: "4", step: 4, text: "Roll out bottom crust and place in pie dish. Fill with apple mixture and dot with butter." },
      { id: "5", step: 5, text: "Roll out top crust, place over filling, crimp edges, and cut vents. Brush with egg wash." },
      { id: "6", step: 6, text: "Bake at 425°F for 15 minutes, then reduce to 350°F and bake 45 minutes more until golden.", timerMinutes: 60 },
    ],
    prepTime: 45,
    cookTime: 60,
    servings: 8,
    difficulty: "medium",
    cuisine: "American",
    category: "Dessert",
    tags: ["thanksgiving", "family-favorites", "holiday", "dessert", "apple", "pie"],
    mealTypes: ["dessert"],
    cookingMethod: "baking",
    nutrition: { calories: 380, protein: 4, carbs: 52, fat: 18, fiber: 3, sodium: 210 },
    source: {
      type: "handwritten",
      name: "Grandma Rose's Recipe Box",
      author: "Rose Mitchell",
      familyMember: "Grandma Rose",
    },
    originals: [
      {
        id: "orig-1",
        type: "scan",
        url: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&h=800&fit=crop",
        uploadedAt: "2024-11-15T10:00:00Z",
      },
    ],
    memories: [
      {
        id: "mem-1",
        type: "story",
        title: "The Thanksgiving Tradition",
        content:
          "Every Thanksgiving, the whole family would gather in Grandma Rose's kitchen. She'd hand each grandchild a paring knife and teach us to peel apples while telling stories about her childhood in Vermont. The kitchen would smell like cinnamon and love.",
        author: "Sarah Mitchell",
        createdAt: "2024-11-20T14:30:00Z",
      },
      {
        id: "mem-2",
        type: "voice",
        title: "Grandma's voice explaining the crust",
        content: "Audio recording of Grandma Rose explaining her crust technique",
        author: "Rose Mitchell",
        mediaUrl: "/audio/grandma-crust.mp3",
        createdAt: "2019-11-28T16:00:00Z",
      },
    ],
    comments: [
      {
        id: "com-1",
        author: "Michael Mitchell",
        content: "I tried using honeycrisp apples this year — still delicious but a bit sweeter. Grandma would have approved.",
        createdAt: "2024-12-01T09:15:00Z",
      },
    ],
    cookingHistory: [
      { id: "ch-1", cookedBy: "Sarah Mitchell", cookedAt: "2024-11-28T18:00:00Z", rating: 5, notes: "Perfect crust!" },
      { id: "ch-2", cookedBy: "Michael Mitchell", cookedAt: "2023-11-23T17:30:00Z", rating: 5 },
      { id: "ch-3", cookedBy: "Emma Mitchell", cookedAt: "2022-11-24T16:00:00Z", rating: 4 },
    ],
    versions: [
      { id: "v-1", version: 1, changedBy: "Sarah Mitchell", changedAt: "2024-11-15T10:00:00Z", changes: "Initial import from handwritten card" },
    ],
    timeline: [
      { id: "t-1", type: "imported", title: "Recipe imported", description: "Scanned from Grandma Rose's handwritten recipe card", timestamp: "2024-11-15T10:00:00Z" },
      { id: "t-2", type: "story_added", title: "Story added", description: "The Thanksgiving Tradition", author: "Sarah Mitchell", timestamp: "2024-11-20T14:30:00Z" },
      { id: "t-3", type: "cooked", title: "Cooked by Sarah", description: "Thanksgiving 2024", author: "Sarah Mitchell", timestamp: "2024-11-28T18:00:00Z" },
    ],
    collections: ["family-favorites", "thanksgiving", "grandmas-recipes"],
    isFavorite: true,
    createdAt: "2024-11-15T10:00:00Z",
    updatedAt: "2024-11-28T18:00:00Z",
  },
  {
    id: "dads-chili",
    title: "Dad's Championship Chili",
    description:
      "The recipe that won the neighborhood cook-off three years running. Dad never shared the full secret until his 60th birthday.",
    heroImage:
      "https://images.unsplash.com/photo-1598186229723-096598a9f46e?w=1200&h=800&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1598186229723-096598a9f46e?w=800&h=600&fit=crop",
    ],
    ingredients: [
      { id: "1", amount: "2", unit: "lbs", name: "ground beef" },
      { id: "2", amount: "1", unit: "lb", name: "ground pork" },
      { id: "3", amount: "2", unit: "", name: "yellow onions", notes: "diced" },
      { id: "4", amount: "4", unit: "cloves", name: "garlic", notes: "minced" },
      { id: "5", amount: "3", unit: "cans", name: "diced tomatoes", notes: "28oz each" },
      { id: "6", amount: "2", unit: "cans", name: "kidney beans", notes: "drained" },
      { id: "7", amount: "3", unit: "tbsp", name: "chili powder" },
      { id: "8", amount: "2", unit: "tbsp", name: "cumin" },
      { id: "9", amount: "1", unit: "tbsp", name: "smoked paprika" },
      { id: "10", amount: "2", unit: "", name: "chipotle peppers in adobo", notes: "Dad's secret" },
      { id: "11", amount: "1", unit: "oz", name: "unsweetened chocolate" },
    ],
    instructions: [
      { id: "1", step: 1, text: "Brown beef and pork in a large Dutch oven over medium-high heat. Drain excess fat." },
      { id: "2", step: 2, text: "Add onions and garlic. Cook until softened, about 5 minutes.", timerMinutes: 5 },
      { id: "3", step: 3, text: "Add all spices and chipotle peppers. Stir and cook for 2 minutes until fragrant.", timerMinutes: 2 },
      { id: "4", step: 4, text: "Add tomatoes, beans, and chocolate. Stir well." },
      { id: "5", step: 5, text: "Simmer uncovered for at least 2 hours, stirring occasionally. The longer, the better.", timerMinutes: 120 },
      { id: "6", step: 6, text: "Taste and adjust seasoning. Serve with cornbread and all the fixings." },
    ],
    prepTime: 20,
    cookTime: 150,
    servings: 12,
    difficulty: "easy",
    cuisine: "American",
    category: "Soup",
    tags: ["slow-cooker", "one-pot", "family-favorites", "comfort-food", "freezes-well"],
    mealTypes: ["dinner"],
    cookingMethod: "stovetop",
    nutrition: { calories: 420, protein: 32, carbs: 28, fat: 22, fiber: 8, sodium: 890 },
    source: {
      type: "family",
      author: "James Mitchell",
      familyMember: "Dad",
    },
    originals: [
      {
        id: "orig-1",
        type: "screenshot",
        url: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&h=800&fit=crop",
        uploadedAt: "2024-01-10T08:00:00Z",
      },
    ],
    memories: [
      {
        id: "mem-3",
        type: "story",
        title: "The Cook-Off Victory",
        content:
          "Dad entered this chili in the Oak Street cook-off every October. When he finally won in 2018, the whole block came over for a chili party. He cried when they announced his name.",
        author: "Michael Mitchell",
        createdAt: "2024-01-15T12:00:00Z",
      },
    ],
    comments: [],
    cookingHistory: [
      { id: "ch-1", cookedBy: "James Mitchell", cookedAt: "2024-10-15T17:00:00Z", rating: 5 },
    ],
    versions: [],
    timeline: [
      { id: "t-1", type: "imported", title: "Recipe imported", description: "From Dad's email", timestamp: "2024-01-10T08:00:00Z" },
    ],
    collections: ["family-favorites", "quick-meals"],
    isFavorite: true,
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-10-15T17:00:00Z",
  },
  {
    id: "moms-sunday-roast",
    title: "Mom's Sunday Pot Roast",
    description: "Slow-braised perfection. The smell of this roast meant it was Sunday.",
    heroImage:
      "https://images.unsplash.com/photo-1595777216528-071e0127ccbf?w=1200&h=800&fit=crop",
    gallery: [],
    ingredients: [
      { id: "1", amount: "4", unit: "lbs", name: "chuck roast" },
      { id: "2", amount: "1", unit: "lb", name: "baby carrots" },
      { id: "3", amount: "1", unit: "lb", name: "Yukon gold potatoes", notes: "quartered" },
      { id: "4", amount: "2", unit: "", name: "yellow onions", notes: "quartered" },
      { id: "5", amount: "4", unit: "cups", name: "beef broth" },
      { id: "6", amount: "2", unit: "tbsp", name: "tomato paste" },
      { id: "7", amount: "3", unit: "sprigs", name: "fresh rosemary" },
      { id: "8", amount: "4", unit: "cloves", name: "garlic" },
    ],
    instructions: [
      { id: "1", step: 1, text: "Season roast generously with salt and pepper. Sear on all sides in a hot Dutch oven." },
      { id: "2", step: 2, text: "Remove roast. Sauté onions and garlic until golden." },
      { id: "3", step: 3, text: "Add tomato paste, broth, and rosemary. Return roast to pot." },
      { id: "4", step: 4, text: "Cover and braise at 325°F for 3 hours.", timerMinutes: 180 },
      { id: "5", step: 5, text: "Add carrots and potatoes. Continue cooking 1 hour until vegetables are tender.", timerMinutes: 60 },
      { id: "6", step: 6, text: "Rest roast 15 minutes before slicing. Serve with pan juices.", timerMinutes: 15 },
    ],
    prepTime: 20,
    cookTime: 270,
    servings: 8,
    difficulty: "easy",
    cuisine: "American",
    category: "Main Course",
    tags: ["slow-cooker", "sunday-dinner", "comfort-food", "family-favorites", "one-pot"],
    mealTypes: ["dinner"],
    cookingMethod: "braising",
    source: {
      type: "cookbook",
      name: "Better Homes & Gardens",
      author: "Patricia Mitchell",
      familyMember: "Mom",
    },
    originals: [],
    memories: [],
    comments: [],
    cookingHistory: [],
    versions: [],
    timeline: [
      { id: "t-1", type: "imported", title: "Recipe imported", timestamp: "2024-03-01T10:00:00Z" },
    ],
    collections: ["family-favorites", "sunday-dinners"],
    isFavorite: true,
    createdAt: "2024-03-01T10:00:00Z",
    updatedAt: "2024-03-01T10:00:00Z",
  },
  {
    id: "aunt-lisas-lemon-bars",
    title: "Aunt Lisa's Lemon Bars",
    description: "Tart, sweet, and impossibly buttery. Lisa brought these to every family gathering.",
    heroImage:
      "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=1200&h=800&fit=crop",
    gallery: [],
    ingredients: [
      { id: "1", amount: "2", unit: "cups", name: "all-purpose flour" },
      { id: "2", amount: "½", unit: "cup", name: "powdered sugar" },
      { id: "3", amount: "1", unit: "cup", name: "cold butter" },
      { id: "4", amount: "4", unit: "", name: "eggs" },
      { id: "5", amount: "2", unit: "cups", name: "granulated sugar" },
      { id: "6", amount: "⅓", unit: "cup", name: "fresh lemon juice" },
      { id: "7", amount: "¼", unit: "cup", name: "lemon zest" },
    ],
    instructions: [
      { id: "1", step: 1, text: "Mix flour, powdered sugar, and butter for crust. Press into 9x13 pan. Bake 20 min at 350°F.", timerMinutes: 20 },
      { id: "2", step: 2, text: "Whisk eggs, sugar, lemon juice, and zest. Pour over hot crust." },
      { id: "3", step: 3, text: "Bake 25 minutes until set. Cool completely, dust with powdered sugar.", timerMinutes: 25 },
    ],
    prepTime: 15,
    cookTime: 45,
    servings: 24,
    difficulty: "easy",
    cuisine: "American",
    category: "Dessert",
    tags: ["dessert", "christmas", "kid-friendly", "quick-meals"],
    mealTypes: ["dessert"],
    cookingMethod: "baking",
    source: {
      type: "social",
      name: "Pinterest",
      familyMember: "Aunt Lisa",
    },
    originals: [
      {
        id: "orig-1",
        type: "screenshot",
        url: "https://images.unsplash.com/photo-1611162617474-5b21eee39f8b?w=600&h=800&fit=crop",
        uploadedAt: "2024-06-01T14:00:00Z",
      },
    ],
    memories: [],
    comments: [],
    cookingHistory: [],
    versions: [],
    timeline: [],
    collections: ["christmas", "desserts"],
    isFavorite: false,
    createdAt: "2024-06-01T14:00:00Z",
    updatedAt: "2024-06-01T14:00:00Z",
  },
  {
    id: "nonnas-pasta-sauce",
    title: "Nonna's Sunday Gravy",
    description: "A sauce that simmered all day, every Sunday, for three generations.",
    heroImage:
      "https://images.unsplash.com/photo-1625944525537-473f6a6f3fa0?w=1200&h=800&fit=crop",
    gallery: [],
    ingredients: [
      { id: "1", amount: "2", unit: "cans", name: "San Marzano tomatoes", notes: "28oz" },
      { id: "2", amount: "¼", unit: "cup", name: "olive oil" },
      { id: "6", amount: "6", unit: "cloves", name: "garlic", notes: "whole" },
      { id: "4", amount: "1", unit: "bunch", name: "fresh basil" },
      { id: "5", amount: "1", unit: "tsp", name: "red pepper flakes" },
      { id: "6b", amount: "1", unit: "lb", name: "meatballs", notes: "Nonna's recipe" },
      { id: "7", amount: "1", unit: "lb", name: "Italian sausage" },
    ],
    instructions: [
      { id: "1", step: 1, text: "Heat olive oil in a large pot. Add whole garlic cloves and cook until golden." },
      { id: "2", step: 2, text: "Add tomatoes, crushing by hand. Add basil and red pepper flakes." },
      { id: "3", step: 3, text: "Add meatballs and sausage. Simmer on lowest heat for 4-6 hours.", timerMinutes: 300 },
      { id: "4", step: 4, text: "Remove garlic cloves. Taste and adjust salt. Serve over fresh pasta." },
    ],
    prepTime: 30,
    cookTime: 360,
    servings: 10,
    difficulty: "medium",
    cuisine: "Italian",
    category: "Main Course",
    tags: ["italian", "sunday-dinner", "slow-cooker", "family-favorites"],
    mealTypes: ["dinner"],
    cookingMethod: "simmering",
    source: {
      type: "handwritten",
      author: "Maria Rossi",
      familyMember: "Nonna",
    },
    originals: [],
    memories: [
      {
        id: "mem-4",
        type: "story",
        title: "Sunday in Brooklyn",
        content: "Nonna would start the gravy at 6 AM. By noon, the whole apartment building could smell it.",
        author: "Sarah Mitchell",
        createdAt: "2024-08-01T10:00:00Z",
      },
    ],
    comments: [],
    cookingHistory: [],
    versions: [],
    timeline: [],
    collections: ["family-favorites", "italian"],
    isFavorite: true,
    createdAt: "2024-08-01T10:00:00Z",
    updatedAt: "2024-08-01T10:00:00Z",
  },
  {
    id: "morning-pancakes",
    title: "Fluffy Buttermilk Pancakes",
    description: "Saturday morning pancakes — the kids' favorite way to start the weekend.",
    heroImage:
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&h=800&fit=crop",
    gallery: [],
    ingredients: [
      { id: "1", amount: "2", unit: "cups", name: "all-purpose flour" },
      { id: "2", amount: "2", unit: "tbsp", name: "sugar" },
      { id: "3", amount: "2", unit: "tsp", name: "baking powder" },
      { id: "4", amount: "1", unit: "tsp", name: "baking soda" },
      { id: "5", amount: "2", unit: "cups", name: "buttermilk" },
      { id: "6", amount: "2", unit: "", name: "eggs" },
      { id: "7", amount: "4", unit: "tbsp", name: "melted butter" },
    ],
    instructions: [
      { id: "1", step: 1, text: "Whisk dry ingredients in a large bowl." },
      { id: "2", step: 2, text: "Whisk wet ingredients separately. Pour into dry and mix until just combined — lumps are okay." },
      { id: "3", step: 3, text: "Cook on a buttered griddle over medium heat, 2-3 minutes per side.", timerMinutes: 3 },
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    difficulty: "easy",
    cuisine: "American",
    category: "Bread & Baking",
    tags: ["breakfast", "kid-friendly", "quick-meals", "vegetarian"],
    mealTypes: ["breakfast"],
    cookingMethod: "griddle",
    source: { type: "website", name: "NYT Cooking", url: "https://cooking.nytimes.com" },
    originals: [],
    memories: [],
    comments: [],
    cookingHistory: [],
    versions: [],
    timeline: [],
    collections: ["breakfast", "kid-friendly"],
    isFavorite: false,
    createdAt: "2024-09-01T08:00:00Z",
    updatedAt: "2024-09-01T08:00:00Z",
  },
];

export const demoCollections: Collection[] = [
  { id: "family-favorites", name: "Family Favorites", description: "The recipes we make again and again", recipeCount: 5, isPrivate: false, coverImage: "https://images.unsplash.com/photo-1535920527002-b35e967229eb?w=400&h=300&fit=crop" },
  { id: "thanksgiving", name: "Thanksgiving", description: "Our holiday table traditions", recipeCount: 12, isPrivate: false, coverImage: "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&h=300&fit=crop" },
  { id: "christmas", name: "Christmas", description: "Holiday baking and feasting", recipeCount: 8, isPrivate: false },
  { id: "grandmas-recipes", name: "Grandma's Recipes", description: "Preserved from Grandma Rose's kitchen", recipeCount: 15, isPrivate: false },
  { id: "quick-meals", name: "Quick Meals", description: "Weeknight dinners under 30 minutes", recipeCount: 22, isPrivate: false },
  { id: "breakfast", name: "Breakfast", recipeCount: 14, isPrivate: false },
];

export const demoFamily: FamilyMember[] = [
  { id: "1", name: "Sarah Mitchell", email: "sarah@family.com", role: "owner", recipesContributed: 24, joinedAt: "2024-01-01T00:00:00Z" },
  { id: "2", name: "James Mitchell", email: "dad@family.com", role: "editor", recipesContributed: 8, joinedAt: "2024-01-15T00:00:00Z" },
  { id: "3", name: "Michael Mitchell", email: "mike@family.com", role: "editor", recipesContributed: 5, joinedAt: "2024-02-01T00:00:00Z" },
  { id: "4", name: "Emma Mitchell", email: "emma@family.com", role: "viewer", recipesContributed: 2, joinedAt: "2024-06-01T00:00:00Z" },
];

export const demoActivity: ActivityItem[] = [
  { id: "1", type: "recipe_cooked", title: "Sarah cooked Grandma Rose's Apple Pie", description: "Rated 5 stars", author: "Sarah Mitchell", timestamp: "2024-11-28T18:00:00Z", recipeId: "grandmas-apple-pie" },
  { id: "2", type: "story_added", title: "Michael added a story to Dad's Championship Chili", description: "The Cook-Off Victory", author: "Michael Mitchell", timestamp: "2024-01-15T12:00:00Z", recipeId: "dads-chili" },
  { id: "3", type: "recipe_added", title: "Sarah imported Aunt Lisa's Lemon Bars", description: "From Pinterest screenshot", author: "Sarah Mitchell", timestamp: "2024-06-01T14:00:00Z", recipeId: "aunt-lisas-lemon-bars" },
  { id: "4", type: "member_joined", title: "Emma joined the family cookbook", description: "Welcome to the family!", author: "Emma Mitchell", timestamp: "2024-06-01T00:00:00Z" },
];

export const demoMealPlan: MealPlanEntry[] = [
  { id: "mp-1", recipeId: "morning-pancakes", date: "2026-07-07", mealType: "breakfast" },
  { id: "mp-2", recipeId: "dads-chili", date: "2026-07-07", mealType: "dinner" },
  { id: "mp-3", recipeId: "moms-sunday-roast", date: "2026-07-08", mealType: "dinner" },
  { id: "mp-4", recipeId: "aunt-lisas-lemon-bars", date: "2026-07-09", mealType: "dessert" },
];

export const demoShoppingList: ShoppingItem[] = [
  { id: "s-1", name: "ground beef", amount: "2", unit: "lbs", department: "Meat & Seafood", checked: false, recipeIds: ["dads-chili"] },
  { id: "s-2", name: "ground pork", amount: "1", unit: "lb", department: "Meat & Seafood", checked: false, recipeIds: ["dads-chili"] },
  { id: "s-3", name: "kidney beans", amount: "2", unit: "cans", department: "Canned Goods", checked: true, recipeIds: ["dads-chili"] },
  { id: "s-4", name: "diced tomatoes", amount: "3", unit: "cans", department: "Canned Goods", checked: false, recipeIds: ["dads-chili"] },
  { id: "s-5", name: "chuck roast", amount: "4", unit: "lbs", department: "Meat & Seafood", checked: false, recipeIds: ["moms-sunday-roast"] },
  { id: "s-6", name: "baby carrots", amount: "1", unit: "lb", department: "Produce", checked: false, recipeIds: ["moms-sunday-roast"] },
  { id: "s-7", name: "Yukon gold potatoes", amount: "1", unit: "lb", department: "Produce", checked: false, recipeIds: ["moms-sunday-roast"] },
  { id: "s-8", name: "buttermilk", amount: "2", unit: "cups", department: "Dairy", checked: false, recipeIds: ["morning-pancakes"] },
  { id: "s-9", name: "eggs", amount: "1", unit: "dozen", department: "Dairy", checked: false, recipeIds: ["morning-pancakes", "aunt-lisas-lemon-bars"] },
];

export { RECIPE_CATEGORY_FILTERS as categoryFilters } from "./categories";

export function getRecipeById(id: string, recipes: Recipe[] = demoRecipes): Recipe | undefined {
  return recipes.find((r) => r.id === id);
}

export function searchRecipes(query: string, recipes: Recipe[] = demoRecipes): Recipe[] {
  const q = query.toLowerCase().trim();
  if (!q) return recipes;

  return recipes.filter((recipe) => {
    const searchable = [
      recipe.title,
      recipe.description,
      recipe.category,
      recipe.cuisine,
      ...recipe.tags,
      ...recipe.ingredients.map((i) => i.name),
      recipe.source.familyMember,
      recipe.source.author,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (searchable.includes(q)) return true;

    if (q.includes("30 min") || q.includes("quick")) {
      return recipe.prepTime + recipe.cookTime <= 30;
    }
    if (q.includes("chicken")) return searchable.includes("chicken");
    if (q.includes("grandma") || q.includes("grandmother")) {
      return searchable.includes("grandma") || searchable.includes("rose");
    }
    if (q.includes("dessert")) return recipe.mealTypes.includes("dessert");
    if (q.includes("freez")) return recipe.tags.includes("freezes-well");
    if (q.includes("thanksgiving")) return recipe.tags.includes("thanksgiving");

    return false;
  });
}
