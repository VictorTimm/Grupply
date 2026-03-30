"use client";

import { useTransition } from "react";

import { startConversationAction } from "./actions";

export function StartConversationForm({
  people,
}: {
  people: Array<{ user_id: string; first_name: string; last_name: string }>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-3 flex flex-col gap-2"
      action={(formData) => {
        startTransition(() => startConversationAction(formData));
      }}
    >
      <select
        name="recipient_id"
        className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
        required
        defaultValue=""
      >
        <option value="" disabled>
          Choose a colleague…
        </option>
        {people.map((p) => (
          <option key={p.user_id} value={p.user_id}>
            {p.first_name} {p.last_name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-xl bg-zinc-950 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {pending ? "Starting…" : "Start conversation"}
      </button>
    </form>
  );
}
