"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import { markNotificationReadAction } from "./actions";

type NotificationRow = {
  id: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

export function NotificationsPanel({
  initialNotifications,
}: {
  initialNotifications: NotificationRow[];
}) {
  const [items, setItems] = useState<NotificationRow[]>(initialNotifications);
  const [realtimeStatus, setRealtimeStatus] = useState<
    "connected" | "reconnecting" | "error"
  >("connected");
  const [pending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read_at).length,
    [items],
  );

  const displayItems = showAll ? items : items.slice(0, 5);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let retryCount = 0;
    const maxRetries = 5;

    function subscribe() {
      const channel = supabase
        .channel("notifications-feed")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          (payload) => {
            const n = payload.new as NotificationRow;
            setItems((prev) => [n, ...prev].slice(0, 50));
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setRealtimeStatus("connected");
            retryCount = 0;
          } else if (status === "CHANNEL_ERROR") {
            setRealtimeStatus("error");
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = Math.min(1000 * 2 ** retryCount, 30000);
              setTimeout(() => {
                void supabase.removeChannel(channel);
                subscribe();
              }, delay);
            }
          } else {
            setRealtimeStatus("reconnecting");
          }
        });

      return channel;
    }

    const channel = subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  function markAllRead() {
    const unread = items.filter((n) => !n.read_at);
    if (unread.length === 0) return;
    startTransition(async () => {
      for (const n of unread) {
        await markNotificationReadAction(n.id);
      }
      setItems((prev) =>
        prev.map((x) =>
          x.read_at ? x : { ...x, read_at: new Date().toISOString() },
        ),
      );
    });
  }

  return (
    <section className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:border dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none lg:p-7">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Notifications
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              disabled={pending}
              className="hover:text-[#0052FF] hover:underline disabled:opacity-50 dark:hover:text-[#5c8fff]"
            >
              Mark all read
            </button>
          )}
          <span>{unreadCount} unread</span>
          <span
            className={
              realtimeStatus === "connected"
                ? "rounded-full bg-[#00D05A] px-3 py-1 text-xs font-semibold text-white shadow-sm"
                : realtimeStatus === "error"
                  ? "rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                  : "rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
            }
          >
            {realtimeStatus === "connected"
              ? "Live"
              : realtimeStatus === "error"
                ? "Offline"
                : "Reconnecting…"}
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {items.length === 0 ? (
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            You&apos;re all caught up.
          </div>
        ) : (
          <>
            {displayItems.map((n) => (
              <div
                key={n.id}
                className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 ${
                  n.read_at
                    ? "border-zinc-100/80 dark:border-zinc-800/80"
                    : "border-zinc-200/90 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/40"
                }`}
              >
                <div className="min-w-0">
                  <div
                    className={`text-sm ${
                      n.read_at
                        ? "text-zinc-500 dark:text-zinc-400"
                        : "font-medium"
                    }`}
                  >
                    {n.message}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                    {formatRelativeTime(n.created_at)}
                  </div>
                </div>

                {!n.read_at && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await markNotificationReadAction(n.id);
                        if (!res.ok) return;
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === n.id
                              ? { ...x, read_at: new Date().toISOString() }
                              : x,
                          ),
                        );
                      });
                    }}
                    className="shrink-0 rounded-xl border border-zinc-200/90 px-3 py-1.5 text-xs text-zinc-600 transition hover:bg-white disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Read
                  </button>
                )}
              </div>
            ))}

            {items.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
              >
                {showAll
                  ? "Show less"
                  : `Show ${items.length - 5} more`}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function formatRelativeTime(isoDate: string) {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
