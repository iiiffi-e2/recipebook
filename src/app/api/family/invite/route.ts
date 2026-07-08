import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createFamilyInvite,
  getFamilyInvites,
  getUserFamily,
} from "@/lib/supabase/family";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, invites: [] });
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
    if (!family || family.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invites = await getFamilyInvites(supabase, family.familyId);
    return NextResponse.json({ invites });
  } catch (error) {
    console.error("Fetch invites error:", error);
    return NextResponse.json({ error: "Failed to load invites" }, { status: 500 });
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

    const family = await getUserFamily(supabase, user.id);
    if (!family || family.role !== "owner") {
      return NextResponse.json({ error: "Only family owners can send invites" }, { status: 403 });
    }

    const body = (await request.json()) as { email?: string; role?: "editor" | "viewer" };
    const email = body.email?.trim();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const role = body.role === "editor" ? "editor" : "viewer";
    const { invite, inviteUrl } = await createFamilyInvite(
      supabase,
      family.familyId,
      user.id,
      email,
      role
    );

    const admin = createAdminClient();
    if (admin) {
      const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback?invite=${invite.token}`;
      await admin.auth.admin.inviteUserByEmail(email, { redirectTo }).catch((err) => {
        console.warn("Supabase email invite failed, share link instead:", err.message);
      });
    }

    return NextResponse.json({ invite, inviteUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create invite";
    console.error("Create invite error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
