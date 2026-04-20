"use client";

import { useState, useTransition } from "react";

import {
  buttonClass,
  inputClass,
  labelClass,
  textareaClass,
} from "@/components/ui";

type EventData = {
  id: string;
  title: string;
  description: string | null;
  date_time: string;
  location: string | null;
  capacity: number;
};

function toLocalDatetimeString(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

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
      <section className="rounded-[14px] border border-border bg-surface px-5 py-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-[13px] uppercase tracking-[0.14em] text-muted hover:text-ember-deep"
        >
          <span aria-hidden className="text-[15px] leading-none">&#x270E;</span>
          Edit details
        </button>
      </section>
    );
  }

  const dtLocal = event.date_time
    ? toLocalDatetimeString(event.date_time)
    : "";

  return (
    <section className="rounded-[14px] border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
          Edit details
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink"
        >
          Close
        </button>
      </div>
      <form
        className="flex flex-col gap-5"
        action={(fd) => {
          startTransition(async () => {
            await updateAction(event.id, fd);
            setOpen(false);
          });
        }}
      >
        <label className="block">
          <span className={labelClass()}>Title</span>
          <input
            name="title"
            required
            defaultValue={event.title}
            className={inputClass()}
          />
        </label>
        <label className="block">
          <span className={labelClass()}>Description</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={event.description ?? ""}
            className={textareaClass()}
          />
        </label>
        <div className="grid grid-cols-[3fr_2fr] gap-4">
          <label className="block">
            <span className={labelClass()}>Date &amp; time</span>
            <input
              name="date_time"
              type="datetime-local"
              required
              defaultValue={dtLocal}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <span className={labelClass()}>Seats</span>
            <input
              name="capacity"
              type="number"
              min={1}
              required
              defaultValue={event.capacity}
              className={inputClass()}
            />
          </label>
        </div>
        <label className="block">
          <span className={labelClass()}>Location</span>
          <input
            name="location"
            defaultValue={event.location ?? ""}
            className={inputClass()}
          />
        </label>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={buttonClass({ variant: "ghost", size: "md" })}
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={pending}
            className={buttonClass({ variant: "primary", size: "md" })}
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
