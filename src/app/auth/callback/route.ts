import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { acceptFamilyInvite, ensureProfile, ensureUserFamily } from "@/lib/supabase/family";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const inviteToken = searchParams.get("invite");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        const admin = createAdminClient();

        if (inviteToken) {
          if (!admin) {
            console.error(
              "Accept invite on callback failed: missing SUPABASE_SERVICE_ROLE_KEY"
            );
          } else {
            try {
              await acceptFamilyInvite(admin, user.id, user.email, inviteToken);
            } catch (inviteError) {
              console.error("Accept invite on callback failed:", inviteError);
            }
          }
        } else {
          await ensureProfile(supabase, user.id, user.email);
          await ensureUserFamily(supabase, user.id, "My Family Cookbook", user.email);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}
