import { getSupabaseEnv } from "@/lib/env";

export type SupabaseAdminConfigCode =
  | "ok"
  | "missing_service_role_key"
  | "invalid_public_supabase_env"
  | "invalid_service_role_token"
  | "unexpected_service_role"
  | "service_role_project_mismatch";

export type SupabaseAdminConfigStatus = {
  ok: boolean;
  code: SupabaseAdminConfigCode;
  message: string;
  role: string | null;
  serviceRef: string | null;
  urlRef: string | null;
};

function decodeJwtPayload(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractProjectRef(url: string) {
  try {
    return new URL(url).host.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

function normalizeEnvToken(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const unquoted = trimmed.slice(1, -1).trim();
    return unquoted || null;
  }

  return trimmed;
}

export function getSupabaseServiceRoleKey() {
  return normalizeEnvToken(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdminConfigStatus(): SupabaseAdminConfigStatus {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) {
    return {
      ok: false,
      code: "missing_service_role_key",
      message:
        "Missing SUPABASE_SERVICE_ROLE_KEY. Registration provisioning uses the service role after sign-up.",
      role: null,
      serviceRef: null,
      urlRef: null,
    };
  }

  let urlRef: string | null = null;
  try {
    urlRef = extractProjectRef(getSupabaseEnv().url);
  } catch {
    return {
      ok: false,
      code: "invalid_public_supabase_env",
      message:
        "Invalid NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Fix the public Supabase env before using the admin client.",
      role: null,
      serviceRef: null,
      urlRef: null,
    };
  }

  const payload = decodeJwtPayload(serviceRoleKey);
  if (!payload) {
    return {
      ok: false,
      code: "invalid_service_role_token",
      message: "SUPABASE_SERVICE_ROLE_KEY is not a valid JWT.",
      role: null,
      serviceRef: null,
      urlRef,
    };
  }

  const role = typeof payload.role === "string" ? payload.role : null;
  const serviceRef = typeof payload.ref === "string" ? payload.ref : null;
  if (role !== "service_role") {
    return {
      ok: false,
      code: "unexpected_service_role",
      message: "SUPABASE_SERVICE_ROLE_KEY does not carry the service_role claim.",
      role,
      serviceRef,
      urlRef,
    };
  }

  if (!serviceRef || !urlRef || serviceRef !== urlRef) {
    return {
      ok: false,
      code: "service_role_project_mismatch",
      message:
        "SUPABASE_SERVICE_ROLE_KEY does not match NEXT_PUBLIC_SUPABASE_URL. They must point to the same Supabase project.",
      role,
      serviceRef,
      urlRef,
    };
  }

  return {
    ok: true,
    code: "ok",
    message: "Supabase admin config looks valid.",
    role,
    serviceRef,
    urlRef,
  };
}
