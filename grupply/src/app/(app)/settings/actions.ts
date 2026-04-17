"use server";

import { randomBytes } from "node:crypto";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function settingsErrorPath(message: string) {
  return `/settings?error=${encodeURIComponent(message)}`;
}

export async function rotateOrganizationJoinCodeAction() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const organizationId = profile?.organization_id as string | undefined;
  if (!organizationId) {
    redirect(settingsErrorPath("No organization on file."));
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("member_role")
    .eq("organization_id", organizationId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const role = membership?.member_role as string | undefined;
  if (role !== "owner" && role !== "admin") {
    redirect(settingsErrorPath("Only organization owners and admins can rotate the invite code."));
  }

  const newCode = () => randomBytes(12).toString("hex");

  let code = newCode();
  let { error } = await supabase
    .from("organizations")
    .update({ join_code: code })
    .eq("id", organizationId);

  if (error?.code === "23505") {
    code = newCode();
    ({ error } = await supabase
      .from("organizations")
      .update({ join_code: code })
      .eq("id", organizationId));
  }

  if (error) {
    redirect(settingsErrorPath(error.message));
  }

  redirect("/settings");
}

export async function deleteMyDataAction() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  await supabase.rpc("delete_my_data");
  await supabase.auth.signOut();
  redirect("/login");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
