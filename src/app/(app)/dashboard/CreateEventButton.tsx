"use client";

import { useState, useTransition } from "react";

import { createEventAction } from "./actions";

export function CreateEventButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        Create event
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold">Create event</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                Close
              </button>
            </div>

            <form
              className="mt-4 flex flex-col gap-3"
              action={(formData) => {
                setError(null);
                startTransition(async () => {
                  const res = await createEventAction(formData);
                  if (!res.ok) {
                    setError(res.message);
                    return;
                  }
                  setOpen(false);
                });
              }}
            >
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">Title</span>
                <input
                  name="title"
                  required
                  className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">Description</span>
                <textarea
                  name="description"
                  rows={3}
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
                    className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-zinc-700 dark:text-zinc-300">Capacity</span>
                  <input
                    name="capacity"
                    type="number"
                    min={1}
                    defaultValue={10}
                    required
                    className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">Location</span>
                <input
                  name="location"
                  className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
                />
              </label>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="mt-1 h-11 rounded-xl bg-zinc-950 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {pending ? "Creating…" : "Create"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

