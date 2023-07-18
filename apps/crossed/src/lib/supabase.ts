import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
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

const supabaseUrl = "https://sialrdtoaqrhvcojwojf.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYWxyZHRvYXFyaHZjb2p3b2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODg1NjMyNDcsImV4cCI6MjAwNDEzOTI0N30.OUS-Ul8s41wuKG7C_ARb1jGFjzoQJxRFV0BnZPnLM3k";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      apikey: supabaseAnonKey,
    },
  },
});

export const setSupabaseToken = (token: string) => {
  if (!supabase) {
    throw new Error("Supabase not initialized");
  }
  supabase.headers.Authorization = `Bearer ${token}`;
  supabase.auth.headers.Authorization = `Bearer ${token}`;
  supabase.rest.headers.Authorization = `Bearer ${token}`;
  supabase.realtime.setAuth(token);
};
