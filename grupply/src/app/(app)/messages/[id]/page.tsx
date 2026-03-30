import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";

import { MessagesThread } from "./MessagesThread";
import { SendMessageForm } from "./SendMessageForm";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: participants } = await supabase
    .from("conversation_participants")
    .select("user_id, profiles(first_name, last_name, avatar_url)")
    .eq("conversation_id", id);

  const allowed = (participants ?? []).some((p) => p.user_id === userId);
  if (!allowed) {
    redirect(
      "/messages?error=" +
        encodeURIComponent(
          "You don't have access to this conversation, or it could not be loaded.",
        ),
    );
  }

  const otherParticipant = (participants ?? []).find((p) => p.user_id !== userId);
  const raw = otherParticipant?.profiles as unknown as
    | { first_name: string; last_name: string; avatar_url: string | null }
    | { first_name: string; last_name: string; avatar_url: string | null }[]
    | null;
  const partnerProfile = Array.isArray(raw) ? raw[0] : raw;
  const partnerName = partnerProfile
    ? `${partnerProfile.first_name} ${partnerProfile.last_name}`
    : "Conversation";
  const partnerInitials = partnerProfile
    ? `${partnerProfile.first_name.charAt(0)}${partnerProfile.last_name.charAt(0)}`
    : "?";
  const partnerAvatarUrl = partnerProfile?.avatar_url ?? null;

  const { data: messages } = await supabase
    .from("messages")
    .select("id,sender_id,content,created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(100);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Avatar src={partnerAvatarUrl} initials={partnerInitials} size="sm" />
          <div className="text-sm font-semibold">{partnerName}</div>
        </div>
        <Link
          href="/messages"
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Back to inbox
        </Link>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <MessagesThread
          conversationId={id}
          currentUserId={userId}
          initialMessages={messages ?? []}
        />
      </section>

      <SendMessageForm conversationId={id} />
    </div>
  );
}
