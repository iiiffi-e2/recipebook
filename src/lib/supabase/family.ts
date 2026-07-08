import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityItem, FamilyMember } from "@/lib/types";

export interface UserFamily {
  familyId: string;
  role: "owner" | "editor" | "viewer";
  name: string;
  slug: string;
}

export interface FamilyInvite {
  id: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface InviteLookup {
  familyName: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  valid: boolean;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "my-family"
  );
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function ensureProfile(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<void> {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: email.toLowerCase(),
      display_name: displayNameFromEmail(email),
    },
    { onConflict: "id" }
  );

  if (error) {
    throw error;
  }
}

export async function getUserFamily(
  supabase: SupabaseClient,
  userId: string
): Promise<UserFamily | null> {
  const { data, error } = await supabase
    .from("family_members")
    .select("family_id, role, families(name, slug)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const familyData = data.families;
  const family = Array.isArray(familyData) ? familyData[0] : familyData;
  if (!family) {
    return null;
  }

  return {
    familyId: data.family_id,
    role: data.role,
    name: family.name,
    slug: family.slug,
  };
}

export async function ensureUserFamily(
  supabase: SupabaseClient,
  userId: string,
  familyName = "My Family Cookbook",
  email?: string
): Promise<UserFamily> {
  const existing = await getUserFamily(supabase, userId);
  if (existing) {
    return existing;
  }

  if (email) {
    await ensureProfile(supabase, userId, email);
  }

  const baseSlug = slugify(familyName);
  let slug = baseSlug;
  let attempt = 0;

  while (attempt < 5) {
    const familyId = crypto.randomUUID();

    const { error: familyError } = await supabase.from("families").insert({
      id: familyId,
      name: familyName,
      slug,
    });

    if (familyError) {
      if (familyError.code === "23505") {
        attempt += 1;
        slug = `${baseSlug}-${attempt}`;
        continue;
      }

      throw familyError;
    }

    const { error: memberError } = await supabase.from("family_members").insert({
      family_id: familyId,
      user_id: userId,
      role: "owner",
    });

    if (memberError) {
      throw memberError;
    }

    return {
      familyId,
      role: "owner",
      name: familyName,
      slug,
    };
  }

  throw new Error("Could not create a family cookbook");
}

export async function getFamilyMembers(
  supabase: SupabaseClient,
  familyId: string
): Promise<FamilyMember[]> {
  const { data: members, error } = await supabase
    .from("family_members")
    .select("id, role, recipes_contributed, joined_at, user_id")
    .eq("family_id", familyId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw error;
  }

  const userIds = (members ?? []).map((member) => member.user_id);
  const profilesById = new Map<string, { email: string; display_name: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", userIds);

    for (const profile of profiles ?? []) {
      profilesById.set(profile.id, profile);
    }
  }

  return (members ?? []).map((member) => {
    const profile = profilesById.get(member.user_id);
    const email = profile?.email ?? "member@family.com";
    const name = profile?.display_name ?? displayNameFromEmail(email);

    return {
      id: member.id,
      name,
      email,
      role: member.role,
      recipesContributed: member.recipes_contributed ?? 0,
      joinedAt: member.joined_at,
    };
  });
}

export async function getFamilyActivity(
  supabase: SupabaseClient,
  familyId: string
): Promise<ActivityItem[]> {
  const { data: items, error } = await supabase
    .from("activity")
    .select("id, type, title, description, created_at, user_id, recipe_id")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  const userIds = [...new Set((items ?? []).map((item) => item.user_id).filter(Boolean))];
  const profilesById = new Map<string, { email: string; display_name: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", userIds);

    for (const profile of profiles ?? []) {
      profilesById.set(profile.id, profile);
    }
  }

  return (items ?? []).map((item) => {
    const profile = item.user_id ? profilesById.get(item.user_id) : undefined;
    const author =
      profile?.display_name ??
      (profile?.email ? displayNameFromEmail(profile.email) : "Family member");

    return {
      id: item.id,
      type: item.type as ActivityItem["type"],
      title: item.title,
      description: item.description ?? "",
      author,
      timestamp: item.created_at,
      recipeId: item.recipe_id ?? undefined,
    };
  });
}

export async function getFamilyInvites(
  supabase: SupabaseClient,
  familyId: string
): Promise<FamilyInvite[]> {
  const { data, error } = await supabase
    .from("family_invites")
    .select("id, email, role, token, expires_at, created_at")
    .eq("family_id", familyId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    expiresAt: invite.expires_at,
    createdAt: invite.created_at,
  }));
}

