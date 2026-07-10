import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserFamily, getUserFamily } from "@/lib/supabase/family";
import {
  fetchFamilyRecipes,
  migrateRecipeCategories,
  saveRecipe,
  type SaveRecipeInput,
  type UploadedOriginalInput,
} from "@/lib/supabase/recipes";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type SaveRecipeJsonBody = SaveRecipeInput & {
  recipeId?: string;
  fileName?: string;
  uploadedOriginals?: UploadedOriginalInput[];
  heroStoragePath?: string | null;
};

function isUploadedOriginal(value: unknown): value is UploadedOriginalInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.storagePath === "string" &&
    typeof item.fileName === "string" &&
    typeof item.fileSize === "number" &&
    (item.type === "image" || item.type === "pdf" || item.type === "document")
  );
}

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

    await migrateRecipeCategories(supabase, family.familyId);
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
    let files: File[] = [];
    let fileName: string | undefined;
    let heroFile: File | undefined;
    let recipeId: string | undefined;
    let uploadedOriginals: UploadedOriginalInput[] | undefined;
    let heroStoragePath: string | null | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const recipeJson = formData.get("recipe");

      if (typeof recipeJson !== "string") {
        return NextResponse.json({ error: "Recipe payload required" }, { status: 400 });
      }

      recipeInput = JSON.parse(recipeJson) as SaveRecipeInput;
      files = formData.getAll("file").filter((v): v is File => v instanceof File);
      fileName = (formData.get("fileName") as string | null) ?? files[0]?.name;
      const hero = formData.get("heroFile");
      if (hero instanceof File && hero.size > 0) {
        heroFile = hero;
      }
    } else {
      const body = (await request.json()) as SaveRecipeJsonBody;
      const {
        recipeId: bodyRecipeId,
        fileName: bodyFileName,
        uploadedOriginals: bodyOriginals,
        heroStoragePath: bodyHeroPath,
        ...rest
      } = body;

      recipeInput = rest;
      recipeId = typeof bodyRecipeId === "string" ? bodyRecipeId : undefined;
      fileName = typeof bodyFileName === "string" ? bodyFileName : undefined;
      heroStoragePath = typeof bodyHeroPath === "string" ? bodyHeroPath : bodyHeroPath === null ? null : undefined;
      if (Array.isArray(bodyOriginals) && bodyOriginals.every(isUploadedOriginal)) {
        uploadedOriginals = bodyOriginals;
      } else if (bodyOriginals != null) {
        return NextResponse.json({ error: "Invalid uploadedOriginals" }, { status: 400 });
      }
    }

    if (!recipeInput.title?.trim()) {
      return NextResponse.json({ error: "Recipe title required" }, { status: 400 });
    }

    const recipe = await saveRecipe(supabase, {
      familyId: family.familyId,
      userId: user.id,
      recipe: recipeInput,
      files,
      fileName,
      heroFile,
      recipeId,
      uploadedOriginals,
      heroStoragePath,
    });

    return NextResponse.json({ recipe });
  } catch (error) {
    console.error("Save recipe error:", error);
    return NextResponse.json({ error: "Failed to save recipe" }, { status: 500 });
  }
}
