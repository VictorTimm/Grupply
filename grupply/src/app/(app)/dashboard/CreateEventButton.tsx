"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { buttonClass, inputClass, labelClass, textareaClass } from "@/components/ui";

import { createEventAction } from "./actions";

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

type CreateEventButtonProps = {
  variant?: "primary" | "secondary";
  label?: string;
};

export function CreateEventButton({
  variant = "primary",
  label = "Start something",
}: CreateEventButtonProps = {}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        triggerRef.current?.focus();
      }
      wasOpenRef.current = false;
      return undefined;
    }

    wasOpenRef.current = true;
    const focusableElements = getFocusableElements(modalRef.current);
    focusableElements[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (!open) return;

      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const currentFocusableElements = getFocusableElements(modalRef.current);
      if (currentFocusableElements.length === 0) {
        event.preventDefault();
        modalRef.current?.focus();
        return;
      }

      const first = currentFocusableElements[0];
      const last = currentFocusableElements[currentFocusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass({ variant, size: "md" })}
      >
        <span aria-hidden className="text-[15px] leading-none">+</span>
        {label}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
        <div
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-ink/35 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-event-title"
            tabIndex={-1}
            className="my-auto w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[16px] border border-border bg-surface p-7 shadow-[var(--shadow-lift)] md:p-9"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow text-ember-deep">New event</div>
                <h2
                  id="create-event-title"
                  className="font-display text-[26px] font-medium tracking-tight text-ink mt-1.5"
                >
                  What are we gathering for?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink"
              >
                Close
              </button>
            </div>

            <form
              className="mt-7 flex flex-col gap-5"
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
              <label className="block">
                <span className={labelClass()}>Title</span>
                <input
                  name="title"
                  required
                  placeholder="Friday climbing — Brooklyn Boulders"
                  className={inputClass({ size: "lg" })}
                />
              </label>

              <label className="block">
                <span className={labelClass()}>Description</span>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Tell the crew what to expect…"
                  className={textareaClass()}
                />
              </label>

              <div className="grid grid-cols-[3fr_2fr] gap-4">
                <label className="block">
                  <span className={labelClass()}>When</span>
                  <input
                    name="date_time"
                    type="datetime-local"
                    required
                    className={inputClass()}
                  />
                </label>
                <label className="block">
                  <span className={labelClass()}>Seats</span>
                  <input
                    name="capacity"
                    type="number"
                    min={1}
                    defaultValue={10}
                    required
                    className={inputClass()}
                  />
                </label>
              </div>

              <label className="block">
                <span className={labelClass()}>Where</span>
                <input
                  name="location"
                  placeholder="Office lobby, Park, Zoom…"
                  className={inputClass()}
                />
              </label>

              {error ? (
                <div className="border-l-2 border-clay bg-clay/5 px-4 py-2.5 text-[13px] text-clay">
                  {error}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={buttonClass({ variant: "ghost", size: "md" })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className={buttonClass({ variant: "primary", size: "md" })}
                >
                  {pending ? "Creating…" : "Post it"}
                </button>
              </div>
            </form>
          </div>
        </div>
          ,
          document.body,
        )
        : null}
    </>
  );
}
