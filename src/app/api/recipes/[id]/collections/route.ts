import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserFamily } from "@/lib/supabase/family";
import { setRecipeCollections } from "@/lib/supabase/collections";
import { fetchRecipeById } from "@/lib/supabase/recipes";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  try {
    const { id: recipeId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const family = await getUserFamily(supabase, user.id);
    if (!family) {
      return NextResponse.json({ error: "No family found" }, { status: 404 });
    }

    const recipe = await fetchRecipeById(supabase, recipeId);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const body = (await request.json()) as { collectionIds?: string[] };
    const collectionIds = body.collectionIds ?? [];

    await setRecipeCollections(supabase, {
      recipeId,
      collectionIds,
      familyId: family.familyId,
    });

    const updated = await fetchRecipeById(supabase, recipeId);
    return NextResponse.json({ recipe: updated });
  } catch (error) {
    console.error("Update recipe collections error:", error);
    return NextResponse.json({ error: "Failed to update collections" }, { status: 500 });
  }
}
