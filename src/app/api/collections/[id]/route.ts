import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserFamily } from "@/lib/supabase/family";
import { deleteCollection, updateCollection } from "@/lib/supabase/collections";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  try {
    const { id } = await params;
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

    const body = (await request.json()) as { name?: string; description?: string };
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Collection name required" }, { status: 400 });
    }

    const collection = await updateCollection(supabase, id, family.familyId, {
      name,
      description: body.description,
    });

    return NextResponse.json({ collection });
  } catch (error) {
    console.error("Update collection error:", error);
    return NextResponse.json({ error: "Failed to update collection" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  try {
    const { id } = await params;
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

    await deleteCollection(supabase, id, family.familyId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete collection error:", error);
    return NextResponse.json({ error: "Failed to delete collection" }, { status: 500 });
  }
}
