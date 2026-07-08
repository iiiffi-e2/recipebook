import { NextRequest, NextResponse } from "next/server";
import { searchRecipes } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";

  if (!query) {
    return NextResponse.json({ recipes: [], message: "Query required" });
  }

  const recipes = searchRecipes(query);

  return NextResponse.json({
    query,
    count: recipes.length,
    recipes: recipes.map((r) => ({
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
