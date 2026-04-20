import Link from "next/link";

import { SubmitButton } from "@/components/SubmitButton";

import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; verified?: string; reset?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Welcome back to Grupply.
        </p>
      </div>

      {resolvedSearchParams?.verified === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          Your email is verified. Log in to continue.
        </div>
      ) : null}

      {resolvedSearchParams?.reset === "success" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          Your password has been updated. Log in with your new password.
        </div>
      ) : null}

      {resolvedSearchParams?.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {resolvedSearchParams.error}
        </div>
      ) : null}

      <form
        action={loginAction}
        className="flex flex-col gap-4"
        suppressHydrationWarning
      >
        <label className="flex flex-col gap-1.5 text-sm" suppressHydrationWarning>
          <span className="text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            suppressHydrationWarning
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none ring-0 transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm" suppressHydrationWarning>
          <span className="text-zinc-700 dark:text-zinc-300">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            suppressHydrationWarning
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none ring-0 transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
          />
        </label>

        <SubmitButton
          pendingLabel="Signing in…"
          className="h-11 rounded-2xl bg-[#0052FF] text-sm font-medium text-white shadow-sm transition hover:bg-[#0046DD]"
        >
          Continue
        </SubmitButton>
      </form>

      <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/register" className="hover:underline">
          Create account
        </Link>
        <Link href="/reset" className="hover:underline">
          Forgot password
        </Link>
      </div>
    </div>
  );
}

