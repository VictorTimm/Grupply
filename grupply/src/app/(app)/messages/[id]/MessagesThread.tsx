"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type MessageRow = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

function formatDayHeader(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function MessagesThread({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageRow[];
}) {
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [status, setStatus] = useState<"connected" | "reconnecting" | "error">(
    "connected",
  );
  const [retryExhausted, setRetryExhausted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Merge server-refreshed initialMessages into local state without losing
  // optimistically-appended messages that may not yet be in the server snapshot.
  useEffect(() => {
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const incoming = initialMessages.filter((m) => !existingIds.has(m.id));
      if (incoming.length === 0) return prev;
      return [...prev, ...incoming].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      );
    });
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const subscribe = useCallback(() => {
    const supabase = createSupabaseBrowserClient();
    let retryCount = 0;
    const maxRetries = 5;

    function connect() {
      const channel = supabase
        .channel(`messages-${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            setMessages((prev) => {
              const msg = payload.new as MessageRow;
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          },
        )
        .subscribe((st) => {
          if (st === "SUBSCRIBED") {
            setStatus("connected");
            setRetryExhausted(false);
            retryCount = 0;
          } else if (st === "CHANNEL_ERROR") {
            setStatus("error");
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = Math.min(1000 * 2 ** retryCount, 30_000);
              setTimeout(() => {
                void supabase.removeChannel(channel);
                connect();
              }, delay);
            } else {
              console.error(
                "[MessagesThread] Realtime channel failed after max retries",
                { conversationId },
              );
              setRetryExhausted(true);
            }
          } else {
            setStatus("reconnecting");
          }
        });

      return channel;
    }

    const channel = connect();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    return subscribe();
  }, [subscribe]);

  const groups = useMemo(() => {
    const out: Array<{ day: string; items: MessageRow[] }> = [];
    for (const m of messages) {
      const day = formatDayHeader(m.created_at);
      const last = out[out.length - 1];
      if (last && last.day === day) {
        last.items.push(m);
      } else {
        out.push({ day, items: [m] });
      }
    }
    return out;
  }, [messages]);

  return (
    <div className="flex flex-col gap-5">
      {status !== "connected" ? (
        <div
          className={`self-center flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em] ${
            status === "error"
              ? "bg-clay/10 text-clay"
              : "bg-ember-wash text-ember-deep"
          }`}
        >
          {status === "error"
            ? retryExhausted
              ? "Live updates unavailable."
              : "Connection lost. Retrying…"
            : "Reconnecting…"}
          {retryExhausted ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="underline underline-offset-2"
            >
              Reload
            </button>
          ) : null}
        </div>
      ) : null}

      {messages.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-display text-[18px] text-ink">
            {"No messages yet"}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            Kick things off with a quick hello.
          </p>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.day} className="flex flex-col gap-2">
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
                {g.day}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {g.items.map((m, i) => {
              const isMine = m.sender_id === currentUserId;
              const prev = g.items[i - 1];
              const next = g.items[i + 1];
              const prevMine = prev?.sender_id === m.sender_id;
              const nextMine = next?.sender_id === m.sender_id;

              const radius = isMine
                ? [
                    "rounded-tl-[14px]",
                    "rounded-bl-[14px]",
                    prevMine ? "rounded-tr-[4px]" : "rounded-tr-[14px]",
                    nextMine ? "rounded-br-[4px]" : "rounded-br-[14px]",
                  ].join(" ")
                : [
                    "rounded-tr-[14px]",
                    "rounded-br-[14px]",
                    prevMine === false && prev ? "rounded-tl-[4px]" : "rounded-tl-[14px]",
                    nextMine === false && next ? "rounded-bl-[4px]" : "rounded-bl-[14px]",
                  ].join(" ");

              return (
                <div
                  key={m.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[72%] px-3.5 py-2 text-[14px] leading-snug ${radius} ${
                      isMine
                        ? "bg-ink text-canvas"
                        : "bg-surface-sunk text-ink border border-border"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {m.content}
                    </div>
                    <div
                      className={`mt-1 text-[10px] uppercase tracking-[0.1em] ${
                        isMine ? "text-canvas/60" : "text-muted"
                      }`}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
