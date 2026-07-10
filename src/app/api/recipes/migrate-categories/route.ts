import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserFamily } from "@/lib/supabase/family";
import {
  fetchFamilyRecipes,
  migrateRecipeCategories,
} from "@/lib/supabase/recipes";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST() {
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

    const family = await getUserFamily(supabase, user.id);
    if (!family) {
      return NextResponse.json({ error: "No family found" }, { status: 404 });
    }

    const updated = await migrateRecipeCategories(supabase, family.familyId);
    const recipes = await fetchFamilyRecipes(supabase, family.familyId);

    return NextResponse.json({ updated, recipes });
  } catch (error) {
    console.error("Migrate categories error:", error);
    return NextResponse.json({ error: "Failed to migrate categories" }, { status: 500 });
  }
}
