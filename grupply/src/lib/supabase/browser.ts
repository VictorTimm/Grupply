import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const env = getSupabaseEnv();
  return createBrowserClient(
    env.url,
    env.anonKey,
  );
}

