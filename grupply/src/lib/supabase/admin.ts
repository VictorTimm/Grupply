import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/env";
import { getSupabaseAdminConfigStatus } from "@/lib/supabase/admin-config";

/** Server-only client that bypasses RLS. Required for register provisioning (org, members, profile). */
export function createSupabaseAdminClient() {
  const status = getSupabaseAdminConfigStatus();
  if (!status.ok) return null;

  const { url } = getSupabaseEnv();
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
