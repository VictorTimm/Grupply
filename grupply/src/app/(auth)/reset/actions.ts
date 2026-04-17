"use server";

import { redirect } from "next/navigation";

import { getAppOrigin } from "@/lib/app-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function resetErrorPath(message: string) {
  return `/reset?error=${encodeURIComponent(message)}`;
}

export async function resetPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const appOrigin = await getAppOrigin();
  const redirectTo = new URL("/auth/callback", appOrigin);
  redirectTo.searchParams.set("next", "/reset/confirm");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo.toString(),
  });
  if (error) {
    redirect(resetErrorPath(error.message));
  }

  redirect("/reset?sent=1");
}

