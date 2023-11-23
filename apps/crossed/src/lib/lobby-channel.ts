import { supabase } from "./supabase";

const channel = supabase.channel("online-status");
channel.subscribe();

export { channel };
