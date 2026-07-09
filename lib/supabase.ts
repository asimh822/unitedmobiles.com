import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * While .env.local still holds placeholder values the app runs entirely on
 * built-in seed data so every page can be developed and demoed without a
 * Supabase project.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(url) && Boolean(anonKey) && !url.includes("placeholder");
}

let anonClient: SupabaseClient | null = null;

/** Read-only client for public catalog queries (server components). */
export function getSupabase(): SupabaseClient {
  if (!anonClient) anonClient = createClient(url, anonKey);
  return anonClient;
}

/** Service-role client for admin mutations. Server-side only. */
export function getSupabaseAdmin(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
