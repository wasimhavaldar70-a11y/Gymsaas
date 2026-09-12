import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

const supabaseUrl = config.SUPABASE_URL || config.NEXT_PUBLIC_SUPABASE_URL || "https://wfqdofwydnmaadtrzude.supabase.co";
const supabaseAnonKey = config.SUPABASE_ANON_KEY || config.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceKey = config.SUPABASE_SERVICE_ROLE_KEY;

// Supabase Admin Client (Service Role) - Runs backend database operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
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
    supabaseUrl,
    supabaseAnonKey,
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
