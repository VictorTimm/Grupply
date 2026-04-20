import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  Eyebrow,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";

import { confirmResetPasswordAction } from "./actions";

export default async function ResetConfirmPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect(
      "/login?error=Open the password reset link from your email to choose a new password.",
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Eyebrow tone="iris">New password</Eyebrow>
        <h1 className="font-display text-[40px] leading-[1.02] font-medium tracking-tight">
          Choose a new one
        </h1>
        <p className="text-[14px] text-muted leading-relaxed">
          Updating the password for{" "}
          <span className="text-ink font-medium">
            {auth.user.email ?? "your account"}
          </span>
          .
        </p>
      </div>

      {resolvedSearchParams?.error ? (
        <div className="border-l-2 border-clay bg-clay/5 px-3 py-2 text-[13px] text-clay">
          {resolvedSearchParams.error}
        </div>
      ) : null}

      <form action={confirmResetPasswordAction} className="flex flex-col gap-5">
        <div>
          <label className={labelClass()} htmlFor="password">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            className={inputClass()}
          />
        </div>

        <div>
          <label className={labelClass()} htmlFor="confirm_password">
            Confirm new password
          </label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            className={inputClass()}
          />
        </div>

        <button
          type="submit"
          className={buttonClass({ variant: "primary", size: "lg", full: true })}
        >
          Save new password
        </button>
      </form>

      <Link
        href="/login"
        className="text-[13px] text-muted hover:text-ink text-center"
      >
        &larr; Back to sign in
      </Link>
    </div>
  );
}
