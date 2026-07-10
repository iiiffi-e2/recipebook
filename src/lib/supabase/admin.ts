import { createClient } from "@supabase/supabase-js";

/** Strip accidental extra lines pasted into a single env var value. */
export function getServiceRoleKey(): string | undefined {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw) {
    return undefined;
  }

  const firstLine = raw.trim().split(/[\r\n]/)[0]?.trim();
  if (!firstLine) {
    return undefined;
  }

  // Handle accidental "KEY=value" paste into the value field.
  const eqIndex = firstLine.indexOf("=");
  if (eqIndex > 0 && firstLine.slice(0, eqIndex).includes("SUPABASE")) {
    return firstLine.slice(eqIndex + 1).trim() || undefined;
  }

  return firstLine;
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = getServiceRoleKey();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
