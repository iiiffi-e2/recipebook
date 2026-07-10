import type { SupabaseClient } from "@supabase/supabase-js";
import type { Collection } from "@/lib/types";

type DbCollection = {
  id: string;
  family_id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  is_private: boolean | null;
  created_at: string;
  collection_recipes?: { recipe_id: string }[];
};

function mapDbCollection(row: DbCollection): Collection {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    coverImage: row.cover_image ?? undefined,
    recipeCount: row.collection_recipes?.length ?? 0,
    isPrivate: row.is_private ?? false,
  };
}

export async function fetchFamilyCollections(
  supabase: SupabaseClient,
  familyId: string
): Promise<Collection[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_recipes(recipe_id)")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data as DbCollection[]).map(mapDbCollection);
}

export async function fetchRecipeCollectionMap(
  supabase: SupabaseClient,
  familyId: string
): Promise<Map<string, string[]>> {
  const { data, error } = await supabase
    .from("collection_recipes")
    .select("recipe_id, collection_id, collections!inner(family_id)")
    .eq("collections.family_id", familyId);

  if (error) throw error;

  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const recipeId = row.recipe_id as string;
    const collectionId = row.collection_id as string;
    const existing = map.get(recipeId) ?? [];
    existing.push(collectionId);
    map.set(recipeId, existing);
  }
  return map;
}

export async function createCollection(
  supabase: SupabaseClient,
  params: {
    familyId: string;
    userId: string;
    name: string;
    description?: string;
  }
): Promise<Collection> {
  const { data, error } = await supabase
    .from("collections")
    .insert({
      family_id: params.familyId,
      name: params.name.trim(),
      description: params.description?.trim() || null,
    })
    .select("*, collection_recipes(recipe_id)")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create collection");

  await supabase.from("activity").insert({
    family_id: params.familyId,
    user_id: params.userId,
    type: "collection_created",
    title: `Created collection "${params.name.trim()}"`,
    description: params.description?.trim() || null,
  });

  return mapDbCollection(data as DbCollection);
}

export async function updateCollection(
  supabase: SupabaseClient,
  collectionId: string,
  familyId: string,
  updates: { name?: string; description?: string }
): Promise<Collection> {
  const patch: Record<string, string | null> = {};

  if (updates.name !== undefined) {
    patch.name = updates.name.trim();
  }

  if (updates.description !== undefined) {
    patch.description = updates.description.trim() || null;
  }

  const { data, error } = await supabase
    .from("collections")
    .update(patch)
    .eq("id", collectionId)
    .eq("family_id", familyId)
    .select("*, collection_recipes(recipe_id)")
    .single();

  if (error || !data) throw error ?? new Error("Failed to update collection");

  return mapDbCollection(data as DbCollection);
}

export async function deleteCollection(
  supabase: SupabaseClient,
  collectionId: string,
  familyId: string
): Promise<void> {
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .eq("family_id", familyId);

  if (error) throw error;
}

export async function setRecipeCollections(
  supabase: SupabaseClient,
  params: {
    recipeId: string;
    collectionIds: string[];
    familyId: string;
  }
): Promise<void> {
  const { recipeId, collectionIds, familyId } = params;

  const { data: familyCollections, error: fetchError } = await supabase
    .from("collections")
    .select("id")
    .eq("family_id", familyId);

  if (fetchError) throw fetchError;

  const validIds = new Set((familyCollections ?? []).map((c) => c.id as string));
  const targetIds = collectionIds.filter((id) => validIds.has(id));

  const { data: current, error: currentError } = await supabase
    .from("collection_recipes")
    .select("collection_id")
    .eq("recipe_id", recipeId)
    .in("collection_id", [...validIds]);

  if (currentError) throw currentError;

  const currentIds = new Set((current ?? []).map((r) => r.collection_id as string));
  const targetSet = new Set(targetIds);

  const toAdd = targetIds.filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !targetSet.has(id));

  if (toRemove.length) {
    const { error } = await supabase
      .from("collection_recipes")
      .delete()
      .eq("recipe_id", recipeId)
      .in("collection_id", toRemove);

    if (error) throw error;
  }

  if (toAdd.length) {
    const { error } = await supabase.from("collection_recipes").insert(
      toAdd.map((collectionId) => ({
        collection_id: collectionId,
        recipe_id: recipeId,
      }))
    );

    if (error) throw error;
  }
}
