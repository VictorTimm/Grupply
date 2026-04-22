import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/env";
import { getSupabaseAdminConfigStatus, getSupabaseServiceRoleKey } from "@/lib/supabase/admin-config";

/** Server-only client that bypasses RLS. Required for register provisioning (org, members, profile). */
export function createSupabaseAdminClient() {
  const status = getSupabaseAdminConfigStatus();
  if (!status.ok) return null;

  const { url } = getSupabaseEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
