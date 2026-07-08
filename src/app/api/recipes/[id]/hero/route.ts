import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserFamily } from "@/lib/supabase/family";
import { fetchRecipeById, updateRecipeHeroImage } from "@/lib/supabase/recipes";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(
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
    if (!family || family.role === "viewer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const recipe = await fetchRecipeById(supabase, recipeId);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    let file: File | null = null;
    let imageData: string | null = null;
    let source: "upload" | "generated" = "upload";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      file = (formData.get("file") as File | null) ?? null;
      const sourceValue = formData.get("source");
      if (sourceValue === "generated") {
        source = "generated";
      }
    } else {
      const body = (await request.json()) as {
        imageData?: string;
        source?: "upload" | "generated";
      };
      imageData = body.imageData ?? null;
      if (body.source === "generated") {
        source = "generated";
      }
    }

    const result = await updateRecipeHeroImage(supabase, {
      familyId: family.familyId,
      recipeId,
      file,
      imageData,
      source,
    });

    return NextResponse.json({
      success: true,
      heroImage: result.heroImage,
      storagePath: result.storagePath,
    });
  } catch (error) {
    console.error("Save hero image error:", error);

    const message =
      error instanceof Error && error.message.includes("Bucket not found")
        ? "Storage bucket missing. Run supabase/storage.sql in your Supabase SQL editor."
        : "Failed to save hero image";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
