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

  const displayItems = showAll ? items : items.slice(0, 4);

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
    <section className="rounded-[14px] border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border">
        <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
          Notifications
        </h2>
        <div className="flex items-center gap-3">
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              disabled={pending}
              className="text-[12px] text-muted hover:text-ember-deep disabled:opacity-50"
            >
              Mark all read
            </button>
          ) : null}
          <span
            className={`flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] ${
              realtimeStatus === "connected"
                ? "text-sage"
                : realtimeStatus === "error"
                  ? "text-clay"
                  : "text-muted"
            }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                realtimeStatus === "connected"
                  ? "bg-sage animate-pulse"
                  : realtimeStatus === "error"
                    ? "bg-clay"
                    : "bg-mute-soft"
              }`}
            />
            {realtimeStatus === "connected"
              ? "Live"
              : realtimeStatus === "error"
                ? "Offline"
                : "Reconnecting"}
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        {items.length === 0 ? (
          <div className="px-5 py-5 text-[14px] text-muted">
            You&rsquo;re all caught up.
          </div>
        ) : (
          <>
            {displayItems.map((n, i) => (
              <div
                key={n.id}
                className={`group flex items-start gap-3 px-5 py-3 ${
                  i === 0 ? "" : "border-t border-border"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                    n.read_at ? "bg-transparent" : "bg-ember"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-[14px] leading-relaxed ${
                      n.read_at ? "text-muted" : "text-ink"
                    }`}
                  >
                    {n.message}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-mute-soft">
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
                    className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ember-deep disabled:opacity-50"
                  >
                    Read
                  </button>
                )}
              </div>
            ))}

            {items.length > 4 ? (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="px-5 py-3 border-t border-border text-left text-[12px] uppercase tracking-[0.14em] text-muted hover:text-ember-deep"
              >
                {showAll
                  ? "Show less"
                  : `${items.length - 4} more ${items.length - 4 === 1 ? "thing" : "things"}`}
              </button>
            ) : null}
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
