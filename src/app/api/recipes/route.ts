import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserFamily, getUserFamily } from "@/lib/supabase/family";
import { fetchFamilyRecipes, saveRecipe, type SaveRecipeInput } from "@/lib/supabase/recipes";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ recipes: [], configured: false });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const family = await getUserFamily(supabase, user.id);
    if (!family) {
      return NextResponse.json({ recipes: [], family: null });
    }

    const recipes = await fetchFamilyRecipes(supabase, family.familyId);
    return NextResponse.json({ recipes, family });
  } catch (error) {
    console.error("Fetch recipes error:", error);
    return NextResponse.json({ error: "Failed to load recipes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const family = await ensureUserFamily(supabase, user.id);
    const contentType = request.headers.get("content-type") ?? "";
    let recipeInput: SaveRecipeInput;
    let file: File | null = null;
    let fileName: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const recipeJson = formData.get("recipe");

      if (typeof recipeJson !== "string") {
        return NextResponse.json({ error: "Recipe payload required" }, { status: 400 });
      }

      recipeInput = JSON.parse(recipeJson) as SaveRecipeInput;
      file = (formData.get("file") as File | null) ?? null;
      fileName = (formData.get("fileName") as string | null) ?? file?.name;
    } else {
      recipeInput = (await request.json()) as SaveRecipeInput;
    }

    if (!recipeInput.title?.trim()) {
      return NextResponse.json({ error: "Recipe title required" }, { status: 400 });
    }

    const recipe = await saveRecipe(supabase, {
      familyId: family.familyId,
      userId: user.id,
      recipe: recipeInput,
      file,
      fileName,
    });

    return NextResponse.json({ recipe });
  } catch (error) {
    console.error("Save recipe error:", error);
    return NextResponse.json({ error: "Failed to save recipe" }, { status: 500 });
  }
}
