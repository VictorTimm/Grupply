"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/Avatar";

type SearchEvent = {
  id: string;
  title: string;
  date_time: string;
  location: string | null;
};

type SearchPerson = {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
};

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [events, setEvents] = useState<SearchEvent[]>([]);
  const [people, setPeople] = useState<SearchPerson[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const hasResults = useMemo(
    () => events.length > 0 || people.length > 0,
    [events.length, people.length],
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setEvents([]);
      setPeople([]);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);

    const handle = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        try {
          const res = await fetch(
            `/api/search?q=${encodeURIComponent(q)}`,
            { signal: controller.signal },
          );
          if (!res.ok) {
            setEvents([]);
            setPeople([]);
            if (retries === maxRetries) setError(true);
            retries++;
            continue;
          }
          const json = (await res.json()) as {
            events: SearchEvent[];
            people: SearchPerson[];
          };
          setEvents(json.events ?? []);
          setPeople(json.people ?? []);
          setError(false);
          break;
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          if (retries === maxRetries) {
            setEvents([]);
            setPeople([]);
            setError(true);
          }
          retries++;
          if (retries <= maxRetries) {
            await new Promise((r) => setTimeout(r, 500 * retries));
          }
        }
      }
      setLoading(false);
    }, 250);

    return () => {
      window.clearTimeout(handle);
    };
  }, [q]);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search events or people…"
        className="h-11 w-full rounded-2xl border border-zinc-200/90 bg-white px-4 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-[#0052FF]"
      />

      {open && q.trim() ? (
        <div className="absolute left-0 right-0 top-[3.25rem] z-40 max-h-96 overflow-y-auto rounded-[20px] border border-zinc-200/90 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-950">
          <div className="p-3 text-xs text-zinc-500 dark:text-zinc-400">
            {loading
              ? "Searching…"
              : error
                ? "Search failed. Try again."
                : hasResults
                  ? "Results"
                  : "No results found"}
          </div>

          {events.length > 0 && (
            <div className="border-t border-zinc-100 p-2 dark:border-zinc-900">
              <div className="px-2 pb-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Events
              </div>
              <div className="flex flex-col">
                {events.map((e) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.id}`}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-2 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(e.date_time).toLocaleString()}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {people.length > 0 && (
            <div className="border-t border-zinc-100 p-2 dark:border-zinc-900">
              <div className="px-2 pb-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                People
              </div>
              <div className="flex flex-col">
                {people.map((p) => (
                  <Link
                    key={p.user_id}
                    href={`/people/${p.user_id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <Avatar
                      src={p.avatar_url}
                      initials={`${p.first_name.charAt(0)}${p.last_name.charAt(0)}`}
                      size="sm"
                    />
                    <div className="font-medium">
                      {p.first_name} {p.last_name}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
