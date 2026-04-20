import Link from "next/link";

import { SubmitButton } from "@/components/SubmitButton";
import {
  Eyebrow,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";

import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; verified?: string; reset?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Eyebrow>Welcome back</Eyebrow>
        <h1 className="font-display text-[44px] leading-[1] font-medium tracking-tight">
          Sign in
        </h1>
        <p className="text-[14px] text-muted leading-relaxed">
          Pick up where your crew left off.
        </p>
      </div>

      {resolvedSearchParams?.verified === "1" ? (
        <div className="border-l-2 border-sage bg-sage/5 px-3 py-2 text-[13px] text-sage">
          Your email is verified. Sign in to continue.
        </div>
      ) : null}

      {resolvedSearchParams?.reset === "success" ? (
        <div className="border-l-2 border-sage bg-sage/5 px-3 py-2 text-[13px] text-sage">
          Password updated. Sign in with your new password.
        </div>
      ) : null}

      {resolvedSearchParams?.error ? (
        <div
          className="border-l-2 border-clay bg-clay/5 px-3 py-2 text-[13px] text-clay"
          role="alert"
        >
          {resolvedSearchParams.error}
        </div>
      ) : null}

      <form
        action={loginAction}
        className="flex flex-col gap-5"
        suppressHydrationWarning
      >
        <div>
          <label className={labelClass()} htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            suppressHydrationWarning
            className={inputClass()}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className={labelClass("mb-0")} htmlFor="password">
              Password
            </label>
            <Link
              href="/reset"
              className="text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink"
            >
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            suppressHydrationWarning
            className={inputClass()}
          />
        </div>

        <SubmitButton
          pendingLabel="Signing in…"
          className={buttonClass({ variant: "primary", size: "lg", full: true })}
        >
          Continue
        </SubmitButton>
      </form>

      <div className="flex items-center gap-3 text-[12px] text-muted">
        <div className="h-px flex-1 bg-border" />
        <span>or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col gap-2 text-center">
        <p className="text-[13px] text-muted">
          New to Grupply?{" "}
          <Link
            href="/register"
            className="font-medium text-ink hover:text-ember"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
