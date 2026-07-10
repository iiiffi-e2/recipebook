import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { acceptFamilyInvite } from "@/lib/supabase/family";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim();

    if (!token) {
      return NextResponse.json({ error: "Invite token is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server is missing Supabase service role configuration" },
        { status: 503 }
      );
    }

    const family = await acceptFamilyInvite(admin, user.id, user.email, token);
    return NextResponse.json({ family });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to accept invite";
    console.error("Accept invite error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
