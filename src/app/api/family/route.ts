import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ensureProfile,
  ensureUserFamily,
  getFamilyActivity,
  getFamilyMembers,
  getUserFamily,
} from "@/lib/supabase/family";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, members: [], activity: [] });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.email) {
      await ensureProfile(supabase, user.id, user.email);
    }

    const family = await getUserFamily(supabase, user.id);
    if (!family) {
      return NextResponse.json({ family: null, members: [], activity: [], recipeCount: 0 });
    }

    const [members, activity] = await Promise.all([
      getFamilyMembers(supabase, family.familyId),
      getFamilyActivity(supabase, family.familyId),
    ]);

    const { count } = await supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("family_id", family.familyId);

    return NextResponse.json({
      family,
      members,
      activity,
      recipeCount: count ?? 0,
    });
  } catch (error) {
    console.error("Fetch family members error:", error);
    return NextResponse.json({ error: "Failed to load family" }, { status: 500 });
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

    const body = (await request.json().catch(() => ({}))) as { familyName?: string };
    const admin = createAdminClient();
    const db = admin ?? supabase;
    const family = await ensureUserFamily(
      db,
      user.id,
      body.familyName?.trim() || "My Family Cookbook",
      user.email ?? undefined
    );

    return NextResponse.json({ family });
  } catch (error) {
    console.error("Bootstrap family error:", error);
    return NextResponse.json({ error: "Failed to create family" }, { status: 500 });
  }
}
