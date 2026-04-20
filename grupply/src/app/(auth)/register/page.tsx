import Link from "next/link";

import { registerAction } from "./actions";
import { RegisterForm } from "./RegisterForm";

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

      <RegisterForm isCreateFlow={isCreateFlow} registerAction={registerAction} />

      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-950 hover:underline dark:text-zinc-50">
          Log in
        </Link>
      </div>
    </div>
  );
}
