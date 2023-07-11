import { createClient } from "@supabase/supabase-js";
import { Database } from "types-and-validators";
import { apiConfig } from "../api-config";

export const supabase = createClient<Database>(
  apiConfig.supabaseUrl,
  apiConfig.supabaseServiceRoleKey,
  {
    auth: { persistSession: false },
  }
);
