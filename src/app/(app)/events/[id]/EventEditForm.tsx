"use client";

import { useState, useTransition } from "react";

type EventData = {
  id: string;
  title: string;
  description: string | null;
  date_time: string;
  location: string | null;
  capacity: number;
};

export function EventEditForm({
  event,
  updateAction,
}: {
  event: EventData;
  updateAction: (eventId: string, formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-300"
        >
          Edit event details
        </button>
      </section>
    );
  }

  const dtLocal = event.date_time
    ? new Date(event.date_time).toISOString().slice(0, 16)
    : "";

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Edit event</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Cancel
        </button>
      </div>
      <form
        className="mt-3 flex flex-col gap-3"
        action={(fd) => {
          startTransition(async () => {
            await updateAction(event.id, fd);
            setOpen(false);
          });
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Title</span>
          <input
            name="title"
            required
            defaultValue={event.title}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Description</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={event.description ?? ""}
            className="resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Date & time</span>
            <input
              name="date_time"
              type="datetime-local"
              required
              defaultValue={dtLocal}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Capacity</span>
            <input
              name="capacity"
              type="number"
              min={1}
              required
              defaultValue={event.capacity}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Location</span>
          <input
            name="location"
            defaultValue={event.location ?? ""}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="mt-1 h-10 rounded-xl bg-zinc-950 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </section>
  );
}
