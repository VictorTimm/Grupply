"use client";

import { useEffect, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type MessageRow = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let retryCount = 0;
    const maxRetries = 5;

    function subscribe() {
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
            retryCount = 0;
          } else if (st === "CHANNEL_ERROR") {
            setStatus("error");
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = Math.min(1000 * 2 ** retryCount, 30000);
              setTimeout(() => {
                void supabase.removeChannel(channel);
                subscribe();
              }, delay);
            }
          } else {
            setStatus("reconnecting");
          }
        });

      return channel;
    }

    const channel = subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return (
    <div className="flex flex-col gap-2">
      {status !== "connected" && (
        <div
          className={`rounded-lg px-3 py-1.5 text-xs ${
            status === "error"
              ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
              : "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
          }`}
        >
          {status === "error"
            ? "Connection lost. Retrying…"
            : "Reconnecting…"}
        </div>
      )}
      {messages.length === 0 ? (
        <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No messages yet. Say hello!
        </div>
      ) : (
        messages.map((m) => {
          const isMine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                  isMine
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                    : "border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                <div className="mt-0.5">{m.content}</div>
                <div
                  className={`mt-1 text-xs ${
                    isMine
                      ? "text-zinc-400 dark:text-zinc-500"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}
