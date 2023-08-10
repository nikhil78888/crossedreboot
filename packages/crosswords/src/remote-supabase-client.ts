require("dotenv").config();

import { createClient } from "@supabase/supabase-js";
import { Database } from "types-and-validators";

export const remoteSupabaseClient = createClient<Database>(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);
