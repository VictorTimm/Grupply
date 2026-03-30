import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { joinEventAction } from "@/app/(app)/dashboard/actions";

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

export default async function DiscoverEventsPage() {
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

  const { data: allEvents } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("date_time", { ascending: true })
    .limit(50);

  const { data: myAttendance } = await supabase
    .from("event_attendees")
    .select("event_id")
    .eq("user_id", userId);

  const joinedIds = new Set(
    (myAttendance ?? []).map((a) => a.event_id as string),
  );

  const { data: attendeeCounts } = await supabase
    .from("event_attendees")
    .select("event_id");

  const countMap = new Map<string, number>();
  for (const row of attendeeCounts ?? []) {
    const eid = row.event_id as string;
    countMap.set(eid, (countMap.get(eid) ?? 0) + 1);
  }

  const events = (allEvents as EventRow[] | null) ?? [];
  const now = new Date();

  const upcoming = events.filter(
    (e) => e.status === "active" && new Date(e.date_time) >= now,
  );
  const past = events.filter(
    (e) => e.status === "active" && new Date(e.date_time) < now,
  );
  const canceled = events.filter((e) => e.status === "canceled");

  function EventCard({ e }: { e: EventRow }) {
    const isJoined = joinedIds.has(e.id);
    const count = countMap.get(e.id) ?? 0;
    const isFull = count >= e.capacity;
    const isPast = new Date(e.date_time) < now;
    const isCanceled = e.status === "canceled";

    return (
      <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-100 px-4 py-3 dark:border-zinc-900">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/events/${e.id}`}
              className="text-sm font-medium hover:underline"
            >
              {e.title}
            </Link>
            {isJoined && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Joined
              </span>
            )}
            {isCanceled && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                Canceled
              </span>
            )}
            {isFull && !isCanceled && !isPast && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                Full
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {new Date(e.date_time).toLocaleString()}
            {e.location ? ` · ${e.location}` : ""}
            {` · ${count}/${e.capacity} attendees`}
          </div>
          {e.description && (
            <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
              {e.description}
            </p>
          )}
        </div>
        {!isJoined && !isCanceled && !isPast && !isFull && (
          <form action={async () => { "use server"; await joinEventAction(e.id); }}>
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Join
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-sm font-semibold">Upcoming events</h1>
        <div className="mt-3 flex flex-col gap-2">
          {upcoming.length === 0 ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              No upcoming events in your organization.
            </div>
          ) : (
            upcoming.map((e) => <EventCard key={e.id} e={e} />)
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            Past events
          </h2>
          <div className="mt-3 flex flex-col gap-2 opacity-60">
            {past.map((e) => <EventCard key={e.id} e={e} />)}
          </div>
        </section>
      )}

      {canceled.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            Canceled events
          </h2>
          <div className="mt-3 flex flex-col gap-2 opacity-60">
            {canceled.map((e) => <EventCard key={e.id} e={e} />)}
          </div>
        </section>
      )}
    </div>
  );
}
