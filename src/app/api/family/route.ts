import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserFamily, getUserFamily } from "@/lib/supabase/family";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, family: null });
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
    return NextResponse.json({ family, user: { email: user.email } });
  } catch (error) {
    console.error("Fetch family error:", error);
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
    const family = await ensureUserFamily(
      supabase,
      user.id,
      body.familyName?.trim() || "My Family Cookbook"
    );

    return NextResponse.json({ family });
  } catch (error) {
    console.error("Bootstrap family error:", error);
    return NextResponse.json({ error: "Failed to create family" }, { status: 500 });
  }
}
