export const apiConfig = {
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET as string,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  supabaseUrl: process.env.SUPABASE_URL as string,
  firebaseServiceAccount: JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT || "{}"
  ),
  openAIApiKey: process.env.OPENAI_API_KEY as string,
};
