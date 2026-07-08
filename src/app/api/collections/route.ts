import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserFamily, getUserFamily } from "@/lib/supabase/family";
import { createCollection, fetchFamilyCollections } from "@/lib/supabase/collections";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ collections: [], configured: false });
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
      return NextResponse.json({ collections: [] });
    }

    const collections = await fetchFamilyCollections(supabase, family.familyId);
    return NextResponse.json({ collections });
  } catch (error) {
    console.error("Fetch collections error:", error);
    return NextResponse.json({ error: "Failed to load collections" }, { status: 500 });
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

    const body = (await request.json()) as { name?: string; description?: string };
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Collection name required" }, { status: 400 });
    }

    const family = await ensureUserFamily(supabase, user.id);
    const collection = await createCollection(supabase, {
      familyId: family.familyId,
      userId: user.id,
      name,
      description: body.description,
    });

    return NextResponse.json({ collection });
  } catch (error) {
    console.error("Create collection error:", error);
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 });
  }
}
