import Link from "next/link";

import { Eyebrow } from "@/components/ui";

import { registerAction } from "./actions";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; flow?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isCreateFlow = resolvedSearchParams?.flow === "new";
  // #region agent log
  try {
    fetch("http://127.0.0.1:7840/ingest/071fdb3d-186d-4d94-bc25-a5093692a8a6", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "aeab4a" },
      body: JSON.stringify({
        sessionId: "aeab4a",
        runId: "deploy-drift-check",
        hypothesisId: "H5",
        location: "register/page.tsx:render",
        message: "register page rendered",
        data: {
          hasErrorParam: Boolean(resolvedSearchParams?.error),
          flowParam: resolvedSearchParams?.flow ?? null,
          nodeEnv: process.env.NODE_ENV ?? null,
          vercelEnv: process.env.VERCEL_ENV ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Eyebrow tone="iris">
          {isCreateFlow ? "New workspace" : "Join your team"}
        </Eyebrow>
        <h1 className="font-display text-[40px] leading-[1.02] font-medium tracking-tight">
          {isCreateFlow ? "Start a space" : "Join your crew"}
        </h1>
        {isCreateFlow ? (
          <p className="text-[14px] text-muted leading-relaxed">
            You&rsquo;re creating a brand-new company space as the owner.
            Grupply generates an invite code you can share with teammates from
            Settings after sign up.
          </p>
        ) : (
          <p className="text-[14px] text-muted leading-relaxed">
            Paste the invite code your admin copied from Settings. It&rsquo;s a
            secret string, not the company name.
          </p>
        )}
      </div>

      {resolvedSearchParams?.error ? (
        <div
          className="border-l-2 border-clay bg-clay/5 px-3 py-2 text-[13px] text-clay"
          role="alert"
        >
          {resolvedSearchParams.error}
        </div>
      ) : null}

      <RegisterForm isCreateFlow={isCreateFlow} registerAction={registerAction} />

      <p className="text-[13px] text-muted text-center">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink hover:text-ember">
          Sign in
        </Link>
      </p>
    </div>
  );
}
