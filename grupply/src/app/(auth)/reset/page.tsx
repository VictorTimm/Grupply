import Link from "next/link";

import { resetPasswordAction } from "./actions";

export default async function ResetPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; sent?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          We’ll email you a reset link.
        </p>
      </div>

      {resolvedSearchParams?.sent === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          If an account exists for that email, we sent a password reset link.
        </div>
      ) : null}

      {resolvedSearchParams?.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {resolvedSearchParams.error}
        </div>
      ) : null}

      <form action={resetPasswordAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
          />
        </label>
        <button
          type="submit"
          className="h-11 rounded-xl bg-zinc-950 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Send reset link
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

