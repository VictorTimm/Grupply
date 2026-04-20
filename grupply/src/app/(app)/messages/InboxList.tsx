"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/Avatar";

export type InboxEntry = {
  id: string;
  partnerName: string;
  partnerInitials: string;
  partnerAvatarUrl: string | null;
  lastMessage: string | null;
  lastAt: string | null;
};

function formatShortTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (daysAgo < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function InboxList({ entries }: { entries: InboxEntry[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col">
      {entries.length === 0 ? (
        <p className="px-1 py-3 text-[13px] text-muted">
          No conversations yet.
        </p>
      ) : (
        entries.map((c, i) => {
          const active = pathname === `/messages/${c.id}`;
          return (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className={`group relative flex items-start gap-3 px-3 py-3 transition-colors ${
                i === 0 ? "" : "border-t border-border"
              } ${active ? "bg-surface-sunk" : "hover:bg-surface-sunk/60"}`}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute left-0 top-0 bottom-0 w-[3px] bg-ember"
                />
              ) : null}
              <Avatar
                src={c.partnerAvatarUrl}
                initials={c.partnerInitials}
                size="sm"
                shape="squircle"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="truncate text-[14px] font-medium text-ink">
                    {c.partnerName}
                  </div>
                  {c.lastAt ? (
                    <span className="shrink-0 text-[11px] uppercase tracking-[0.1em] text-muted">
                      {formatShortTime(c.lastAt)}
                    </span>
                  ) : null}
                </div>
                {c.lastMessage ? (
                  <div className="mt-0.5 truncate text-[12px] text-muted">
                    {c.lastMessage}
                  </div>
                ) : (
                  <div className="mt-0.5 text-[12px] italic text-mute-soft">
                    No messages yet
                  </div>
                )}
              </div>
            </Link>
          );
        })
      )}
    </nav>
  );
}
