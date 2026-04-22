import { createClient } from "@supabase/supabase-js";

// Skapa och exportera supabase-klienten
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);