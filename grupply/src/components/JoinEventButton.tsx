"use client";

import { useState, useTransition } from "react";

import { joinEventAction } from "@/app/(app)/dashboard/actions";
import { buttonClass } from "@/components/ui";

type Props = {
  eventId: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  label?: string;
  pendingLabel?: string;
};

export function JoinEventButton({
  eventId,
  variant = "primary",
  size = "md",
  label = "I\u2019m in",
  pendingLabel = "Joining\u2026",
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await joinEventAction(eventId);
      if (!result.ok) {
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className={`${buttonClass({ variant, size })} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {pending ? pendingLabel : label}
      </button>
      {error ? (
        <p className="text-[12px] text-clay leading-snug">{error}</p>
      ) : null}
    </div>
  );
}
