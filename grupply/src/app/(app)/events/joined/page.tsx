import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { leaveEventAction } from "@/app/(app)/dashboard/actions";

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

export default async function JoinedEventsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: joined } = await supabase
    .from("event_attendees")
    .select("event:events(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  const events: EventRow[] =
    (joined as Array<{ event: EventRow | null }> | null)
      ?.map((r) => r.event)
      .filter((e): e is EventRow => Boolean(e)) ?? [];

  const now = new Date();

  const upcoming = events
    .filter((e) => e.status === "active" && new Date(e.date_time) >= now)
    .sort((a, b) => a.date_time.localeCompare(b.date_time));

  const past = events
    .filter((e) => e.status === "active" && new Date(e.date_time) < now)
    .sort((a, b) => b.date_time.localeCompare(a.date_time));

  const canceled = events
    .filter((e) => e.status === "canceled")
    .sort((a, b) => b.date_time.localeCompare(a.date_time));

  function hasOverlap(event: EventRow, others: EventRow[]) {
    const start = new Date(event.date_time).getTime();
    const end = start + 2 * 60 * 60 * 1000;
    return others.some((o) => {
      if (o.id === event.id) return false;
      const oStart = new Date(o.date_time).getTime();
      const oEnd = oStart + 2 * 60 * 60 * 1000;
      return start < oEnd && end > oStart;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-sm font-semibold">Your upcoming events</h1>
          <Link
            href="/events/discover"
            className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
          >
            Discover more
          </Link>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {upcoming.length === 0 ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              No upcoming events.{" "}
              <Link href="/events/discover" className="font-medium hover:underline">
                Discover events
              </Link>
            </div>
          ) : (
            upcoming.map((e) => {
              const overlap = hasOverlap(e, upcoming);
              return (
                <div
                  key={e.id}
                  className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 ${
                    overlap
                      ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
                      : "border-zinc-100 dark:border-zinc-900"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/events/${e.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {e.title}
                      </Link>
                      {overlap && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          Overlap
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(e.date_time).toLocaleString()}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                  </div>
                  <form action={async () => { "use server"; await leaveEventAction(e.id); }}>
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    >
                      Leave
                    </button>
                  </form>
                </div>
              );
            })
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            Past events
          </h2>
          <div className="mt-3 flex flex-col gap-2 opacity-60">
            {past.map((e) => (
              <div
                key={e.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-zinc-100 px-4 py-3 dark:border-zinc-900"
              >
                <div className="min-w-0">
                  <Link
                    href={`/events/${e.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {e.title}
                  </Link>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(e.date_time).toLocaleString()}
                    {e.location ? ` · ${e.location}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {canceled.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            Canceled events
          </h2>
          <div className="mt-3 flex flex-col gap-2 opacity-60">
            {canceled.map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-zinc-100 px-4 py-3 dark:border-zinc-900"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium line-through">{e.title}</span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                    Canceled
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(e.date_time).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
