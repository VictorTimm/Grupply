"use client";

import { useTransition } from "react";

import { buttonClass, inputClass } from "@/components/ui";

import { startConversationAction } from "./actions";

export function StartConversationForm({
  people,
}: {
  people: Array<{ user_id: string; first_name: string; last_name: string }>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex w-full flex-col gap-2"
      action={(formData) => {
        startTransition(() => startConversationAction(formData));
      }}
    >
      <select
        name="recipient_id"
        className={inputClass()}
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
        className={buttonClass({ variant: "primary", size: "md", full: true })}
      >
        {pending ? "Starting…" : "Start conversation"}
      </button>
    </form>
  );
}
