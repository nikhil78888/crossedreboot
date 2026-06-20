// Parse the Firebase service account from env. Accepts either raw JSON
// (starts with "{") or base64-encoded JSON. Base64 is preferred for hosting
// (e.g. Railway), because raw JSON values get mangled — Railway's env editor
// strips the quotes, producing `{type:...}` which fails JSON.parse.
function parseServiceAccount(value: string | undefined): Record<string, unknown> {
  if (!value || !value.trim()) return {};
  const trimmed = value.trim();
  const json = trimmed.startsWith("{")
    ? trimmed
    : Buffer.from(trimmed, "base64").toString("utf8");
  return JSON.parse(json);
}

export const apiConfig = {
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET as string,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  supabaseUrl: process.env.SUPABASE_URL as string,
  firebaseServiceAccount: parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT),
  openAIApiKey: process.env.OPENAI_API_KEY as string,
};
