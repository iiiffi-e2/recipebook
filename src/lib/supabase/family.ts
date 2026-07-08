import type { SupabaseClient } from "@supabase/supabase-js";

export interface UserFamily {
  familyId: string;
  role: "owner" | "editor" | "viewer";
  name: string;
  slug: string;
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
  familyName = "My Family Cookbook"
): Promise<UserFamily> {
  const existing = await getUserFamily(supabase, userId);
  if (existing) {
    return existing;
  }

  const baseSlug = slugify(familyName);
  let slug = baseSlug;
  let attempt = 0;

  while (attempt < 5) {
    const { data: family, error: familyError } = await supabase
      .from("families")
      .insert({
        name: familyName,
        slug,
      })
      .select("id, name, slug")
      .single();

    if (family && !familyError) {
      const { error: memberError } = await supabase.from("family_members").insert({
        family_id: family.id,
        user_id: userId,
        role: "owner",
      });

      if (memberError) {
        throw memberError;
      }

      return {
        familyId: family.id,
        role: "owner",
        name: family.name,
        slug: family.slug,
      };
    }

    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  throw new Error("Could not create a family cookbook");
}
