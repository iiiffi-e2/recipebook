import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Difficulty,
  Ingredient,
  Instruction,
  MealType,
  Recipe,
  RecipeOriginal,
  RecipeSource,
  TimelineEvent,
} from "@/lib/types";
import {
  DEFAULT_RECIPE_HERO,
  RECIPE_UPLOADS_BUCKET,
} from "@/lib/supabase/config";
import { fetchRecipeCollectionMap, setRecipeCollections } from "@/lib/supabase/collections";

type DbIngredient = {
  id: string;
  recipe_id: string;
  amount: string | null;
  unit: string | null;
  name: string;
  notes: string | null;
  sort_order: number | null;
};

type DbInstruction = {
  id: string;
  recipe_id: string;
  step: number;
  text: string;
  timer_minutes: number | null;
  sort_order: number | null;
};

type DbOriginal = {
  id: string;
  recipe_id: string;
  type: RecipeOriginal["type"];
  storage_path: string;
  thumbnail_path: string | null;
  file_name: string | null;
  file_size: number | null;
  uploaded_at: string;
};

type DbTimeline = {
  id: string;
  recipe_id: string;
  type: string;
  title: string;
  description: string | null;
  author_id: string | null;
  timestamp: string;
};

type DbRecipe = {
  id: string;
  family_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  hero_image: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  difficulty: Difficulty;
  cuisine: string | null;
  category: string | null;
  tags: string[] | null;
  meal_types: string[] | null;
  cooking_method: string | null;
  nutrition: Recipe["nutrition"] | null;
  source: RecipeSource | null;
  is_favorite: boolean | null;
  created_at: string;
  updated_at: string;
  ingredients?: DbIngredient[];
  instructions?: DbInstruction[];
  recipe_originals?: DbOriginal[];
  timeline_events?: DbTimeline[];
};

export type SaveRecipeInput = {
  title: string;
  description?: string;
  heroImage?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: Difficulty;
  cuisine?: string;
  category?: string;
  tags?: string[];
  mealTypes?: MealType[];
  cookingMethod?: string;
  nutrition?: Recipe["nutrition"];
  source?: RecipeSource;
  ingredients?: Array<{
    amount?: string;
    unit?: string;
    name?: string;
    notes?: string;
  }>;
  instructions?: Array<{
    step?: number;
    text?: string;
    timerMinutes?: number | null;
  }>;
};

