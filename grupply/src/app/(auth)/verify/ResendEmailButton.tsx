"use client";

import { useEffect, useState, useTransition } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { buttonClass } from "@/components/ui";

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
    <div className="flex flex-col gap-3">
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
            setMessage(
              "Verification email sent. You can request another in 60 seconds.",
            );
          });
        }}
        className={buttonClass({ variant: "secondary", size: "md" })}
      >
        {pending
          ? "Sending\u2026"
          : cooldownSeconds > 0
            ? `Sent \u2014 try again in ${cooldownSeconds}s`
            : "Resend verification email"}
      </button>

      {message ? (
        <div className="border-l-2 border-sage bg-sage/5 px-3 py-2 text-[12px] text-sage">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="border-l-2 border-clay bg-clay/5 px-3 py-2 text-[12px] text-clay">
          {error}
        </div>
      ) : null}
    </div>
  );
}
