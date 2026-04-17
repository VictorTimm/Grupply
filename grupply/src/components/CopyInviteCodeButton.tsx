"use client";

import { useCallback, useState } from "react";

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
    state === "copied" ? "Copied" : state === "error" ? "Copy failed — try again" : "Copy";

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      {label}
    </button>
  );
}
