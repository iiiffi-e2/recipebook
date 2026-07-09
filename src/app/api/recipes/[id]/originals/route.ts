import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserFamily } from "@/lib/supabase/family";
import { appendRecipeOriginals } from "@/lib/supabase/recipes";
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
    if (!family) {
      return NextResponse.json({ error: "No family" }, { status: 400 });
    }

    const formData = await request.formData();
    const files = formData.getAll("file").filter((v): v is File => v instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    await appendRecipeOriginals(supabase, {
      familyId: family.familyId,
      recipeId,
      files,
    });

    return NextResponse.json({ ok: true, recipeId, count: files.length });
  } catch (error) {
    console.error("Append originals error:", error);
    return NextResponse.json({ error: "Failed to attach images" }, { status: 500 });
  }
}
