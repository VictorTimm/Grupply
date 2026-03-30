import { z } from "zod";

const supabaseEnvSchema = z.object({
  url: z.string().url(),
  anonKey: z.string().min(1),
});

export function getSupabaseEnv() {
  // Lazy validation so builds don't fail without local env vars.
  return supabaseEnvSchema.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

