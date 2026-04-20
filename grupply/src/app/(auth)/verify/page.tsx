import Link from "next/link";

import { Eyebrow } from "@/components/ui";

import { ResendEmailButton } from "./ResendEmailButton";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams?: Promise<{ email?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const email = String(resolvedSearchParams?.email ?? "").trim();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Eyebrow tone="ember">Check your inbox</Eyebrow>
        <h1 className="font-display text-[40px] leading-[1.02] font-medium tracking-tight">
          One more thing
        </h1>
        <p className="text-[14px] text-muted leading-relaxed max-w-sm">
          We just sent a verification link
          {email ? (
            <>
              {" "}to <span className="text-ink">{email}</span>.
            </>
          ) : (
            "."
          )}{" "}
          Click it, then come back and sign in.
        </p>
      </div>

      <div className="border-t border-border pt-6">
        {email ? <ResendEmailButton email={email} /> : null}
      </div>

      <div className="pt-2">
        <Link
          href="/login"
          className="text-[13px] font-medium text-ink hover:text-ember"
        >
          Go to sign in &rarr;
        </Link>
      </div>
    </div>
  );
}
