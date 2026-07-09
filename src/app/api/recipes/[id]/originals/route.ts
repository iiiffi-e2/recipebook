import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserFamily } from "@/lib/supabase/family";
import { appendRecipeOriginals, type UploadedOriginalInput } from "@/lib/supabase/recipes";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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

    const contentType = request.headers.get("content-type") ?? "";
    let files: File[] = [];
    let uploadedOriginals: UploadedOriginalInput[] | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      files = formData.getAll("file").filter((v): v is File => v instanceof File);
      if (files.length === 0) {
        return NextResponse.json({ error: "No files provided" }, { status: 400 });
      }
    } else {
      const body = (await request.json()) as { uploadedOriginals?: unknown };
      if (!Array.isArray(body.uploadedOriginals) || !body.uploadedOriginals.every(isUploadedOriginal)) {
        return NextResponse.json({ error: "uploadedOriginals required" }, { status: 400 });
      }
      uploadedOriginals = body.uploadedOriginals;
    }

    await appendRecipeOriginals(supabase, {
      familyId: family.familyId,
      recipeId,
      files,
      uploadedOriginals,
    });

    return NextResponse.json({
      ok: true,
      recipeId,
      count: uploadedOriginals?.length ?? files.length,
    });
  } catch (error) {
    console.error("Append originals error:", error);
    return NextResponse.json({ error: "Failed to attach images" }, { status: 500 });
  }
}
