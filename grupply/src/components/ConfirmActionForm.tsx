"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

type ConfirmActionFormProps = {
  action: () => Promise<void>;
  initialLabel: string;
  confirmLabel: string;
  pendingLabel: string;
  className: string;
  confirmClassName?: string;
  formClassName?: string;
  timeoutMs?: number;
};

type ConfirmButtonProps = {
  confirmed: boolean;
  initialLabel: string;
  confirmLabel: string;
  pendingLabel: string;
  className: string;
  confirmClassName?: string;
};

function ConfirmButton({
  confirmed,
  initialLabel,
  confirmLabel,
  pendingLabel,
  className,
  confirmClassName,
}: ConfirmButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`${
        confirmed ? (confirmClassName ?? className) : className
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? pendingLabel : confirmed ? confirmLabel : initialLabel}
    </button>
  );
}

export function ConfirmActionForm({
  action,
  initialLabel,
  confirmLabel,
  pendingLabel,
  className,
  confirmClassName,
  formClassName,
  timeoutMs = 4000,
}: ConfirmActionFormProps) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!confirmed) return undefined;

    const timeout = window.setTimeout(() => setConfirmed(false), timeoutMs);
    return () => window.clearTimeout(timeout);
  }, [confirmed, timeoutMs]);

  return (
    <form
      className={formClassName}
      action={async () => {
        if (!confirmed) {
          setConfirmed(true);
          return;
        }

        await action();
      }}
    >
      <ConfirmButton
        confirmed={confirmed}
        initialLabel={initialLabel}
        confirmLabel={confirmLabel}
        pendingLabel={pendingLabel}
        className={className}
        confirmClassName={confirmClassName}
      />
    </form>
  );
}
