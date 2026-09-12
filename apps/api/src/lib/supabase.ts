import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

// Supabase Admin Client (Service Role) - Runs backend database operations
export const supabaseAdmin = createClient(
  config.NEXT_PUBLIC_SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Client created with user JWT to enforce RLS in database session
export function createScopedClient(userAccessToken: string) {
  return createClient(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${userAccessToken}`
        }
      },
      auth: {
        persistSession: false
      }
    }
  );
}
