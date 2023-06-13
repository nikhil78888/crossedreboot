import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { Database } from "types-and-validators";

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = "https://xhwiggutcsuzoczfensg.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhod2lnZ3V0Y3N1em9jemZlbnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODYwMzYxNzQsImV4cCI6MjAwMTYxMjE3NH0.b-cExt8xAEFpRlo3EV7LGZlciTuzCbB1MlePrH8t03w";

let supabase: SupabaseClient<Database> | null = null;

export const getSupabase = (authToken?: string) => {
  if (supabase) {
    return supabase;
  }
  if (!authToken) {
    throw new Error("Attempted to initialise supabase without token");
  }
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: ExpoSecureStoreAdapter as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
    realtime: {
      headers: {
        apikey: `Bearer ${authToken}`,
      },
      params: {
        apikey: supabaseAnonKey,
      },
    },
  });

  supabase.realtime.setAuth(authToken);
  return supabase;
};
