"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const RPC_ERROR_MAP: Record<string, string> = {
  not_authenticated: "You must be logged in.",
  invalid_recipient: "Invalid recipient selected.",
  profile_missing: "Your profile is incomplete. Please complete registration.",
  recipient_not_in_organization: "That person is not in your organization.",
};

function friendlyError(raw: string): string {
  for (const [key, msg] of Object.entries(RPC_ERROR_MAP)) {
    if (raw.includes(key)) return msg;
  }
  return "Could not start conversation. Please try again.";
}

export async function startConversationAction(formData: FormData) {
  const recipientId = String(formData.get("recipient_id") ?? "").trim();
  if (!recipientId) {
    redirect("/messages?error=" + encodeURIComponent("Please select a colleague first."));
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  const organizationId = profile?.organization_id as string | undefined;
  if (!organizationId) redirect("/register");

  const { data: conversationId, error: convoError } = await supabase.rpc(
    "get_or_create_direct_conversation",
    { recipient_user_id: recipientId },
  );

  if (convoError || !conversationId) {
    if (convoError) {
      console.error("[startConversationAction] RPC error:", convoError.message, {
        recipientId,
        userId,
      });
    }
    const msg = convoError
      ? friendlyError(convoError.message)
      : "Could not create conversation. Please try again.";
    redirect("/messages?error=" + encodeURIComponent(msg));
  }

  // The SECURITY DEFINER RPC already atomically creates both participant rows
  // and validates org membership. Trusting its return value is safe — no
  // secondary SELECT needed (and the full-conversation SELECT was causing RLS
  // errors due to the self-referential EXISTS policy on conversation_participants).
  const convId = String(conversationId);

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    user_id: userId,
    action: "conversation.start",
    entity_type: "conversation",
    entity_id: convId,
  });

  revalidatePath("/messages");
  redirect(`/messages/${convId}`);
}

export async function sendMessageAction(
  conversationId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { ok: false, error: "Message cannot be empty." };

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  const organizationId = profile?.organization_id as string | undefined;
  if (!organizationId) redirect("/register");

  const { data: participant } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .limit(1);

  if (!participant || participant.length === 0) {
    return { ok: false, error: "You are not a participant in this conversation." };
  }

  const { error: insertError } = await supabase.from("messages").insert({
    organization_id: organizationId,
    conversation_id: conversationId,
    sender_id: userId,
    content,
  });

  if (insertError) {
    console.error("[sendMessageAction] Insert error:", insertError.message, {
      conversationId,
      userId,
      code: insertError.code,
    });
    return { ok: false, error: "Failed to send message. Please try again." };
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    user_id: userId,
    action: "message.send",
    entity_type: "conversation",
    entity_id: conversationId,
  });

  // Revalidate both the conversation thread and the layout-level inbox list
  // so that last-message previews and ordering update immediately for the sender.
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages", "layout");
  return { ok: true };
}
