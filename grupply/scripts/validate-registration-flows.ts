import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { provisionRegistration } from "../src/lib/auth/register-provisioning";
import { getSupabaseAdminConfigStatus } from "../src/lib/supabase/admin-config";

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  const text = fs.readFileSync(envPath, "utf8");

  for (const line of text.split(/\r?\n/)) {
    if (!line || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    process.env[line.slice(0, idx)] = line.slice(idx + 1);
  }
}

function expectTruthy<T>(value: T | null | undefined, message: string): T {
  if (!value) throw new Error(message);
  return value;
}

async function main() {
  loadEnvFile();

  const configStatus = getSupabaseAdminConfigStatus();
  if (!configStatus.ok) {
    throw new Error(`Supabase admin config invalid: ${configStatus.message}`);
  }

  const url = expectTruthy(process.env.NEXT_PUBLIC_SUPABASE_URL, "Missing NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = expectTruthy(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  const serviceRoleKey = expectTruthy(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Missing SUPABASE_SERVICE_ROLE_KEY",
  );

  const anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const suffix = Date.now().toString();
  const ownerEmail = `victor.m.timmermans+svc-owner-${suffix}@gmail.com`;
  const memberEmail = `victor.m.timmermans+svc-member-${suffix}@gmail.com`;
  const invalidEmail = `victor.m.timmermans+svc-invalid-${suffix}@gmail.com`;
  const password = `TempPass!${suffix}`;
  let organizationId: string | null = null;
  let ownerUserId: string | null = null;
  let memberUserId: string | null = null;

  try {
    const ownerSignUp = await anonClient.auth.signUp({
      email: ownerEmail,
      password,
    });
    if (ownerSignUp.error) throw ownerSignUp.error;
    ownerUserId = expectTruthy(ownerSignUp.data.user?.id, "Owner sign-up did not return a user id");

    const ownerProvision = await provisionRegistration({
      admin: adminClient,
      requestId: `live-owner-${suffix}`,
      userId: ownerUserId,
      values: {
        email: ownerEmail,
        password,
        firstName: "Service",
        lastName: "Owner",
        organizationName: `Svc Test ${suffix}`,
        joinCode: "",
        biography: "owner",
        hobbyNames: [],
        flow: "new",
      },
    });
    organizationId = ownerProvision.organizationId;

    const { data: organization, error: orgError } = await adminClient
      .from("organizations")
      .select("id,join_code")
      .eq("id", organizationId)
      .single();
    if (orgError) throw orgError;
    const joinCode = expectTruthy(organization.join_code as string | null, "Expected generated join code");

    const ownerMembership = await adminClient
      .from("organization_members")
      .select("member_role")
      .eq("organization_id", organizationId)
      .eq("user_id", ownerUserId)
      .single();
    if (ownerMembership.error) throw ownerMembership.error;
    if (ownerMembership.data.member_role !== "owner") {
      throw new Error("Expected owner membership for create-company flow");
    }

    const memberSignUp = await anonClient.auth.signUp({
      email: memberEmail,
      password,
    });
    if (memberSignUp.error) throw memberSignUp.error;
    memberUserId = expectTruthy(memberSignUp.data.user?.id, "Member sign-up did not return a user id");

    const memberProvision = await provisionRegistration({
      admin: adminClient,
      requestId: `live-member-${suffix}`,
      userId: memberUserId,
      values: {
        email: memberEmail,
        password,
        firstName: "Service",
        lastName: "Member",
        organizationName: "",
        joinCode,
        biography: "",
        hobbyNames: [],
        flow: "join",
      },
    });

    if (memberProvision.organizationId !== organizationId) {
      throw new Error("Join flow provisioned the member into the wrong organization");
    }

    const memberProfile = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("user_id", memberUserId)
      .single();
    if (memberProfile.error) throw memberProfile.error;
    if (memberProfile.data.organization_id !== organizationId) {
      throw new Error("Expected member profile to match the owner's organization");
    }

    const invalidSignUp = await anonClient.auth.signUp({
      email: invalidEmail,
      password,
    });
    if (invalidSignUp.error) throw invalidSignUp.error;
    const invalidUserId = expectTruthy(
      invalidSignUp.data.user?.id,
      "Invalid-code sign-up did not return a user id",
    );

    let invalidJoinPassed = false;
    try {
      await provisionRegistration({
        admin: adminClient,
        requestId: `live-invalid-${suffix}`,
        userId: invalidUserId,
        values: {
          email: invalidEmail,
          password,
          firstName: "Service",
          lastName: "Invalid",
          organizationName: "",
          joinCode: "not-a-real-code",
          biography: "",
          hobbyNames: [],
          flow: "join",
        },
      });
      invalidJoinPassed = true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : String(error);
      if (!/invalid_join_code/i.test(message)) {
        throw error;
      }
    }

    if (invalidJoinPassed) {
      throw new Error("Invalid invite code should not provision successfully");
    }

    const { data: invalidLookup, error: invalidLookupError } = await adminClient.auth.admin.getUserById(
      invalidUserId,
    );
    if (invalidLookupError && invalidLookupError.status !== 404) {
      throw invalidLookupError;
    }
    if (!invalidLookupError && invalidLookup.user !== null) {
      throw new Error("Invalid invite code should have rolled back the auth user");
    }

    console.log(
      JSON.stringify(
        {
          ownerEmail,
          memberEmail,
          organizationId,
          joinCode,
          ownerStrategy: ownerProvision.strategy,
          memberStrategy: memberProvision.strategy,
          invalidJoinRolledBack: true,
        },
        null,
        2,
      ),
    );
  } finally {
    if (organizationId) {
      await adminClient.from("organizations").delete().eq("id", organizationId);
    }
    if (memberUserId) {
      await adminClient.auth.admin.deleteUser(memberUserId);
    }
    if (ownerUserId) {
      await adminClient.auth.admin.deleteUser(ownerUserId);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
