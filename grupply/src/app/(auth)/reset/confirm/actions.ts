"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function confirmResetPath(message: string) {
  return `/reset/confirm?error=${encodeURIComponent(message)}`;
}

export async function confirmResetPasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    redirect(confirmResetPath("Use at least 8 characters for your new password."));
  }

  if (password !== confirmPassword) {
    redirect(confirmResetPath("Passwords do not match."));
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login?error=Your reset session expired. Open the reset link from your email again.");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(confirmResetPath(error.message));
  }

  await supabase.auth.signOut();
  redirect("/login?reset=success");
}
