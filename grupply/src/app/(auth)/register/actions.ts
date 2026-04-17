"use server";

import { redirect } from "next/navigation";

import { getAppOrigin } from "@/lib/app-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function registerErrorPath(message: string, flow?: string) {
  const p = new URLSearchParams();
  p.set("error", message);
  if (flow === "new") p.set("flow", "new");
  return `/register?${p.toString()}`;
}

export async function registerAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const organization_name = String(formData.get("organization_name") ?? "").trim();
  const join_code = String(formData.get("join_code") ?? "").trim();
  const biography = String(formData.get("biography") ?? "").trim();
  const registerFlow = String(formData.get("_flow") ?? "").trim();

  const hobbiesRaw = String(formData.get("hobbies") ?? "").trim();
  const hobbyNames = hobbiesRaw
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (join_code && organization_name) {
    redirect(
      registerErrorPath(
        "Use either an invite code or a new organization name — not both.",
        registerFlow === "new" ? "new" : undefined,
      ),
    );
  }
  if (!join_code && !organization_name) {
    redirect(
      registerErrorPath(
        registerFlow === "new"
          ? "Enter an organization name to create your company space."
          : "Enter your invite code from your company admin, or choose “Create a new company instead”.",
        registerFlow === "new" ? "new" : undefined,
      ),
    );
  }

  const appOrigin = await getAppOrigin();
  const verifyRedirectUrl = new URL("/auth/callback", appOrigin);
  verifyRedirectUrl.searchParams.set("next", "/login?verified=1");

  const supabase = await createSupabaseServerClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: verifyRedirectUrl.toString(),
    },
  });

  if (signUpError) {
    let message = signUpError.message;
    const lower = message.toLowerCase();
    if (lower.includes("email rate limit") || lower.includes("over_email_send_rate_limit")) {
      message =
        "Email rate limit exceeded: Supabase only allows a limited number of auth emails per hour. Wait and try again, or for local testing turn off “Confirm email” under Supabase → Authentication → Providers → Email.";
    }
    redirect(registerErrorPath(message, registerFlow === "new" ? "new" : undefined));
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    redirect(registerErrorPath("Missing user id.", registerFlow === "new" ? "new" : undefined));
  }

  const hasSession = Boolean(signUpData.session);
  const admin = createSupabaseAdminClient();
  if (!admin) {
    redirect(
      registerErrorPath(
        "Missing SUPABASE_SERVICE_ROLE_KEY in grupply/.env.local. Signup uses the service role to create your organization and profile reliably (Supabase → Project Settings → API → service_role). Restart the dev server after adding it.",
        registerFlow === "new" ? "new" : undefined,
      ),
    );
  }

  const db = admin;

  let organization_id: string;

  if (join_code) {
    const { data: resolvedOrgId, error: resolveErr } = await db.rpc("resolve_org_id_by_join_code", {
      p_code: join_code,
    });
    if (resolveErr) {
      let msg = resolveErr.message;
      const code = resolveErr.code ?? "";
      if (
        code === "PGRST202" ||
        /resolve_org_id_by_join_code/i.test(msg) ||
        /function .* does not exist/i.test(msg)
      ) {
        msg =
          "This project’s database is missing resolve_org_id_by_join_code. Apply supabase/migrations/0016_resolve_org_id_by_join_code.sql to your Supabase project (for example supabase db push), then try again.";
      }
      redirect(registerErrorPath(msg, registerFlow === "new" ? "new" : undefined));
    }
    if (!resolvedOrgId) {
      redirect(
        registerErrorPath(
          "Invalid or unknown invite code. Check with your admin, or create a new company instead.",
          registerFlow === "new" ? "new" : undefined,
        ),
      );
    }
    organization_id = resolvedOrgId as string;

    const { error: memberError } = await db.from("organization_members").insert({
      organization_id,
      user_id: userId,
      member_role: "member",
    });
    if (memberError && memberError.code !== "23505") {
      redirect(registerErrorPath(memberError.message, registerFlow === "new" ? "new" : undefined));
    }
  } else {
    const { data: org, error: orgError } = await db
      .from("organizations")
      .insert({ name: organization_name, created_by: userId })
      .select("id")
      .single();

    if (orgError) {
      redirect(registerErrorPath(orgError.message, registerFlow === "new" ? "new" : undefined));
    }

    organization_id = org.id as string;

    const { error: memberError } = await db.from("organization_members").insert({
      organization_id,
      user_id: userId,
      member_role: "owner",
    });

    if (memberError) {
      redirect(registerErrorPath(memberError.message, registerFlow === "new" ? "new" : undefined));
    }
  }

  const { error: profileError } = await db.from("profiles").insert({
    user_id: userId,
    organization_id,
    first_name,
    last_name,
    biography,
    app_role: "user",
  });

  if (profileError) {
    redirect(registerErrorPath(profileError.message, registerFlow === "new" ? "new" : undefined));
  }

  if (hobbyNames.length) {
    const { data: hobbyRows, error: hobbySelectError } = await db
      .from("hobbies")
      .select("id,name")
      .in("name", hobbyNames);

    if (!hobbySelectError && hobbyRows?.length) {
      const hobbyInserts = hobbyRows.map((h) => ({
        organization_id,
        user_id: userId,
        hobby_id: h.id,
      }));
      await db.from("user_hobbies").insert(hobbyInserts);
    }
  }

  await db.from("audit_logs").insert({
    organization_id,
    user_id: userId,
    action: "auth.register",
    entity_type: "user",
    entity_id: userId,
  });

  if (hasSession) {
    redirect("/dashboard");
  }

  redirect("/verify");
}
