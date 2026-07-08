export type Difficulty = "easy" | "medium" | "hard";
export type MealType = "breakfast" | "lunch" | "dinner" | "dessert" | "appetizer" | "snack";
export type ImportStatus = "pending" | "processing" | "completed" | "failed";
export type MemoryType = "story" | "voice" | "photo" | "video" | "note" | "comment";

export interface Ingredient {
  id: string;
  amount: string;
  unit: string;
  name: string;
  notes?: string;
}

export interface Instruction {
  id: string;
  step: number;
  text: string;
  timerMinutes?: number;
}

export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
}

export interface RecipeSource {
  type: "handwritten" | "cookbook" | "magazine" | "website" | "social" | "email" | "family" | "other";
  name?: string;
  author?: string;
  publication?: string;
  url?: string;
  familyMember?: string;
}

export interface RecipeOriginal {
  id: string;
  type: "image" | "pdf" | "scan" | "screenshot" | "document";
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

export interface RecipeMemory {
  id: string;
  type: MemoryType;
  title?: string;
  content: string;
  author: string;
  authorAvatar?: string;
  mediaUrl?: string;
  createdAt: string;
}

export interface RecipeComment {
  id: string;
  author: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

export interface CookingHistoryEntry {
  id: string;
  cookedBy: string;
  cookedAt: string;
  rating?: number;
  notes?: string;
}

export interface RecipeVersion {
  id: string;
  version: number;
  changedBy: string;
  changedAt: string;
  changes: string;
}

export interface TimelineEvent {
  id: string;
  type: "imported" | "edited" | "photo_added" | "story_added" | "cooked" | "rated" | "commented";
  title: string;
  description?: string;
  author?: string;
  timestamp: string;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  heroImage: string;
  gallery: string[];
  ingredients: Ingredient[];
  instructions: Instruction[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: Difficulty;
  cuisine?: string;
  category: string;
  tags: string[];
  mealTypes: MealType[];
  cookingMethod?: string;
  nutrition?: NutritionInfo;
  source: RecipeSource;
  originals: RecipeOriginal[];
  memories: RecipeMemory[];
  comments: RecipeComment[];
  cookingHistory: CookingHistoryEntry[];
  versions: RecipeVersion[];
  timeline: TimelineEvent[];
  collections: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  recipeCount: number;
  isPrivate: boolean;
}

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "owner" | "editor" | "viewer";
  recipesContributed: number;
  joinedAt: string;
}

export interface ImportItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  previewUrl?: string;
  status: ImportStatus;
  recipeId?: string;
  recipeTitle?: string;
  error?: string;
  uploadedAt: string;
}

export interface MealPlanEntry {
  id: string;
  recipeId: string;
  date: string;
  mealType: MealType;
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: string;
  unit: string;
  department: string;
  checked: boolean;
  recipeIds: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  recipeReferences?: string[];
}

export interface ActivityItem {
  id: string;
  type: "recipe_added" | "recipe_cooked" | "story_added" | "member_joined" | "collection_created";
  title: string;
  description: string;
  author: string;
  authorAvatar?: string;
  timestamp: string;
  recipeId?: string;
}
