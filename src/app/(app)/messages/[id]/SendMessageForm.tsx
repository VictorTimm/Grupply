"use client";

import { useRef, useState, useTransition } from "react";

import { sendMessageAction } from "../actions";

export function SendMessageForm({
  conversationId,
}: {
  conversationId: string;
}) {
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
          }
        });
      }}
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <input
          name="content"
          placeholder="Write a message…"
          required
          className="h-11 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