export async function lookupInvite(
  supabase: SupabaseClient,
  token: string
): Promise<InviteLookup | null> {
  const { data, error } = await supabase.rpc("lookup_invite", {
    invite_token: token,
  });

  if (error || !data) {
    return null;
  }

  const info = data as {
    familyName?: string;
    email?: string;
    role?: "owner" | "editor" | "viewer";
    valid?: boolean;
  };

  if (!info.familyName || !info.email || !info.role) {
    return null;
  }

  return {
    familyName: info.familyName,
    email: info.email,
    role: info.role,
    valid: Boolean(info.valid),
  };
}

export async function createFamilyInvite(
  supabase: SupabaseClient,
  familyId: string,
  invitedBy: string,
  email: string,
  role: "editor" | "viewer" = "viewer"
): Promise<{ invite: FamilyInvite; inviteUrl: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  const members = await getFamilyMembers(supabase, familyId);
  if (members.some((member) => member.email.toLowerCase() === normalizedEmail)) {
    throw new Error("This person is already a family member");
  }

  const { data: pendingInvite } = await supabase
    .from("family_invites")
    .select("id")
    .eq("family_id", familyId)
    .eq("email", normalizedEmail)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (pendingInvite) {
    throw new Error("An invite is already pending for this email");
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("family_invites")
    .insert({
      family_id: familyId,
      email: normalizedEmail,
      role,
      token,
      invited_by: invitedBy,
      expires_at: expiresAt,
    })
    .select("id, email, role, token, expires_at, created_at")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to create invite");
  }

  const invite: FamilyInvite = {
    id: data.id,
    email: data.email,
    role: data.role,
    token: data.token,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
  };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/signup?invite=${token}`;

  return { invite, inviteUrl };
}

export async function acceptFamilyInvite(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  token: string
): Promise<UserFamily> {
  await ensureProfile(supabase, userId, userEmail);

  const existingFamily = await getUserFamily(supabase, userId);
  if (existingFamily) {
    throw new Error("You already belong to a family cookbook");
  }

  const inviteInfo = await lookupInvite(supabase, token);
  if (!inviteInfo?.valid) {
    throw new Error("This invite is invalid or has expired");
  }

  if (userEmail.toLowerCase() !== inviteInfo.email.toLowerCase()) {
    throw new Error("Sign in with the email address that received the invite");
  }

  const { data: invite, error: inviteError } = await supabase
    .from("family_invites")
    .select("id, family_id, role")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (inviteError || !invite) {
    throw new Error("This invite is invalid or has expired");
  }

  const { data: familyRow } = await supabase
    .from("families")
    .select("name, slug")
    .eq("id", invite.family_id)
    .maybeSingle();

  const { error: memberError } = await supabase.from("family_members").insert({
    family_id: invite.family_id,
    user_id: userId,
    role: invite.role,
  });

  if (memberError) {
    throw memberError;
  }

  await supabase
    .from("family_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  await supabase.from("activity").insert({
    family_id: invite.family_id,
    user_id: userId,
    type: "member_joined",
    title: `${displayNameFromEmail(userEmail)} joined the family`,
    description: `Welcome to ${familyRow?.name ?? "the family cookbook"}!`,
  });

  return {
    familyId: invite.family_id,
    role: invite.role,
    name: familyRow?.name ?? "Family Cookbook",
    slug: familyRow?.slug ?? "family",
  };
}
