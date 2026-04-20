"use client";

import { useState, useTransition } from "react";

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
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h1 className="text-sm font-semibold">Edit profile</h1>
      <form
        className="mt-4 flex flex-col gap-4"
        action={(fd) => {
          fd.set("hobbies", Array.from(selectedHobbies).join(","));
          setSaved(false);
          startTransition(async () => {
            await updateAction(fd);
            setSaved(true);
          });
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">First name</span>
            <input
              name="first_name"
              required
              defaultValue={profile.first_name}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Last name</span>
            <input
              name="last_name"
              required
              defaultValue={profile.last_name}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Bio</span>
          <textarea
            name="biography"
            rows={3}
            defaultValue={profile.biography}
            className="resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Hobbies</span>
          <div className="flex flex-wrap gap-2">
            {hobbyOptions.map((h) => {
              const active = selectedHobbies.has(h.name);
              const isDeleting = deletingHobbyIds.has(h.id);
              return (
                <span
                  key={h.id}
                  className="group relative"
                >
                  <button
                    type="button"
                    onClick={() => toggleSelectedHobby(h.name)}
                    disabled={isDeleting}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      active
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-black"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    } ${isDeleting ? "cursor-not-allowed opacity-60" : ""}`}
                  >
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
                      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-600 text-[10px] leading-none text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-100 dark:bg-zinc-400 dark:text-black"
                    >
                      {isDeleting ? "…" : "×"}
                    </button>
                  ) : null}
                </span>
              );
            })}

            {customHobbies.map((name) => (
              <span
                key={`custom-${name}`}
                className="group relative"
              >
                <button
                  type="button"
                  onClick={() => toggleSelectedHobby(name)}
                  className="rounded-full bg-zinc-950 px-3 py-1 text-xs text-white transition dark:bg-white dark:text-black"
                >
                  {name}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeUnsavedCustomHobby(name);
                  }}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-600 text-[10px] leading-none text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-zinc-400 dark:text-black"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
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
              placeholder="Add a custom hobby…"
              maxLength={MAX_HOBBY_LENGTH}
              className="h-9 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
            />
            <button
              type="button"
              onClick={addCustomHobby}
              disabled={
                !customInput.trim() || selectedHobbies.size >= MAX_HOBBIES
              }
              className="h-9 rounded-xl border border-zinc-200 px-3 text-sm transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              Add
            </button>
          </div>

          <div className="text-xs text-zinc-400 dark:text-zinc-500">
            {selectedHobbies.size}/{MAX_HOBBIES} selected
          </div>
        </div>

        <input type="hidden" name="hobbies" value="" />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {pending ? "Saving…" : "Save profile"}
          </button>
          {saved && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              Profile updated
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
