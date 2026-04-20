"use client";

import { useEffect, useState, useTransition } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ResendEmailButtonProps = {
  email: string;
};

export function ResendEmailButton({ email }: ResendEmailButtonProps) {
  const [pending, startTransition] = useTransition();
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;

    const interval = window.setInterval(() => {
      setCooldownSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [cooldownSeconds]);

  return (
    <div className="flex flex-col gap-2 pt-2">
      <button
        type="button"
        disabled={pending || cooldownSeconds > 0}
        onClick={() => {
          setError(null);
          setMessage(null);

          startTransition(async () => {
            const supabase = createSupabaseBrowserClient();
            const { error: resendError } = await supabase.auth.resend({
              type: "signup",
              email,
            });

            if (resendError) {
              setError(resendError.message);
              return;
            }

            setCooldownSeconds(60);
            setMessage("Verification email sent. You can request another in 60 seconds.");
          });
        }}
        className="self-start rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        {pending
          ? "Sending…"
          : cooldownSeconds > 0
            ? `Sent — try again in ${cooldownSeconds}s`
            : "Resend verification email"}
      </button>

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}
    </div>
  );
}
