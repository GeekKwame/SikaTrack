import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../env";

let client: SupabaseClient | null = null;

/**
 * Returns the Supabase browser client, or null if the app is in offline (local-only) mode.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
