import Link from "next/link";

import { registerAction } from "./actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; flow?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isCreateFlow = resolvedSearchParams?.flow === "new";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Start connecting through events and activities.
        </p>
        {isCreateFlow ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You are creating a <strong className="font-medium text-zinc-800 dark:text-zinc-200">new</strong>{" "}
            company space. You will be the owner. An invite code is generated automatically so you can
            invite teammates from Settings after you sign up.
          </p>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Enter the <strong className="font-medium text-zinc-800 dark:text-zinc-200">invite code</strong>{" "}
            from your company admin (Settings in Grupply). It is a secret string, not the company display
            name.
          </p>
        )}
      </div>

      {resolvedSearchParams?.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {resolvedSearchParams.error}
        </div>
      ) : null}

      <form action={registerAction} className="flex flex-col gap-4">
        {isCreateFlow ? <input type="hidden" name="_flow" value="new" /> : null}

        {isCreateFlow ? (
          <>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">Organization name</span>
              <input
                name="organization_name"
                required
                placeholder="Your company or team name"
                className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
              />
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              <Link href="/register" className="font-medium text-zinc-700 underline dark:text-zinc-300">
                Join an existing company instead
              </Link>{" "}
              (invite code from your admin).
            </p>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">Invite code</span>
              <input
                name="join_code"
                autoComplete="off"
                required
                placeholder="Paste the code from your admin"
                className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-500">
                Ask an owner or admin to copy it from Settings if you do not have one yet.
              </span>
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              <Link
                href="/register?flow=new"
                className="font-medium text-zinc-700 underline dark:text-zinc-300"
              >
                Create a new company instead
              </Link>
            </p>
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">First name</span>
            <input
              name="first_name"
              required
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Last name</span>
            <input
              name="last_name"
              required
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
            />
          </label>
        </div>

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

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Hobbies (comma-separated)</span>
          <input
            name="hobbies"
            placeholder="Coffee, Hiking, Board games"
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Bio</span>
          <textarea
            name="biography"
            rows={3}
            className="resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
          />
        </label>

        <button
          type="submit"
          className="h-11 rounded-2xl bg-[#0052FF] text-sm font-medium text-white shadow-sm transition hover:bg-[#0046DD]"
        >
          Create account
        </button>
      </form>

      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-950 hover:underline dark:text-zinc-50">
          Log in
        </Link>
      </div>
    </div>
  );
}
