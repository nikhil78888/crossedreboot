import { createClient } from "@supabase/supabase-js";
import { Database } from "types-and-validators";

export const remoteSupabaseClient = createClient<Database>(
  "https://sialrdtoaqrhvcojwojf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYWxyZHRvYXFyaHZjb2p3b2pmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4ODU2MzI0NywiZXhwIjoyMDA0MTM5MjQ3fQ.dkOWB37dWS6pxqmuvkC_QyCnsRI8-PxXDKRm2fRn3eU",
  { auth: { persistSession: false } }
);
