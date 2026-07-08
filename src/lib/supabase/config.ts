export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export const RECIPE_UPLOADS_BUCKET = "recipe-uploads";

export const DEFAULT_RECIPE_HERO =
  "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1200&h=800&fit=crop";
