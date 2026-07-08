import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lookupInvite } from "@/lib/supabase/family";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, invite: null });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const invite = await lookupInvite(supabase, token);
    return NextResponse.json({ invite });
  } catch (error) {
    console.error("Lookup invite error:", error);
    return NextResponse.json({ error: "Failed to look up invite" }, { status: 500 });
  }
}
