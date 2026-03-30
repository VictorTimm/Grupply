"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function registerAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const organization_name = String(formData.get("organization_name") ?? "").trim();
  const biography = String(formData.get("biography") ?? "").trim();

  const hobbiesRaw = String(formData.get("hobbies") ?? "").trim();
  const hobbyNames = hobbiesRaw
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
    .slice(0, 20);

  const supabase = await createSupabaseServerClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    redirect(`/register?error=${encodeURIComponent(signUpError.message)}`);
  }

  // If email confirmation is required, there's no session yet; ask user to verify email.
  if (!signUpData.session) {
    redirect("/verify");
  }

  const userId = signUpData.user?.id;
  if (!userId) redirect(`/register?error=${encodeURIComponent("Missing user id.")}`);

  // Create org + membership + profile in a single authenticated session.
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: organization_name, created_by: userId })
    .select("id")
    .single();

  if (orgError) redirect(`/register?error=${encodeURIComponent(orgError.message)}`);

  const organization_id = org.id as string;

  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id,
    user_id: userId,
    member_role: "owner",
  });

  if (memberError) redirect(`/register?error=${encodeURIComponent(memberError.message)}`);

  const { error: profileError } = await supabase.from("profiles").insert({
    user_id: userId,
    organization_id,
    first_name,
    last_name,
    biography,
    app_role: "user",
  });

  if (profileError) redirect(`/register?error=${encodeURIComponent(profileError.message)}`);

  if (hobbyNames.length) {
    const { data: hobbyRows, error: hobbySelectError } = await supabase
      .from("hobbies")
      .select("id,name")
      .in("name", hobbyNames);

    if (!hobbySelectError && hobbyRows?.length) {
      const hobbyInserts = hobbyRows.map((h) => ({
        organization_id,
        user_id: userId,
        hobby_id: h.id,
      }));
      await supabase.from("user_hobbies").insert(hobbyInserts);
    }
  }

  await supabase.from("audit_logs").insert({
    organization_id,
    user_id: userId,
    action: "auth.register",
    entity_type: "user",
    entity_id: userId,
  });

  redirect("/dashboard");
}

