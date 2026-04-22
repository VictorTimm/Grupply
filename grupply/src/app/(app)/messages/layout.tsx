import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { InboxList, type InboxEntry } from "./InboxList";

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: myParticipations } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  const convoIds = (myParticipations ?? []).map(
    (c) => c.conversation_id as string,
  );

  const entries: InboxEntry[] = [];

  if (convoIds.length > 0) {
    // Single query for all partner participant rows across every conversation.
    const { data: partnerRows } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", convoIds)
      .neq("user_id", userId);

    const partnerIds = Array.from(
      new Set((partnerRows ?? []).map((row) => row.user_id as string)),
    );
    const { data: partnerProfiles } = partnerIds.length
      ? await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, avatar_url")
          .in("user_id", partnerIds)
      : { data: [] };

    // Single query for recent messages; fetch enough rows so we can find
    // the latest per conversation without multiple round-trips.
    const msgLimit = Math.max(convoIds.length * 10, 50);
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", convoIds)
      .order("created_at", { ascending: false })
      .limit(msgLimit);

    // Build lookup: conversation_id → last message (already ordered desc, so first hit wins)
    const lastMsgByConvo = new Map<
      string,
      { content: string; created_at: string }
    >();
    for (const msg of recentMessages ?? []) {
      const cid = msg.conversation_id as string;
      if (!lastMsgByConvo.has(cid)) {
        lastMsgByConvo.set(cid, {
          content: msg.content as string,
          created_at: msg.created_at as string,
        });
      }
    }

    // Build lookup: conversation_id → partner participant row
    const profileByUserId = new Map(
      (partnerProfiles ?? []).map((profile) => [
        profile.user_id as string,
        {
          first_name: profile.first_name as string,
          last_name: profile.last_name as string,
          avatar_url: profile.avatar_url as string | null,
        },
      ]),
    );

    const partnerByConvo = new Map<
      string,
      { first_name: string; last_name: string; avatar_url: string | null }
    >();
    for (const row of partnerRows ?? []) {
      const cid = row.conversation_id as string;
      if (partnerByConvo.has(cid)) continue;
      const profile = profileByUserId.get(row.user_id as string) ?? null;
      if (profile) partnerByConvo.set(cid, profile);
    }

    for (const cid of convoIds) {
      const partnerProfile = partnerByConvo.get(cid) ?? null;
      const lastMsg = lastMsgByConvo.get(cid) ?? null;

      entries.push({
        id: cid,
        partnerName: partnerProfile
          ? `${partnerProfile.first_name} ${partnerProfile.last_name}`
          : "Unknown",
        partnerInitials: partnerProfile
          ? `${partnerProfile.first_name.charAt(0)}${partnerProfile.last_name.charAt(0)}`
          : "?",
        partnerAvatarUrl: partnerProfile?.avatar_url ?? null,
        lastMessage: lastMsg?.content ?? null,
        lastAt: lastMsg?.created_at ?? null,
      });
    }
  }

  entries.sort((a, b) => {
    if (!a.lastAt && !b.lastAt) return 0;
    if (!a.lastAt) return 1;
    if (!b.lastAt) return -1;
    return b.lastAt.localeCompare(a.lastAt);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-0 border border-border rounded-[16px] bg-surface overflow-hidden md:grid-cols-[320px_1fr] min-h-[560px]">
        <aside className="border-b border-border md:border-b-0 md:border-r">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
              Messages
            </h2>
            <span className="text-[11px] text-muted tabular-nums">
              {entries.length}
            </span>
          </div>
          <InboxList entries={entries} />
        </aside>
        <section className="min-w-0 bg-canvas">{children}</section>
      </div>
    </div>
  );
}
