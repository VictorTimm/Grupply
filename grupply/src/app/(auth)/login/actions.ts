"use server";

import { redirect } from "next/navigation";

import { registrationRecoveryPath } from "@/lib/auth/register";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const userId = data.user?.id;
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", userId)
      .single();

    if (!profile?.organization_id) {
      redirect(registrationRecoveryPath("join"));
    }

    await supabase.from("audit_logs").insert({
      organization_id: profile.organization_id,
      user_id: userId,
      action: "auth.login",
      entity_type: "user",
      entity_id: userId,
    });
  }

  redirect("/dashboard");
}

