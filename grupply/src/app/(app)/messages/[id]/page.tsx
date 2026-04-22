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

  const { data: participants, error: participantsError } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", id);

  const allowed = (participants ?? []).some((p) => p.user_id === userId);

  if (participantsError || !allowed) {
    redirect(
      "/messages?error=" +
        encodeURIComponent(
          "You don't have access to this conversation, or it could not be loaded.",
        ),
    );
  }

  const otherParticipant = (participants ?? []).find(
    (p) => p.user_id !== userId,
  );
  const otherParticipantId = otherParticipant?.user_id as string | undefined;
  const { data: partnerProfile } = otherParticipantId
    ? await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url")
        .eq("user_id", otherParticipantId)
        .single()
    : { data: null };
  const partnerName = partnerProfile
    ? `${partnerProfile.first_name} ${partnerProfile.last_name}`
    : "Conversation";
  const partnerInitials = partnerProfile
    ? `${partnerProfile.first_name.charAt(0)}${partnerProfile.last_name.charAt(0)}`
    : "?";
  const partnerAvatarUrl = partnerProfile?.avatar_url ?? null;
  const partnerUserId = partnerProfile?.user_id ?? otherParticipant?.user_id;

  const { data: messages } = await supabase
    .from("messages")
    .select("id,sender_id,content,created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  return (
    <div className="flex h-full min-h-[520px] flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={partnerAvatarUrl}
            initials={partnerInitials}
            size="sm"
            shape="squircle"
          />
          <div className="flex flex-col">
            {partnerUserId ? (
              <Link
                href={`/people/${partnerUserId}`}
                className="text-[14px] font-medium text-ink hover:text-ember"
              >
                {partnerName}
              </Link>
            ) : (
              <span className="text-[14px] font-medium text-ink">
                {partnerName}
              </span>
            )}
            <span className="text-[11px] uppercase tracking-[0.12em] text-muted">
              Direct message
            </span>
          </div>
        </div>
        <Link
          href="/messages"
          className="text-[12px] uppercase tracking-[0.12em] text-muted hover:text-ink md:hidden"
        >
          Back
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <MessagesThread
          conversationId={id}
          currentUserId={userId}
          initialMessages={messages ?? []}
        />
      </div>

      <div className="border-t border-border px-5 py-3 bg-surface">
        <SendMessageForm conversationId={id} />
      </div>
    </div>
  );
}