function resolveStorageUrl(supabase: SupabaseClient, path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path;
  }

  const { data } = supabase.storage.from(RECIPE_UPLOADS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function mapDbRecipeToApp(
  supabase: SupabaseClient,
  row: DbRecipe,
  collectionIds: string[] = []
): Recipe {
  const ingredients: Ingredient[] = (row.ingredients ?? [])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((item) => ({
      id: item.id,
      amount: item.amount ?? "",
      unit: item.unit ?? "",
      name: item.name,
      notes: item.notes ?? undefined,
    }));

  const instructions: Instruction[] = (row.instructions ?? [])
    .sort((a, b) => (a.sort_order ?? a.step) - (b.sort_order ?? b.step))
    .map((item) => ({
      id: item.id,
      step: item.step,
      text: item.text,
      timerMinutes:
        item.timer_minutes != null && item.timer_minutes > 0
          ? item.timer_minutes
          : undefined,
    }));

  const originals: RecipeOriginal[] = (row.recipe_originals ?? []).map((item) => ({
    id: item.id,
    type: item.type,
    url: resolveStorageUrl(supabase, item.storage_path) ?? DEFAULT_RECIPE_HERO,
    thumbnailUrl: resolveStorageUrl(supabase, item.thumbnail_path),
    uploadedAt: item.uploaded_at,
  }));

  const timeline: TimelineEvent[] = (row.timeline_events ?? [])
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map((item) => ({
      id: item.id,
      type: item.type as TimelineEvent["type"],
      title: item.title,
      description: item.description ?? undefined,
      timestamp: item.timestamp,
    }));

  const heroFromOriginal = originals[0]?.url;
  const heroImage =
    resolveStorageUrl(supabase, row.hero_image) ??
    heroFromOriginal ??
    DEFAULT_RECIPE_HERO;

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    heroImage,
    gallery: originals.length > 0 ? originals.map((item) => item.url) : [heroImage],
    ingredients,
    instructions,
    prepTime: row.prep_time ?? 0,
    cookTime: row.cook_time ?? 0,
    servings: row.servings ?? 4,
    difficulty: row.difficulty ?? "medium",
    cuisine: row.cuisine ?? undefined,
    category: row.category ?? "Imported",
    tags: row.tags ?? [],
    mealTypes: (row.meal_types ?? ["dinner"]) as MealType[],
    cookingMethod: row.cooking_method ?? undefined,
    nutrition: row.nutrition ?? undefined,
    source: row.source ?? { type: "other", name: "Imported upload" },
    originals,
    memories: [],
    comments: [],
    cookingHistory: [],
    versions: [],
    timeline,
    collections: collectionIds,
    isFavorite: row.is_favorite ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const recipeSelect = `
  *,
  ingredients (*),
  instructions (*),
  recipe_originals (*),
  timeline_events (*)
`;

export async function fetchFamilyRecipes(
  supabase: SupabaseClient,
  familyId: string
): Promise<Recipe[]> {
  const [{ data, error }, collectionMap] = await Promise.all([
    supabase
      .from("recipes")
      .select(recipeSelect)
      .eq("family_id", familyId)
      .order("created_at", { ascending: false }),
    fetchRecipeCollectionMap(supabase, familyId),
  ]);

  if (error) {
    throw error;
  }

  return (data as DbRecipe[]).map((row) =>
    mapDbRecipeToApp(supabase, row, collectionMap.get(row.id) ?? [])
  );
}

export async function fetchRecipeById(
  supabase: SupabaseClient,
  recipeId: string,
  familyId?: string
): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from("recipes")
    .select(recipeSelect)
    .eq("id", recipeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as DbRecipe;
  let collectionIds: string[] = [];

  if (familyId) {
    const collectionMap = await fetchRecipeCollectionMap(supabase, familyId);
    collectionIds = collectionMap.get(recipeId) ?? [];
  }

  return mapDbRecipeToApp(supabase, row, collectionIds);
}

function inferOriginalType(fileType?: string): RecipeOriginal["type"] {
  if (!fileType) return "document";
  if (fileType.startsWith("image/")) return "image";
  if (fileType === "application/pdf") return "pdf";
  return "document";
}

export async function saveRecipe(
  supabase: SupabaseClient,
  params: {
    familyId: string;
    userId: string;
    recipe: SaveRecipeInput;
    file?: File | null;
    files?: File[];
    fileName?: string;
    heroFile?: File | null;
  }
): Promise<Recipe> {
  const { familyId, userId, recipe, fileName, heroFile } = params;
  const files = (params.files ?? (params.file ? [params.file] : [])).filter(Boolean) as File[];

  const { data: recipeRow, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      family_id: familyId,
      created_by: userId,
      title: recipe.title,
      description: recipe.description ?? null,
      hero_image: recipe.heroImage ?? null,
      prep_time: recipe.prepTime ?? 0,
      cook_time: recipe.cookTime ?? 0,
      servings: recipe.servings ?? 4,
      difficulty: recipe.difficulty ?? "medium",
      cuisine: recipe.cuisine ?? null,
      category: recipe.category ?? "Imported",
      tags: recipe.tags ?? ["imported"],
      meal_types: recipe.mealTypes ?? ["dinner"],
      cooking_method: recipe.cookingMethod ?? null,
      nutrition: recipe.nutrition ?? null,
      source: recipe.source ?? { type: "other", name: "Imported upload" },
    })
    .select("id")
    .single();

  if (recipeError || !recipeRow) {
    throw recipeError ?? new Error("Failed to create recipe");
  }

  const recipeId = recipeRow.id as string;

  if (recipe.ingredients?.length) {
    const { error } = await supabase.from("ingredients").insert(
      recipe.ingredients.map((ingredient, index) => ({
        recipe_id: recipeId,
        amount: ingredient.amount ?? "",
        unit: ingredient.unit ?? "",
        name: ingredient.name ?? "Ingredient",
        notes: ingredient.notes ?? null,
        sort_order: index,
      }))
    );

    if (error) throw error;
  }

  if (recipe.instructions?.length) {
    const { error } = await supabase.from("instructions").insert(
      recipe.instructions.map((instruction, index) => ({
        recipe_id: recipeId,
        step: instruction.step ?? index + 1,
        text: instruction.text ?? "",
        timer_minutes: instruction.timerMinutes ?? null,
        sort_order: index,
      }))
    );

    if (error) throw error;
  }

  let firstStoragePath: string | null = null;

  for (let index = 0; index < files.length; index += 1) {
    const current = files[index];
    const label = (index === 0 ? fileName : undefined) ?? current.name;
    const safeName = label.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${familyId}/${recipeId}/${Date.now()}-${index}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(RECIPE_UPLOADS_BUCKET)
      .upload(storagePath, current, {
        contentType: current.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { error: originalError } = await supabase.from("recipe_originals").insert({
      recipe_id: recipeId,
      type: inferOriginalType(current.type),
      storage_path: storagePath,
      file_name: label,
      file_size: current.size,
    });
    if (originalError) throw originalError;

    if (index === 0) firstStoragePath = storagePath;
  }

  let heroStoragePath: string | null = firstStoragePath;

  if (heroFile && heroFile.size > 0) {
    const safeHeroName = (heroFile.name || "hero.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
    const heroPath = `${familyId}/${recipeId}/${Date.now()}-hero-${safeHeroName}`;
    const { error: heroUploadError } = await supabase.storage
      .from(RECIPE_UPLOADS_BUCKET)
      .upload(heroPath, heroFile, {
        contentType: heroFile.type || "image/jpeg",
        upsert: false,
      });
    if (heroUploadError) throw heroUploadError;
    heroStoragePath = heroPath;
  }

  if (heroStoragePath) {
    await supabase.from("recipes").update({ hero_image: heroStoragePath }).eq("id", recipeId);
  }

  await supabase.from("timeline_events").insert({
    recipe_id: recipeId,
    type: "imported",
    title: "Recipe imported",
    description: fileName ? `Imported from ${fileName}` : "Imported with AI extraction",
    author_id: userId,
  });

  const primaryFile = files[0] ?? null;
  await supabase.from("imports").insert({
    family_id: familyId,
    uploaded_by: userId,
    file_name: fileName ?? primaryFile?.name ?? recipe.title,
    file_type: primaryFile?.type ?? null,
    file_size: primaryFile?.size ?? null,
    storage_path: firstStoragePath,
    status: "completed",
    recipe_id: recipeId,
  });

  await supabase.from("activity").insert({
    family_id: familyId,
    user_id: userId,
    type: "recipe_added",
    title: `Imported ${recipe.title}`,
    description: fileName ? `From ${fileName}` : "AI import",
    recipe_id: recipeId,
  });

  const saved = await fetchRecipeById(supabase, recipeId, familyId);
  if (!saved) {
    throw new Error("Recipe saved but could not be loaded");
  }

  return saved;
}

export function recipeToSaveInput(recipe: Recipe): SaveRecipeInput {
  return {
    title: recipe.title,
    description: recipe.description,
    heroImage: recipe.heroImage.startsWith("blob:") ? undefined : recipe.heroImage,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    cuisine: recipe.cuisine,
    category: recipe.category,
    tags: recipe.tags,
    mealTypes: recipe.mealTypes,
    cookingMethod: recipe.cookingMethod,
    nutrition: recipe.nutrition,
    source: recipe.source,
    ingredients: recipe.ingredients.map((item) => ({
      amount: item.amount,
      unit: item.unit,
      name: item.name,
      notes: item.notes,
    })),
    instructions: recipe.instructions.map((item) => ({
      step: item.step,
      text: item.text,
      timerMinutes: item.timerMinutes ?? null,
    })),
  };
}

function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case "image/webp":
      return "webp";
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

function parseDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

export async function updateRecipeHeroImage(
  supabase: SupabaseClient,
  params: {
    familyId: string;
    recipeId: string;
    file?: File | null;
    imageData?: string | null;
    source?: "upload" | "generated";
  }
): Promise<{ heroImage: string; storagePath: string }> {
  const { familyId, recipeId, file, imageData, source = "upload" } = params;

  let body: Buffer;
  let contentType: string;
  let fileLabel: string;

  if (file) {
    body = Buffer.from(await file.arrayBuffer());
    contentType = file.type || "image/jpeg";
    fileLabel = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  } else if (imageData) {
    const parsed = parseDataUrl(imageData);
    if (!parsed) {
      throw new Error("Invalid image data");
    }
    body = parsed.buffer;
    contentType = parsed.contentType;
    fileLabel = `hero-${source}.${extensionForContentType(contentType)}`;
  } else {
    throw new Error("Image file or data required");
  }

  const storagePath = `${familyId}/${recipeId}/${Date.now()}-${fileLabel}`;

  const { error: uploadError } = await supabase.storage
    .from(RECIPE_UPLOADS_BUCKET)
    .upload(storagePath, body, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { error: updateError } = await supabase
    .from("recipes")
    .update({ hero_image: storagePath })
    .eq("id", recipeId)
    .eq("family_id", familyId);

  if (updateError) {
    throw updateError;
  }

  const heroImage = resolveStorageUrl(supabase, storagePath) ?? DEFAULT_RECIPE_HERO;

  return { heroImage, storagePath };
}

export type UpdateRecipeInput = SaveRecipeInput & {
  collectionIds?: string[];
};

export async function updateRecipe(
  supabase: SupabaseClient,
  params: {
    familyId: string;
    userId: string;
    recipeId: string;
    recipe: UpdateRecipeInput;
  }
): Promise<Recipe> {
  const { familyId, userId, recipeId, recipe } = params;

  const { error: recipeError } = await supabase
    .from("recipes")
    .update({
      title: recipe.title,
      description: recipe.description ?? null,
      prep_time: recipe.prepTime ?? 0,
      cook_time: recipe.cookTime ?? 0,
      servings: recipe.servings ?? 4,
      difficulty: recipe.difficulty ?? "medium",
      cuisine: recipe.cuisine ?? null,
      category: recipe.category ?? "Imported",
      tags: recipe.tags ?? [],
      meal_types: recipe.mealTypes ?? ["dinner"],
      cooking_method: recipe.cookingMethod ?? null,
      nutrition: recipe.nutrition ?? null,
      source: recipe.source ?? { type: "other" },
    })
    .eq("id", recipeId)
    .eq("family_id", familyId);

  if (recipeError) throw recipeError;

  await supabase.from("ingredients").delete().eq("recipe_id", recipeId);
  await supabase.from("instructions").delete().eq("recipe_id", recipeId);

  if (recipe.ingredients?.length) {
    const { error } = await supabase.from("ingredients").insert(
      recipe.ingredients.map((ingredient, index) => ({
        recipe_id: recipeId,
        amount: ingredient.amount ?? "",
        unit: ingredient.unit ?? "",
        name: ingredient.name ?? "Ingredient",
        notes: ingredient.notes ?? null,
        sort_order: index,
      }))
    );
    if (error) throw error;
  }

  if (recipe.instructions?.length) {
    const { error } = await supabase.from("instructions").insert(
      recipe.instructions.map((instruction, index) => ({
        recipe_id: recipeId,
        step: instruction.step ?? index + 1,
        text: instruction.text ?? "",
        timer_minutes: instruction.timerMinutes ?? null,
        sort_order: index,
      }))
    );
    if (error) throw error;
  }

  if (recipe.collectionIds !== undefined) {
    await setRecipeCollections(supabase, {
      recipeId,
      collectionIds: recipe.collectionIds,
      familyId,
    });
  }

  await supabase.from("timeline_events").insert({
    recipe_id: recipeId,
    type: "edited",
    title: "Recipe updated",
    description: "Ingredients, instructions, or details were changed",
    author_id: userId,
  });

  const updated = await fetchRecipeById(supabase, recipeId, familyId);
  if (!updated) {
    throw new Error("Recipe updated but could not be loaded");
  }

  return updated;
}

export async function deleteRecipe(
  supabase: SupabaseClient,
  params: { familyId: string; recipeId: string }
): Promise<void> {
  const { familyId, recipeId } = params;

  await supabase.from("imports").update({ recipe_id: null }).eq("recipe_id", recipeId);
  await supabase.from("activity").update({ recipe_id: null }).eq("recipe_id", recipeId);

  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("family_id", familyId);

  if (error) throw error;
}
