import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { leaveEventAction } from "@/app/(app)/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Chip, buttonClass } from "@/components/ui";

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

function formatParts(iso: string) {
  const d = new Date(iso);
  return {
    dow: d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(),
    day: d.getDate(),
    month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    time: d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

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
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
            {upcoming.length === 0
              ? "Upcoming"
              : `Upcoming \u00b7 ${upcoming.length}`}
          </h2>
          <Link
            href="/events/discover"
            className="text-[12px] text-muted hover:text-ember-deep"
          >
            Discover more &rarr;
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-[12px] border border-border bg-surface px-4 py-4 text-[14px] text-muted">
            No events on your calendar.{" "}
            <Link href="/events/discover" className="text-ember-deep hover:underline">
              Go find something
            </Link>
            .
          </div>
        ) : (
          <ul className="flex flex-col rounded-[12px] border border-border bg-surface overflow-hidden">
            {upcoming.map((e, i) => {
              const overlap = hasOverlap(e, upcoming);
              const parts = formatParts(e.date_time);
              return (
                <li
                  key={e.id}
                  className={`flex items-start gap-5 px-4 py-4 ${
                    i === 0 ? "" : "border-t border-border"
                  }`}
                >
                  <div
                    className={`w-14 shrink-0 text-center ${
                      overlap ? "text-ember-deep" : ""
                    }`}
                  >
                    <div className="eyebrow text-ember-deep leading-none">
                      {parts.dow}
                    </div>
                    <div className="font-display text-[22px] font-medium text-ink leading-tight mt-0.5">
                      {parts.day}
                    </div>
                    <div className="font-mono text-[10px] text-muted mt-0.5">
                      {parts.time}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/events/${e.id}`}
                        className="text-[15px] font-medium text-ink hover:text-iris-deep"
                      >
                        {e.title}
                      </Link>
                      {overlap ? (
                        <Chip tone="ember" size="sm">
                          Overlap
                        </Chip>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted">
                      {e.location ? `${e.location} · ` : ""}
                      {new Date(e.date_time).toLocaleString()}
                    </div>
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await leaveEventAction(e.id);
                    }}
                  >
                    <SubmitButton
                      pendingLabel="…"
                      className={buttonClass({ variant: "ghost", size: "sm" })}
                    >
                      Leave
                    </SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {past.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
              Past
            </h2>
            <span className="font-mono text-[11px] text-mute-soft">
              {past.length.toString().padStart(2, "0")}
            </span>
          </div>
          <ul className="flex flex-col rounded-[12px] border border-border bg-surface overflow-hidden opacity-85">
            {past.map((e, i) => {
              const parts = formatParts(e.date_time);
              return (
                <li
                  key={e.id}
                  className={`flex items-start gap-5 px-4 py-3 ${
                    i === 0 ? "" : "border-t border-border"
                  }`}
                >
                  <div className="w-14 shrink-0 text-center">
                    <div className="eyebrow leading-none">{parts.dow}</div>
                    <div className="font-display text-[20px] font-medium text-ink-soft leading-tight mt-0.5">
                      {parts.day}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/events/${e.id}`}
                      className="text-[14px] font-medium text-ink-soft hover:text-ink"
                    >
                      {e.title}
                    </Link>
                    <div className="mt-0.5 text-[12px] text-muted">
                      {new Date(e.date_time).toLocaleDateString()}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {canceled.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[13px] uppercase tracking-[0.14em] text-clay font-medium">
              Canceled
            </h2>
            <span className="font-mono text-[11px] text-mute-soft">
              {canceled.length.toString().padStart(2, "0")}
            </span>
          </div>
          <ul className="flex flex-col rounded-[12px] border border-border bg-surface overflow-hidden opacity-75">
            {canceled.map((e, i) => (
              <li
                key={e.id}
                className={`flex items-center gap-4 px-4 py-3 ${
                  i === 0 ? "" : "border-t border-border"
                }`}
              >
                <span className="text-[14px] font-medium text-ink line-through">
                  {e.title}
                </span>
                <Chip tone="clay" size="sm">Canceled</Chip>
                <span className="ml-auto font-mono text-[11px] text-muted">
                  {new Date(e.date_time).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
