import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    redirect("/login?error=Open the password reset link from your email to choose a new password.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enter a new password for {auth.user.email ?? "your account"}.
        </p>
      </div>

      {resolvedSearchParams?.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {resolvedSearchParams.error}
        </div>
      ) : null}

      <form action={confirmResetPasswordAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">New password</span>
          <input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Confirm new password</span>
          <input
            name="confirm_password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
          />
        </label>

        <button
          type="submit"
          className="h-11 rounded-2xl bg-[#0052FF] text-sm font-medium text-white shadow-sm transition hover:bg-[#0046DD]"
        >
          Save new password
        </button>
      </form>

      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/login" className="hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
