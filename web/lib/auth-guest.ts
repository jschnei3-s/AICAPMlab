/**
 * When Supabase is not configured, the app runs in guest mode using Neon/Postgres only.
 * All data is scoped to this fixed guest user ID.
 */
export const GUEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Returns the current user ID for API routes.
 * When Supabase is not configured, returns GUEST_USER_ID so the app works with Neon only.
 */
export async function getRequestUserId(): Promise<string> {
  if (!isSupabaseConfigured()) {
    return GUEST_USER_ID;
  }
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? GUEST_USER_ID;
  } catch {
    return GUEST_USER_ID;
  }
}
