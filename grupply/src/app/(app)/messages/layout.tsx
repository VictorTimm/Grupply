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

  for (const cid of convoIds) {
    const { data: otherParticipants } = await supabase
      .from("conversation_participants")
      .select("user_id, profiles(first_name, last_name, avatar_url)")
      .eq("conversation_id", cid)
      .neq("user_id", userId)
      .limit(1);

    const partner = otherParticipants?.[0];
    const raw = partner?.profiles as unknown as
      | { first_name: string; last_name: string; avatar_url: string | null }
      | { first_name: string; last_name: string; avatar_url: string | null }[]
      | null;
    const partnerProfile = Array.isArray(raw) ? raw[0] : raw;
    const partnerName = partnerProfile
      ? `${partnerProfile.first_name} ${partnerProfile.last_name}`
      : "Unknown";
    const partnerInitials = partnerProfile
      ? `${partnerProfile.first_name.charAt(0)}${partnerProfile.last_name.charAt(0)}`
      : "?";
    const partnerAvatarUrl = partnerProfile?.avatar_url ?? null;

    const { data: lastMsg } = await supabase
      .from("messages")
      .select("content, created_at")
      .eq("conversation_id", cid)
      .order("created_at", { ascending: false })
      .limit(1);

    entries.push({
      id: cid,
      partnerName,
      partnerInitials,
      partnerAvatarUrl,
      lastMessage: (lastMsg?.[0]?.content as string | null) ?? null,
      lastAt: (lastMsg?.[0]?.created_at as string | null) ?? null,
    });
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
