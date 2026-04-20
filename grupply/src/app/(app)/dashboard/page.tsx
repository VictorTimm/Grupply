import Link from "next/link";
import { redirect } from "next/navigation";

import { registrationRecoveryPath } from "@/lib/auth/register";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";

import { joinEventAction, leaveEventAction } from "./actions";
import { NotificationsPanel } from "./NotificationsPanel";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  date_time: string;
  location: string | null;
  capacity: number;
  status: "active" | "canceled";
  creator_id: string;
};

type MatchRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  shared_interests: number;
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, first_name")
    .eq("user_id", userId)
    .single();

  const organizationId = profile?.organization_id as string | undefined;
  if (!organizationId) redirect(registrationRecoveryPath("join"));

  const nowIso = new Date().toISOString();
  const twoWeeksIso = new Date(
    new Date(nowIso).getTime() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: joined } = await supabase
    .from("event_attendees")
    .select("event:events(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  const joinedEvents: EventRow[] =
    (joined as Array<{ event: EventRow | null }> | null)
      ?.map((r) => r.event)
      .filter((e): e is EventRow => Boolean(e)) ?? [];

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id,message,created_at,read_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: matches } = await supabase.rpc("suggested_matches", {
    p_user_id: userId,
    p_limit: 8,
  });

  const joinedIds = new Set(joinedEvents.map((e) => e.id));
  const { data: candidateActivities } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .gte("date_time", nowIso)
    .lte("date_time", twoWeeksIso)
    .order("date_time", { ascending: true })
    .limit(20);

  const suggestedActivities: EventRow[] =
    (candidateActivities as EventRow[] | null)?.filter((e) => !joinedIds.has(e.id)) ??
    [];

  const upcomingJoined = joinedEvents
    .filter((e) => e.status !== "canceled" && e.date_time >= nowIso)
    .sort((a, b) => a.date_time.localeCompare(b.date_time))
    .slice(0, 8);

  const cardClass =
    "rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:border dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none lg:p-7";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className={`${cardClass} lg:col-span-2`}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Upcoming events</div>
          <Link
            href="/events/joined"
            className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
          >
            View all
          </Link>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {upcomingJoined.length === 0 ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              No upcoming events.{" "}
              <Link href="/events/discover" className="font-medium hover:underline">
                Discover something fun
              </Link>
            </div>
          ) : (
            upcomingJoined.map((e) => (
              <div
                key={e.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-100/80 px-4 py-3.5 dark:border-zinc-800/80"
              >
                <div className="min-w-0">
                  <Link
                    href={`/events/${e.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {e.title}
                  </Link>
                  <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(e.date_time).toLocaleString()}
                    {e.location ? ` · ${e.location}` : ""}
                  </div>
                </div>
                <form action={async () => { "use server"; await leaveEventAction(e.id); }}>
                  <SubmitButton
                    pendingLabel="Leaving…"
                    className="shrink-0 rounded-xl border border-zinc-200/90 px-3 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    Leave
                  </SubmitButton>
                </form>
              </div>
            ))
          )}
        </div>
      </section>

      <NotificationsPanel initialNotifications={notifications ?? []} />

      <section className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Suggested activities</div>
          <Link
            href="/events/discover"
            className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
          >
            Discover
          </Link>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {suggestedActivities.length === 0 ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              No suggested activities right now.
            </div>
          ) : (
            suggestedActivities.slice(0, 6).map((e) => (
              <div
                key={e.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-100/80 px-4 py-3.5 dark:border-zinc-800/80"
              >
                <div className="min-w-0">
                  <Link
                    href={`/events/${e.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {e.title}
                  </Link>
                  <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(e.date_time).toLocaleString()}
                    {e.location ? ` · ${e.location}` : ""}
                  </div>
                </div>
                <form action={async () => { "use server"; await joinEventAction(e.id); }}>
                  <SubmitButton
                    pendingLabel="Joining…"
                    className="shrink-0 rounded-xl bg-[#0052FF] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#0046DD]"
                  >
                    Join
                  </SubmitButton>
                </form>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Suggested matches</div>
          <Link
            href="/people/find"
            className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
          >
            Find people
          </Link>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {!matches || matches.length === 0 ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              No matches yet — add more hobbies to improve recommendations.
            </div>
          ) : (
            (matches as MatchRow[]).slice(0, 8).map((m) => (
              <Link
                key={m.user_id}
                href={`/people/${m.user_id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100/80 px-4 py-3.5 transition hover:bg-zinc-50/80 dark:border-zinc-800/80 dark:hover:bg-zinc-900/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={m.avatar_url}
                    initials={`${m.first_name.charAt(0)}${m.last_name.charAt(0)}`}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {m.first_name} {m.last_name}
                    </div>
                    <div className="text-xs font-medium text-[#00D05A]">
                      {m.shared_interests} shared interest{m.shared_interests !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-zinc-400">View</span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
