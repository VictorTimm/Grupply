import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { StartConversationForm } from "./StartConversationForm";

async function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  await fetch("http://127.0.0.1:7840/ingest/071fdb3d-186d-4d94-bc25-a5093692a8a6", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "054c30",
    },
    body: JSON.stringify({
      sessionId: "054c30",
      runId: "pre-fix-2",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; recipient?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;

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

  // If a recipient is pre-selected (e.g. from a "Message" button on another page),
  // auto-start or open the existing conversation immediately.
  const recipientId = resolvedParams?.recipient?.trim();
  if (recipientId && recipientId !== userId) {
    const { data: conversationId, error: rpcError } = await supabase.rpc(
      "get_or_create_direct_conversation",
      { recipient_user_id: recipientId },
    );
    // #region agent log
    await debugLog(
      "H3",
      "src/app/(app)/messages/page.tsx:autoRecipientRpc",
      "auto-recipient rpc result",
      {
        recipientIdPrefix: recipientId.slice(0, 8),
        hasConversationId: Boolean(conversationId),
        conversationIdPrefix: conversationId ? String(conversationId).slice(0, 8) : null,
        rpcError: rpcError?.message ?? null,
      },
    );
    // #endregion
    if (!rpcError && conversationId) {
      redirect(`/messages/${String(conversationId)}`);
    }
    // Fall through to the normal page with an error if the RPC failed.
  }

  const { data: people } = await supabase
    .from("profiles")
    .select("user_id,first_name,last_name")
    .eq("organization_id", organizationId)
    .neq("user_id", userId)
    .order("last_name", { ascending: true })
    .limit(100);

  const hasPeople = (people ?? []).length > 0;

  return (
    <div className="flex h-full min-h-[520px] flex-col items-center justify-center px-8 py-16 text-center">
      <div className="max-w-sm flex flex-col items-center gap-5">
        <div
          aria-hidden
          className="h-14 w-14 rounded-full border border-border-strong bg-ember-wash text-ember flex items-center justify-center"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="text-[13px] text-muted leading-relaxed">
          Pick a teammate and start a direct thread. Messages are private to
          the two of you.
        </p>

        {resolvedParams?.error ? (
          <div className="w-full border-l-2 border-clay bg-clay/5 px-3 py-2 text-[12px] text-clay text-left">
            {resolvedParams.error}
          </div>
        ) : null}

        {hasPeople ? (
          <StartConversationForm
            people={(people ?? []).map((p) => ({
              user_id: p.user_id as string,
              first_name: p.first_name as string,
              last_name: p.last_name as string,
            }))}
          />
        ) : (
          <p className="text-[12px] text-muted">
            No other members in your organization yet.
          </p>
        )}
      </div>
    </div>
  );
}
