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
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 border-b border-border-strong py-2 transition-colors focus-within:border-ink">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          className="text-muted"
        >
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search a teammate, a hobby, an event…"
          className="w-full bg-transparent text-[14px] text-ink placeholder:text-mute-soft focus:outline-none"
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setOpen(false);
            }}
            className="text-[11px] uppercase tracking-wider text-muted hover:text-ink"
          >
            Clear
          </button>
        ) : (
          <span className="hidden text-[10px] uppercase tracking-[0.18em] text-mute-soft sm:inline">
            ⌘K
          </span>
        )}
      </div>

      {open && q.trim() ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-96 overflow-y-auto rounded-[10px] border border-border bg-surface shadow-[var(--shadow-lift)]">
          <div className="px-4 py-2.5 eyebrow">
            {loading
              ? "Searching…"
              : error
                ? "Search failed — try again"
                : hasResults
                  ? "Results"
                  : "Nothing found"}
          </div>

          {events.length > 0 && (
            <div className="border-t border-border py-2">
              <div className="px-4 pb-1.5 text-[11px] uppercase tracking-[0.14em] text-muted">
                Events
              </div>
              <div className="flex flex-col">
                {events.map((e) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.id}`}
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 text-[13px] transition hover:bg-surface-sunk"
                  >
                    <div className="font-medium text-ink">{e.title}</div>
                    <div className="text-[11px] text-muted">
                      {new Date(e.date_time).toLocaleString()}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {people.length > 0 && (
            <div className="border-t border-border py-2">
              <div className="px-4 pb-1.5 text-[11px] uppercase tracking-[0.14em] text-muted">
                People
              </div>
              <div className="flex flex-col">
                {people.map((p) => (
                  <Link
                    key={p.user_id}
                    href={`/people/${p.user_id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-[13px] transition hover:bg-surface-sunk"
                  >
                    <Avatar
                      src={p.avatar_url}
                      initials={`${p.first_name.charAt(0)}${p.last_name.charAt(0)}`}
                      size="sm"
                    />
                    <div className="font-medium text-ink">
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
