import Link from "next/link";

import {
  Eyebrow,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";

import { resetPasswordAction } from "./actions";

export default async function ResetPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; sent?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Eyebrow>Password reset</Eyebrow>
        <h1 className="font-display text-[40px] leading-[1.02] font-medium tracking-tight">
          Forgot it?
        </h1>
        <p className="text-[14px] text-muted leading-relaxed">
          Happens to everyone. Drop your email and we&rsquo;ll send a reset
          link.
        </p>
      </div>

      {resolvedSearchParams?.sent === "1" ? (
        <div className="border-l-2 border-sage bg-sage/5 px-3 py-2 text-[13px] text-sage">
          If an account exists for that email, we sent a password reset link.
        </div>
      ) : null}

      {resolvedSearchParams?.error ? (
        <div className="border-l-2 border-clay bg-clay/5 px-3 py-2 text-[13px] text-clay">
          {resolvedSearchParams.error}
        </div>
      ) : null}

      <form action={resetPasswordAction} className="flex flex-col gap-5">
        <div>
          <label className={labelClass()} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass()}
          />
        </div>
        <button
          type="submit"
          className={buttonClass({ variant: "primary", size: "lg", full: true })}
        >
          Send reset link
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
