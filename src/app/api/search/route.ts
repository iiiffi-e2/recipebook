import { NextRequest, NextResponse } from "next/server";
import { searchRecipes } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { getUserFamily } from "@/lib/supabase/family";
import { fetchFamilyRecipes } from "@/lib/supabase/recipes";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";

  if (!query) {
    return NextResponse.json({ recipes: [], message: "Query required" });
  }

  let recipes: Awaited<ReturnType<typeof fetchFamilyRecipes>> = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const family = await getUserFamily(supabase, user.id);
        if (family) {
          recipes = await fetchFamilyRecipes(supabase, family.familyId);
        }
      }
    } catch (error) {
      console.error("Search recipes error:", error);
    }
  }

  const results = searchRecipes(query, recipes);

  return NextResponse.json({
    query,
    count: results.length,
    recipes: results.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      tags: r.tags,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      heroImage: r.heroImage,
      familyMember: r.source.familyMember,
    })),
  });
}
