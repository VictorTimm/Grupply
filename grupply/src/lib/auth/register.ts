import type { SupabaseAdminConfigStatus } from "@/lib/supabase/admin-config";

export type RegisterFlowMode = "join" | "new";

export type RegisterFormValues = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  joinCode: string;
  biography: string;
  hobbyNames: string[];
  flow: RegisterFlowMode;
};

type SupabaseLikeError = {
  message: string;
  code?: string | null;
};

export function parseRegisterForm(formData: FormData): RegisterFormValues {
  const flow = String(formData.get("_flow") ?? "").trim() === "new" ? "new" : "join";
  const hobbiesRaw = String(formData.get("hobbies") ?? "").trim();

  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    firstName: String(formData.get("first_name") ?? "").trim(),
    lastName: String(formData.get("last_name") ?? "").trim(),
    organizationName: String(formData.get("organization_name") ?? "").trim(),
    joinCode: String(formData.get("join_code") ?? "").trim(),
    biography: String(formData.get("biography") ?? "").trim(),
    hobbyNames: hobbiesRaw
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean)
      .slice(0, 20),
    flow,
  };
}

export function registerErrorPath(message: string, flow: RegisterFlowMode) {
  const p = new URLSearchParams();
  p.set("error", message);
  if (flow === "new") p.set("flow", "new");
  return `/register?${p.toString()}`;
}

export function mapAdminConfigError(status: SupabaseAdminConfigStatus) {
  switch (status.code) {
    case "missing_service_role_key":
      return "Missing SUPABASE_SERVICE_ROLE_KEY in grupply/.env.local. Restart the dev server after updating it.";
    case "invalid_public_supabase_env":
      return "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is invalid. Fix the local Supabase env and restart the dev server.";
    case "invalid_service_role_token":
      return "SUPABASE_SERVICE_ROLE_KEY is not a valid Supabase JWT. Paste the service_role key from Supabase Project Settings -> API and restart the dev server.";
    case "unexpected_service_role":
      return "SUPABASE_SERVICE_ROLE_KEY does not contain the service_role claim. Make sure you pasted the service_role key, not the anon key.";
    case "service_role_project_mismatch":
      return "SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL point to different Supabase projects. Use keys from the same project and restart the dev server.";
    default:
      return "Supabase admin configuration is invalid. Check your local env and restart the dev server.";
  }
}

export function mapSignUpErrorMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("email rate limit") || lower.includes("over_email_send_rate_limit")) {
    return "Email rate limit exceeded: Supabase only allows a limited number of auth emails per hour. Wait and try again, or for local testing turn off Confirm email under Supabase -> Authentication -> Providers -> Email.";
  }

  if (lower.includes("user already registered")) {
    return "This email already has an auth account. If a previous signup failed before finishing organization setup, delete the partial user or log in and complete recovery first.";
  }

  return message;
}

export function mapProvisioningError(error: SupabaseLikeError) {
  const message = error.message ?? "";
  const lower = message.toLowerCase();
  const code = error.code ?? "";

  if (
    code === "PGRST202" ||
    /provision_registration/i.test(message) ||
    /function .* does not exist/i.test(message)
  ) {
    return "This project is missing the registration provisioning function. Apply the latest Supabase migrations and try again.";
  }

  if (/invalid_join_code/.test(lower)) {
    return "Invalid or unknown invite code. Check with your admin, or create a new company instead.";
  }

  if (/registration_flow_invalid/.test(lower)) {
    return "Choose either an invite code or a new organization name before submitting.";
  }

  if (/profile_exists_in_other_org/.test(lower)) {
    return "This account is already linked to a different organization. Log in with that account or delete the partial test user before retrying.";
  }

  if (
    /jwt/.test(lower) ||
    /invalid signature/.test(lower) ||
    /invalid token/.test(lower) ||
    /unauthorized/.test(lower) ||
    /forbidden/.test(lower) ||
    code === "401"
  ) {
    return "Signup could not finish because the server admin connection to Supabase is invalid. Re-check SUPABASE_SERVICE_ROLE_KEY and restart the dev server.";
  }

  return "We created the auth user, but could not finish organization setup. Check the server logs for the failing provisioning step, then either recover or delete the partial user before retrying.";
}

export function registrationRecoveryPath(flow: RegisterFlowMode) {
  return registerErrorPath(
    "Your account exists, but setup did not finish. Continue registration with your invite code or create a new company to complete onboarding.",
    flow,
  );
}

export function logRegistrationEvent(
  level: "info" | "error",
  stage: string,
  meta: Record<string, unknown>,
) {
  const logger = level === "error" ? console.error : console.info;
  logger("[register]", JSON.stringify({ stage, ...meta }));
}
