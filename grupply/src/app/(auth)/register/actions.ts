"use server";

import { redirect } from "next/navigation";

import { getAppOrigin } from "@/lib/app-url";
import {
  logRegistrationEvent,
  mapAdminConfigError,
  mapProvisioningError,
  mapSignUpErrorMessage,
  parseRegisterForm,
  registerErrorPath,
} from "@/lib/auth/register";
import { provisionRegistration } from "@/lib/auth/register-provisioning";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAdminConfigStatus } from "@/lib/supabase/admin-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function registerAction(formData: FormData) {
  const requestId = crypto.randomUUID();
  const values = parseRegisterForm(formData);
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  let checkpoint = "start";
  let thrownMeta: { message?: string; digest?: string } | null = null;
  try {
    if (values.password !== confirmPassword) {
      checkpoint = "validation_password_mismatch";
      redirect(registerErrorPath("Passwords do not match.", values.flow));
    }

    if (values.joinCode && values.organizationName) {
      checkpoint = "validation_flow_conflict";
      redirect(
        registerErrorPath(
          "Use either an invite code or a new organization name, not both.",
          values.flow,
        ),
      );
    }
    if (!values.joinCode && !values.organizationName) {
      checkpoint = "validation_missing_flow_value";
      redirect(
        registerErrorPath(
          values.flow === "new"
            ? "Enter an organization name to create your company space."
            : "Enter your invite code from your company admin, or choose Create a new company instead.",
          values.flow,
        ),
      );
    }

    const appOrigin = await getAppOrigin();
    const verifyRedirectUrl = new URL("/auth/callback", appOrigin);
    verifyRedirectUrl.searchParams.set("next", "/login?verified=1");

    const supabase = await createSupabaseServerClient();
    checkpoint = "sign_up_started";
    logRegistrationEvent("info", "sign_up_started", {
      requestId,
      flow: values.flow,
      hasJoinCode: Boolean(values.joinCode),
      hasOrganizationName: Boolean(values.organizationName),
      hobbyCount: values.hobbyNames.length,
    });

    let signUpData: Awaited<ReturnType<typeof supabase.auth.signUp>>["data"];
    let signUpError: Awaited<ReturnType<typeof supabase.auth.signUp>>["error"];
    try {
      ({ data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: verifyRedirectUrl.toString(),
        },
      }));
    } catch (unexpectedSignUpError) {
      const err = unexpectedSignUpError as { message?: string };
      checkpoint = "sign_up_threw";
      logRegistrationEvent("error", "sign_up_threw", {
        requestId,
        flow: values.flow,
        message: err.message ?? "unknown",
      });
      logRegistrationEvent("info", "sign_up_threw_info", {
        requestId,
        flow: values.flow,
        message: err.message ?? "unknown",
      });
      throw unexpectedSignUpError;
    }

    if (signUpError) {
      checkpoint = "sign_up_failed";
      logRegistrationEvent("error", "sign_up_failed", {
        requestId,
        flow: values.flow,
        code: signUpError.code ?? null,
        message: signUpError.message,
      });
      logRegistrationEvent("info", "sign_up_failed_info", {
        requestId,
        flow: values.flow,
        code: signUpError.code ?? null,
        message: signUpError.message,
      });
      redirect(registerErrorPath(mapSignUpErrorMessage(signUpError.message), values.flow));
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      checkpoint = "sign_up_missing_user_id";
      logRegistrationEvent("error", "sign_up_missing_user_id", { requestId, flow: values.flow });
      redirect(registerErrorPath("Missing user id.", values.flow));
    }

    const hasSession = Boolean(signUpData.session);
    checkpoint = "sign_up_succeeded";
    logRegistrationEvent("info", "sign_up_succeeded", {
      requestId,
      flow: values.flow,
      userId,
      hasSession,
    });

    const adminStatus = getSupabaseAdminConfigStatus();
    const admin = createSupabaseAdminClient();
  // #region agent log
  try {
    fetch("http://127.0.0.1:7840/ingest/071fdb3d-186d-4d94-bc25-a5093692a8a6", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "aeab4a" },
      body: JSON.stringify({
        sessionId: "aeab4a",
        runId: "deploy-drift-check",
        hypothesisId: "H1,H2,H3,H4",
        location: "register/actions.ts:admin-status",
        message: "admin config evaluated during registration",
        data: {
          requestId,
          flow: values.flow,
          adminStatusOk: adminStatus.ok,
          adminStatusCode: adminStatus.code,
          adminStatusRole: adminStatus.role,
          adminStatusServiceRef: adminStatus.serviceRef,
          adminStatusUrlRef: adminStatus.urlRef,
          hasAdminClient: Boolean(admin),
          hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0,
          nodeEnv: process.env.NODE_ENV ?? null,
          vercelEnv: process.env.VERCEL_ENV ?? null,
          vercel: process.env.VERCEL ?? null,
          vercelUrl: process.env.VERCEL_URL ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion
    if (!admin) {
      checkpoint = "admin_config_invalid";
      logRegistrationEvent("error", "admin_config_invalid", {
        requestId,
        flow: values.flow,
        userId,
        code: adminStatus.code,
        message: adminStatus.message,
        role: adminStatus.role,
        serviceRef: adminStatus.serviceRef,
        urlRef: adminStatus.urlRef,
      });
      logRegistrationEvent("info", "admin_config_invalid_info", {
        requestId,
        flow: values.flow,
        userId,
        code: adminStatus.code,
        message: adminStatus.message,
        role: adminStatus.role,
        serviceRef: adminStatus.serviceRef,
        urlRef: adminStatus.urlRef,
      });
      redirect(registerErrorPath(mapAdminConfigError(adminStatus), values.flow));
    }

    try {
      const { organizationId, strategy } = await provisionRegistration({
        admin,
        requestId,
        userId,
        values,
      });
      checkpoint = "provisioning_succeeded";
      logRegistrationEvent("info", "provisioning_succeeded", {
        requestId,
        flow: values.flow,
        userId,
        organizationId,
        strategy,
      });
    } catch (provisioningError) {
      const error = provisioningError as { code?: string | null; message: string };
      checkpoint = "provisioning_failed";
      logRegistrationEvent("error", "provisioning_failed", {
        requestId,
        flow: values.flow,
        userId,
        code: error.code ?? null,
        message: error.message,
      });
      logRegistrationEvent("info", "provisioning_failed_info", {
        requestId,
        flow: values.flow,
        userId,
        code: error.code ?? null,
        message: error.message,
      });
      redirect(registerErrorPath(mapProvisioningError(error), values.flow));
    }

    if (hasSession) {
      checkpoint = "redirect_dashboard";
      redirect("/dashboard");
    }

    checkpoint = "redirect_verify";
    redirect(`/verify?email=${encodeURIComponent(values.email)}`);
  } catch (error) {
    const err = error as { message?: string; digest?: string };
    thrownMeta = { message: err.message, digest: err.digest };
    throw error;
  } finally {
    logRegistrationEvent("info", "register_action_exit", {
      requestId,
      flow: values.flow,
      checkpoint,
      thrownMessage: thrownMeta?.message ?? null,
      thrownDigest: thrownMeta?.digest ?? null,
      isNextRedirect: Boolean(thrownMeta?.digest?.startsWith("NEXT_REDIRECT")),
    });
  }
}
