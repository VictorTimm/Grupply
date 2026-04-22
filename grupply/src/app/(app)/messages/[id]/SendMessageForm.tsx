"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { buttonClass } from "@/components/ui";

import { sendMessageAction } from "../actions";

export function SendMessageForm({
  conversationId,
}: {
  conversationId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await sendMessageAction(conversationId, formData);
          if (!result.ok) {
            setError(result.error);
          } else {
            formRef.current?.reset();
            // Refresh the RSC tree so the sender's message is guaranteed to
            // appear even when the realtime subscription hasn't fired yet.
            router.refresh();
          }
        });
      }}
    >
      {error ? (
        <div className="border-l-2 border-clay bg-clay/5 px-3 py-1.5 text-[12px] text-clay">
          {error}
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <input
          name="content"
          placeholder="Write a message…"
          required
          autoComplete="off"
          className="h-11 flex-1 rounded-[10px] border border-border bg-canvas px-3.5 text-[14px] text-ink placeholder:text-mute-soft focus-visible:outline-none focus-visible:border-ink transition-colors"
        />
        <button
          type="submit"
          disabled={pending}
          className={buttonClass({ variant: "primary", size: "md" })}
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
