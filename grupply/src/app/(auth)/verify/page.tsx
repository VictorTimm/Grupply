import Link from "next/link";

import { ResendEmailButton } from "./ResendEmailButton";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams?: Promise<{ email?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const email = String(resolvedSearchParams?.email ?? "").trim();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Check your inbox for a verification link, then come back and log in.
      </p>
      {email ? <ResendEmailButton email={email} /> : null}
      <div className="pt-2">
        <Link
          href="/login"
          className="text-sm font-medium text-zinc-950 hover:underline dark:text-zinc-50"
        >
          Go to login
        </Link>
      </div>
    </div>
  );
}

