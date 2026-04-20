"use client";

import { useCallback, useState } from "react";

import { buttonClass } from "@/components/ui";

type CopyState = "idle" | "copied" | "error";

export function CopyInviteCodeButton({ code }: { code: string }) {
  const [state, setState] = useState<CopyState>("idle");

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setState("copied");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 2500);
    }
  }, [code]);

  const label =
    state === "copied" ? "Copied" : state === "error" ? "Try again" : "Copy";

  return (
    <button
      type="button"
      onClick={copy}
      className={buttonClass({ variant: "secondary", size: "sm" })}
    >
      {label}
    </button>
  );
}
