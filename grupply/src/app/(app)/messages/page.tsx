import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";

import { StartConversationForm } from "./StartConversationForm";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
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

  const { data: myParticipations } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  const convoIds = (myParticipations ?? []).map(
    (c) => c.conversation_id as string,
  );

  type ConvoDisplay = {
    id: string;
    partnerName: string;
    partnerInitials: string;
    partnerAvatarUrl: string | null;
    lastMessage: string | null;
    lastAt: string | null;
  };

  const convos: ConvoDisplay[] = [];

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

    convos.push({
      id: cid,
      partnerName,
      partnerInitials,
      partnerAvatarUrl,
      lastMessage: (lastMsg?.[0]?.content as string | null) ?? null,
      lastAt: (lastMsg?.[0]?.created_at as string | null) ?? null,
    });
  }

  convos.sort((a, b) => {
    if (!a.lastAt && !b.lastAt) return 0;
    if (!a.lastAt) return 1;
    if (!b.lastAt) return -1;
    return b.lastAt.localeCompare(a.lastAt);
  });

  const { data: people } = await supabase
    .from("profiles")
    .select("user_id,first_name,last_name")
    .eq("organization_id", organizationId)
    .neq("user_id", userId)
    .order("last_name", { ascending: true })
    .limit(50);

  const hasPeople = (people ?? []).length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold">Start a message</h2>

        {resolvedParams?.error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {resolvedParams.error}
          </div>
        )}

        {hasPeople ? (
          <StartConversationForm
            people={(people ?? []).map((p) => ({
              user_id: p.user_id as string,
              first_name: p.first_name as string,
              last_name: p.last_name as string,
            }))}
          />
        ) : (
          <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            No other members in your organization yet.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-2">
        <h2 className="text-sm font-semibold">Inbox</h2>
        <div className="mt-3 flex flex-col gap-2">
          {convos.length === 0 ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              No conversations yet. Start one with a colleague.
            </div>
          ) : (
            convos.map((c) => (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-100 px-4 py-3 transition hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900"
              >
                <Avatar src={c.partnerAvatarUrl} initials={c.partnerInitials} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{c.partnerName}</div>
                  {c.lastMessage && (
                    <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {c.lastMessage}
                    </div>
                  )}
                </div>
                {c.lastAt && (
                  <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                    {new Date(c.lastAt).toLocaleDateString()}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
