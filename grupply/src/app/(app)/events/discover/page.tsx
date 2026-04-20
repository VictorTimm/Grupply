import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { joinEventAction } from "@/app/(app)/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import {
  AvatarStack,
  Chip,
  buttonClass,
} from "@/components/ui";

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

type AttendeeProfile = {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
};

function formatParts(iso: string) {
  const d = new Date(iso);
  return {
    dow: d
      .toLocaleDateString(undefined, { weekday: "short" })
      .toUpperCase(),
    day: d.getDate(),
    month: d
      .toLocaleDateString(undefined, { month: "short" })
      .toUpperCase(),
    time: d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
    iso,
  };
}

function bucketLabel(date: Date) {
  const now = new Date();
  const day = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (day < 1) return "Today / Tomorrow";
  if (day < 7) return "This week";
  if (day < 14) return "Next two weeks";
  if (day < 30) return "This month";
  return "Later";
}

function initialsOf(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

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

  const events = (allEvents as EventRow[] | null) ?? [];
  const eventIds = events.map((e) => e.id);

  const attendeeByEvent = new Map<string, AttendeeProfile[]>();
  if (eventIds.length > 0) {
    const { data: attendeeRows } = await supabase
      .from("event_attendees")
      .select("event_id, profile:profiles(user_id, first_name, last_name, avatar_url)")
      .in("event_id", eventIds);
    (attendeeRows as
      | Array<{ event_id: string; profile: AttendeeProfile | null }>
      | null)?.forEach((row) => {
      if (!row.profile) return;
      const list = attendeeByEvent.get(row.event_id) ?? [];
      list.push(row.profile);
      attendeeByEvent.set(row.event_id, list);
    });
  }

  const now = new Date();

  const upcoming = events.filter(
    (e) => e.status === "active" && new Date(e.date_time) >= now,
  );
  const past = events.filter(
    (e) => e.status === "active" && new Date(e.date_time) < now,
  );
  const canceled = events.filter((e) => e.status === "canceled");

  const featured = upcoming[0] ?? null;
  const rest = featured ? upcoming.slice(1) : upcoming;

  const grouped: Record<string, EventRow[]> = {};
  for (const e of rest) {
    const label = bucketLabel(new Date(e.date_time));
    (grouped[label] ??= []).push(e);
  }
  const orderedBuckets = [
    "Today / Tomorrow",
    "This week",
    "Next two weeks",
    "This month",
    "Later",
  ].filter((k) => grouped[k]);

  return (
    <div className="flex flex-col gap-8">
      {featured ? (
        <FeaturedEvent
          event={featured}
          attendees={attendeeByEvent.get(featured.id) ?? []}
          isJoined={joinedIds.has(featured.id)}
        />
      ) : null}

      {orderedBuckets.length === 0 && !featured ? (
        <div className="border-l-2 border-border pl-4 text-[14px] text-muted">
          Your org&rsquo;s feed is empty. Be the one who starts it.
        </div>
      ) : null}

      {orderedBuckets.map((label) => (
        <section key={label} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
              {label}
            </h2>
            <span className="font-mono text-[11px] text-mute-soft">
              {grouped[label].length.toString().padStart(2, "0")}
            </span>
          </div>
          <ul className="flex flex-col rounded-[12px] border border-border bg-surface overflow-hidden">
            {grouped[label].map((e, i) => (
              <CompactRow
                key={e.id}
                e={e}
                attendees={attendeeByEvent.get(e.id) ?? []}
                isJoined={joinedIds.has(e.id)}
                first={i === 0}
              />
            ))}
          </ul>
        </section>
      ))}

      {past.length > 0 ? (
        <details className="group rounded-[12px] border border-border bg-surface">
          <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 text-[13px] text-muted hover:text-ink">
            <span className="text-[12px] uppercase tracking-[0.14em] font-medium">
              Past
            </span>
            <span className="h-px flex-1 bg-border" />
            <span>{past.length} events</span>
            <span className="transition-transform group-open:rotate-180">
              &darr;
            </span>
          </summary>
          <ul className="flex flex-col border-t border-border opacity-70">
            {past.map((e, i) => (
              <CompactRow
                key={e.id}
                e={e}
                attendees={attendeeByEvent.get(e.id) ?? []}
                isJoined={joinedIds.has(e.id)}
                first={i === 0}
                muted
              />
            ))}
          </ul>
        </details>
      ) : null}

      {canceled.length > 0 ? (
        <details className="group rounded-[12px] border border-border bg-surface">
          <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 text-[13px] text-muted hover:text-ink">
            <span className="text-[12px] uppercase tracking-[0.14em] font-medium text-clay">
              Canceled
            </span>
            <span className="h-px flex-1 bg-border" />
            <span>{canceled.length} events</span>
            <span className="transition-transform group-open:rotate-180">
              &darr;
            </span>
          </summary>
          <ul className="flex flex-col border-t border-border opacity-70">
            {canceled.map((e, i) => (
              <CompactRow
                key={e.id}
                e={e}
                attendees={attendeeByEvent.get(e.id) ?? []}
                isJoined={joinedIds.has(e.id)}
                first={i === 0}
                muted
              />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function FeaturedEvent({
  event,
  attendees,
  isJoined,
}: {
  event: EventRow;
  attendees: AttendeeProfile[];
  isJoined: boolean;
}) {
  const parts = formatParts(event.date_time);
  const count = attendees.length;
  const full = count >= event.capacity;
  const isToday = new Date(event.date_time).toDateString() === new Date().toDateString();

  return (
    <section className="border border-border bg-surface rounded-[18px] p-7 md:p-10 transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="grid gap-8 md:grid-cols-[1fr_220px] md:items-start">
        <div className="min-w-0 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            {isToday ? (
              <Chip tone="ember" size="sm">
                <span className="h-1.5 w-1.5 rounded-full bg-ember animate-pulse" />
                Today
              </Chip>
            ) : (
              <Chip tone="iris" size="sm">Featured</Chip>
            )}
            {isJoined ? <Chip tone="sage" size="sm">Going</Chip> : null}
            {full ? <Chip tone="ember" size="sm">Full</Chip> : null}
          </div>
          <h2 className="font-display text-[30px] md:text-[40px] leading-[1.05] font-medium tracking-tight">
            <Link href={`/events/${event.id}`} className="text-ink hover:text-iris-deep">
              {event.title}
            </Link>
          </h2>
          {event.description ? (
            <p className="max-w-2xl text-[15px] leading-relaxed text-ink-soft">
              {event.description}
            </p>
          ) : null}
          {count > 0 ? (
            <div className="flex items-center gap-3">
              <AvatarStack
                people={attendees.slice(0, 6).map((p) => ({
                  id: p.user_id,
                  name: `${p.first_name} ${p.last_name}`,
                  initials: initialsOf(p.first_name, p.last_name),
                  src: p.avatar_url,
                }))}
                max={6}
                size="md"
              />
              <span className="text-[13px] text-muted">
                {count}/{event.capacity} going
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <div className="border border-border rounded-[10px] p-4">
            <div className="eyebrow text-ember-deep">{parts.dow}</div>
            <div className="font-display text-[44px] leading-none font-medium text-ink mt-1">
              {parts.day}
            </div>
            <div className="text-[12px] text-muted mt-1">
              {parts.month} &middot; {parts.time}
            </div>
            {event.location ? (
              <div className="text-[12px] text-ink-soft mt-3 border-t border-border pt-2">
                {event.location}
              </div>
            ) : null}
          </div>
          {!isJoined && !full ? (
            <form action={async () => { "use server"; await joinEventAction(event.id); }}>
              <SubmitButton
                pendingLabel="Joining…"
                className={buttonClass({ variant: "primary", size: "lg", full: true })}
              >
                I&rsquo;m in
              </SubmitButton>
            </form>
          ) : (
            <Link
              href={`/events/${event.id}`}
              className={buttonClass({ variant: "secondary", size: "lg", full: true })}
            >
              Open
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function CompactRow({
  e,
  attendees,
  isJoined,
  first,
  muted,
}: {
  e: EventRow;
  attendees: AttendeeProfile[];
  isJoined: boolean;
  first: boolean;
  muted?: boolean;
}) {
  const parts = formatParts(e.date_time);
  const count = attendees.length;
  const full = count >= e.capacity;
  const isPast = new Date(e.date_time) < new Date();
  const isCanceled = e.status === "canceled";

  return (
    <li
      className={`group flex items-center gap-5 px-4 py-4 ${
        first ? "" : "border-t border-border"
      } ${muted ? "text-muted" : ""}`}
    >
      <div className="w-14 shrink-0 text-center">
        <div className="eyebrow text-ember-deep leading-none">{parts.dow}</div>
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
            className={`text-[15px] font-medium text-ink hover:text-iris-deep ${
              muted ? "text-ink-soft" : ""
            }`}
          >
            {e.title}
          </Link>
          {isJoined && !muted ? <Chip tone="sage" size="sm">Going</Chip> : null}
          {full && !isCanceled && !isPast ? (
            <Chip tone="ember" size="sm">Full</Chip>
          ) : null}
          {isCanceled ? <Chip tone="clay" size="sm">Canceled</Chip> : null}
        </div>
        <div className="text-[12px] text-muted mt-0.5">
          {e.location ? `${e.location} · ` : ""}
          {count}/{e.capacity} going
        </div>
      </div>

      {attendees.length > 0 ? (
        <div className="hidden md:block">
          <AvatarStack
            people={attendees.slice(0, 3).map((p) => ({
              id: p.user_id,
              name: `${p.first_name} ${p.last_name}`,
              initials: initialsOf(p.first_name, p.last_name),
              src: p.avatar_url,
            }))}
            max={3}
            size="sm"
          />
        </div>
      ) : null}

      {!isJoined && !isCanceled && !isPast && !full ? (
        <form action={async () => { "use server"; await joinEventAction(e.id); }}>
          <SubmitButton
            pendingLabel="…"
            className={buttonClass({ variant: "secondary", size: "sm" })}
          >
            Join
          </SubmitButton>
        </form>
      ) : (
        <Link
          href={`/events/${e.id}`}
          className="text-[12px] text-muted hover:text-ink uppercase tracking-[0.12em]"
        >
          Open →
        </Link>
      )}
    </li>
  );
}
