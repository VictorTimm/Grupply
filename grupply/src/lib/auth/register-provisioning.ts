import type { SupabaseClient } from "@supabase/supabase-js";

import type { RegisterFormValues } from "@/lib/auth/register";
import { logRegistrationEvent } from "@/lib/auth/register";

type ProvisionRegistrationParams = {
  admin: SupabaseClient;
  requestId: string;
  userId: string;
  values: RegisterFormValues;
};

type ProvisionResult = {
  organizationId: string;
  strategy: "rpc" | "server_fallback";
};

function isMissingProvisioningFunction(code: string | null | undefined, message: string) {
  return (
    code === "PGRST202" ||
    /provision_registration/i.test(message) ||
    /function .* does not exist/i.test(message)
  );
}

async function rollbackProvisioning(
  admin: SupabaseClient,
  userId: string,
  organizationId: string | null,
  createdOrganization: boolean,
) {
  if (createdOrganization && organizationId) {
    await admin.from("organizations").delete().eq("id", organizationId);
  } else {
    await admin.from("user_hobbies").delete().eq("user_id", userId);
    await admin.from("audit_logs").delete().eq("user_id", userId).eq("action", "auth.register");
    await admin.from("profiles").delete().eq("user_id", userId);
    await admin.from("organization_members").delete().eq("user_id", userId);
  }

  await admin.auth.admin.deleteUser(userId);
}

async function provisionRegistrationWithServerFallback({
  admin,
  userId,
  values,
}: Omit<ProvisionRegistrationParams, "requestId">) {
  let organizationId: string | null = null;
  let createdOrganization = false;

  try {
    if (values.joinCode) {
      const { data: resolvedOrgId, error: resolveErr } = await admin.rpc("resolve_org_id_by_join_code", {
        p_code: values.joinCode,
      });
      if (resolveErr) throw resolveErr;
      if (!resolvedOrgId) {
        throw { code: "P0001", message: "invalid_join_code" };
      }
      organizationId = resolvedOrgId as string;

      const { error: memberError } = await admin.from("organization_members").insert({
        organization_id: organizationId,
        user_id: userId,
        member_role: "member",
      });
      if (memberError && memberError.code !== "23505") throw memberError;
    } else {
      const { data: org, error: orgError } = await admin
        .from("organizations")
        .insert({
          name: values.organizationName,
          created_by: userId,
        })
        .select("id")
        .single();
      if (orgError) throw orgError;
      organizationId = org.id as string;
      createdOrganization = true;

      const { error: memberError } = await admin.from("organization_members").insert({
        organization_id: organizationId,
        user_id: userId,
        member_role: "owner",
      });
      if (memberError && memberError.code !== "23505") throw memberError;
    }

    const { error: profileError } = await admin.from("profiles").insert({
      user_id: userId,
      organization_id: organizationId,
      first_name: values.firstName,
      last_name: values.lastName,
      biography: values.biography,
      app_role: "user",
    });
    if (profileError) throw profileError;

    if (values.hobbyNames.length) {
      const { data: hobbyRows, error: hobbySelectError } = await admin
        .from("hobbies")
        .select("id,name")
        .in("name", values.hobbyNames);
      if (hobbySelectError) throw hobbySelectError;

      if (hobbyRows?.length) {
        const { error: hobbyInsertError } = await admin.from("user_hobbies").insert(
          hobbyRows.map((hobby) => ({
            organization_id: organizationId,
            user_id: userId,
            hobby_id: hobby.id,
          })),
        );
        if (hobbyInsertError && hobbyInsertError.code !== "23505") throw hobbyInsertError;
      }
    }

    const { error: auditError } = await admin.from("audit_logs").insert({
      organization_id: organizationId,
      user_id: userId,
      action: "auth.register",
      entity_type: "user",
      entity_id: userId,
    });
    if (auditError) throw auditError;

    return organizationId;
  } catch (error) {
    await rollbackProvisioning(admin, userId, organizationId, createdOrganization);
    throw error;
  }
}

export async function provisionRegistration({
  admin,
  requestId,
  userId,
  values,
}: ProvisionRegistrationParams): Promise<ProvisionResult> {
  const rpcPayload = {
    p_user_id: userId,
    p_first_name: values.firstName,
    p_last_name: values.lastName,
    p_biography: values.biography || null,
    p_hobby_names: values.hobbyNames,
    p_join_code: values.joinCode || null,
    p_organization_name: values.organizationName || null,
  };

  const { data: organizationId, error: provisioningError } = await admin.rpc(
    "provision_registration",
    rpcPayload,
  );
  if (!provisioningError) {
    return {
      organizationId: organizationId as string,
      strategy: "rpc",
    };
  }

  if (!isMissingProvisioningFunction(provisioningError.code, provisioningError.message)) {
    throw provisioningError;
  }

  logRegistrationEvent("info", "provisioning_rpc_missing_fallback", {
    requestId,
    userId,
    flow: values.flow,
  });

  const fallbackOrganizationId = await provisionRegistrationWithServerFallback({
    admin,
    userId,
    values,
  });

  return {
    organizationId: fallbackOrganizationId,
    strategy: "server_fallback",
  };
}
