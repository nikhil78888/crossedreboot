// EXPO_PUBLIC_* vars are inlined into the JS bundle at BUILD time.
// In EAS builds they come from the matching profile's `env` block in eas.json
// (NOT from the gitignored .env, which EAS never sees). If they're missing,
// fail loudly with a clear message instead of crashing deep inside the
// Supabase client — that turned an opaque App Store crash into a 2-day hunt.
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[crossed] Missing required env var ${name}. ` +
        `Add it to the matching profile's "env" block in eas.json (production/preview), ` +
        `then rebuild — EXPO_PUBLIC_* vars are baked in at build time.`,
    );
  }
  return value;
}

export const mobileConfig = {
  apiBaseUrl: required("EXPO_PUBLIC_API_BASE_URL", process.env.EXPO_PUBLIC_API_BASE_URL),
  supabaseUrl: required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required("EXPO_PUBLIC_SUPABASE_ANON_KEY", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
};
