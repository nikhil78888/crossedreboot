import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xhwiggutcsuzoczfensg.supabase.co";
const supabaseServiceRoleKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhod2lnZ3V0Y3N1em9jemZlbnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4NjAzNjE3NCwiZXhwIjoyMDAxNjEyMTc0fQ.SN54xZ8jBKUfXMJ-b7myqC0FWBCx4Mc51dfgQyF8XF0";

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});
