"use client";

import { useState, useTransition } from "react";

import {
  buttonClass,
  inputClass,
  labelClass,
  textareaClass,
} from "@/components/ui";

const MAX_HOBBY_LENGTH = 50;
const MAX_HOBBIES = 20;
type HobbyOption = {
  id: string;
  name: string;
  isOwnedCustom: boolean;
};

export function ProfileForm({
  profile,
  allHobbies,
  updateAction,
  deleteCustomHobbyAction,
}: {
  profile: {
    first_name: string;
    last_name: string;
    biography: string;
    current_hobbies: string[];
  };
  allHobbies: HobbyOption[];
  updateAction: (formData: FormData) => Promise<void>;
  deleteCustomHobbyAction: (hobbyId: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [selectedHobbies, setSelectedHobbies] = useState<Set<string>>(
    new Set(profile.current_hobbies),
  );
  const [customInput, setCustomInput] = useState("");
  const [hobbyOptions, setHobbyOptions] = useState(allHobbies);
  const [deletingHobbyIds, setDeletingHobbyIds] = useState<Set<string>>(
    new Set(),
  );

  const catalogNames = new Set(hobbyOptions.map((h) => h.name));
  const customHobbies = Array.from(selectedHobbies).filter(
    (name) => !catalogNames.has(name),
  );

  function toggleSelectedHobby(name: string) {
    setSaved(false);
    setSelectedHobbies((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else if (next.size < MAX_HOBBIES) next.add(name);
      return next;
    });
  }

  function addCustomHobby() {
    const name = customInput.trim().slice(0, MAX_HOBBY_LENGTH);
    if (!name) return;
    if (selectedHobbies.size >= MAX_HOBBIES) return;
    setSaved(false);
    setSelectedHobbies((prev) => new Set(prev).add(name));
    setCustomInput("");
  }

  function removeUnsavedCustomHobby(name: string) {
    setSaved(false);
    setSelectedHobbies((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }

  async function deleteCustomHobby(hobbyId: string, hobbyName: string) {
    if (deletingHobbyIds.has(hobbyId)) return;

    setSaved(false);
    setDeletingHobbyIds((prev) => new Set(prev).add(hobbyId));

    try {
      await deleteCustomHobbyAction(hobbyId);
      setSelectedHobbies((prev) => {
        const next = new Set(prev);
        next.delete(hobbyName);
        return next;
      });
      setHobbyOptions((prev) => prev.filter((hobby) => hobby.id !== hobbyId));
    } finally {
      setDeletingHobbyIds((prev) => {
        const next = new Set(prev);
        next.delete(hobbyId);
        return next;
      });
    }
  }

  return (
    <form
      className="flex flex-col gap-6"
      action={(fd) => {
        fd.set("hobbies", Array.from(selectedHobbies).join(","));
        setSaved(false);
        startTransition(async () => {
          await updateAction(fd);
          setSaved(true);
        });
      }}
    >
      <section className="rounded-[14px] border border-border bg-surface p-6 flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_3fr] md:gap-6">
          <label className="block">
            <span className={labelClass()}>First name</span>
            <input
              name="first_name"
              required
              defaultValue={profile.first_name}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <span className={labelClass()}>Last name</span>
            <input
              name="last_name"
              required
              defaultValue={profile.last_name}
              className={inputClass()}
            />
          </label>
        </div>
        <label className="block">
          <span className={labelClass()}>Bio</span>
          <textarea
            name="biography"
            rows={4}
            placeholder={"A few lines so teammates know who they\u2019re showing up for\u2026"}
            defaultValue={profile.biography}
            className={textareaClass()}
          />
        </label>
      </section>

      <section className="rounded-[14px] border border-border bg-surface p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
            Hobbies
          </h2>
          <span className="font-mono text-[11px] text-muted">
            {selectedHobbies.size}/{MAX_HOBBIES}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {hobbyOptions.map((h) => {
            const active = selectedHobbies.has(h.name);
            const isDeleting = deletingHobbyIds.has(h.id);
            return (
              <span key={h.id} className="group relative">
                <button
                  type="button"
                  onClick={() => toggleSelectedHobby(h.name)}
                  disabled={isDeleting}
                  className={`relative inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] transition ${
                    active
                      ? "border-ember bg-ember-wash text-ember-deep"
                      : "border-border text-ink-soft hover:border-border-strong hover:bg-surface-sunk"
                  } ${isDeleting ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  {active ? (
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ember" />
                  ) : null}
                  {h.name}
                </button>
                {active && h.isOwnedCustom ? (
                  <button
                    type="button"
                    aria-label={`Delete ${h.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void deleteCustomHobby(h.id, h.name);
                    }}
                    disabled={isDeleting}
                    className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[10px] leading-none text-surface opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-100"
                  >
                    {isDeleting ? "…" : "×"}
                  </button>
                ) : null}
              </span>
            );
          })}

          {customHobbies.map((name) => (
            <span key={`custom-${name}`} className="group relative">
              <button
                type="button"
                onClick={() => toggleSelectedHobby(name)}
                className="inline-flex items-center gap-1.5 rounded-full border border-ember bg-ember-wash px-3.5 py-1.5 text-[13px] text-ember-deep"
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ember" />
                {name}
              </button>
              <button
                type="button"
                aria-label={`Delete ${name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  removeUnsavedCustomHobby(name);
                }}
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[10px] leading-none text-surface opacity-0 transition-opacity group-hover:opacity-100"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomHobby();
              }
            }}
            placeholder={"Add one that\u2019s missing\u2026"}
            maxLength={MAX_HOBBY_LENGTH}
            className={inputClass({ size: "sm", className: "flex-1" })}
          />
          <button
            type="button"
            onClick={addCustomHobby}
            disabled={!customInput.trim() || selectedHobbies.size >= MAX_HOBBIES}
            className={buttonClass({ variant: "secondary", size: "sm" })}
          >
            Add
          </button>
        </div>
      </section>

      <input type="hidden" name="hobbies" value="" />

      <div className="sticky bottom-0 -mx-5 mt-4 flex items-center justify-between gap-4 border-t border-border bg-canvas/95 px-5 py-4 backdrop-blur md:-mx-8 md:px-8">
        <div className="text-[13px] text-muted">
          {saved ? (
            <span className="text-sage">Saved &mdash; your profile is live.</span>
          ) : (
            "Changes save when you click."
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className={buttonClass({ variant: "primary", size: "md" })}
        >
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
