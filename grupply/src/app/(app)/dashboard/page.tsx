import Link from "next/link";
import { redirect } from "next/navigation";

import { registrationRecoveryPath } from "@/lib/auth/register";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";
import {
  AvatarStack,
  Chip,
  buttonClass,
} from "@/components/ui";

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

type AttendeeProfile = {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
};

function formatEventTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return { date, time };
}

function initialsOf(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export default async function DashboardPage() {
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
    (candidateActivities as EventRow[] | null)?.filter(
      (e) => !joinedIds.has(e.id),
    ) ?? [];

  const upcomingJoined = joinedEvents
    .filter((e) => e.status !== "canceled" && e.date_time >= nowIso)
    .sort((a, b) => a.date_time.localeCompare(b.date_time));

  const hero = upcomingJoined[0] ?? suggestedActivities[0] ?? null;
  const isHeroJoined = hero ? joinedIds.has(hero.id) : false;

  const attendeeByEvent = new Map<string, AttendeeProfile[]>();
  const allEventIds = [
    ...upcomingJoined.slice(0, 6).map((e) => e.id),
    ...suggestedActivities.slice(0, 6).map((e) => e.id),
  ];
  const uniqueIds = Array.from(new Set(allEventIds));
  if (uniqueIds.length > 0) {
    const { data: attendeeRows } = await supabase
      .from("event_attendees")
      .select("event_id, profile:profiles(user_id, first_name, last_name, avatar_url)")
      .in("event_id", uniqueIds);
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

  const otherUpcoming = upcomingJoined.slice(hero && isHeroJoined ? 1 : 0, 5);
  const suggestions = suggestedActivities
    .filter((e) => !(hero && !isHeroJoined && e.id === hero.id))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-10">
      {hero ? (
        <HeroEvent
          event={hero}
          attendees={attendeeByEvent.get(hero.id) ?? []}
          joined={isHeroJoined}
          now={now.getTime()}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-[14px] border border-border bg-surface overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border">
              <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
                Your week
              </h2>
              <Link
                href="/events/joined"
                className="text-[12px] text-muted hover:text-ember-deep"
              >
                All joined &rarr;
              </Link>
            </div>
            {otherUpcoming.length === 0 ? (
              <div className="px-5 py-5 text-[14px] text-muted">
                Nothing else on your calendar.{" "}
                <Link href="/events/discover" className="text-ember-deep hover:underline">
                  Find something
                </Link>
                .
              </div>
            ) : (
              <ul className="flex flex-col">
                {otherUpcoming.map((e, i) => {
                  const { date, time } = formatEventTime(e.date_time);
                  return (
                    <li
                      key={e.id}
                      className={`flex items-start gap-4 px-5 py-4 ${
                        i === 0 ? "" : "border-t border-border"
                      }`}
                    >
                      <div className="w-16 shrink-0">
                        <div className="eyebrow text-ember-deep">{date}</div>
                        <div className="font-mono text-[13px] text-ink-soft mt-0.5">
                          {time}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/events/${e.id}`}
                          className="group text-[15px] font-medium text-ink"
                        >
                          <span className="bg-gradient-to-r from-ember to-ember bg-[length:0%_2px] bg-no-repeat bg-[position:0_100%] group-hover:bg-[length:100%_2px] transition-[background-size] duration-300">
                            {e.title}
                          </span>
                        </Link>
                        {e.location ? (
                          <div className="text-[12px] text-muted mt-0.5">
                            {e.location}
                          </div>
                        ) : null}
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
          </div>

          <NotificationsPanel initialNotifications={notifications ?? []} />
        </section>

        <section className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
              New events
            </h2>
            <Link
              href="/events/discover"
              className="text-[12px] text-muted hover:text-ember-deep"
            >
              Everything &rarr;
            </Link>
          </div>
          {suggestions.length === 0 ? (
            <div className="border-l-2 border-border pl-4 text-[14px] text-muted">
              Nothing new. Want to{" "}
              <Link href="/events/discover" className="text-ember-deep hover:underline">
                poke around
              </Link>
              ?
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {suggestions.map((e, i) => {
                const attendees = attendeeByEvent.get(e.id) ?? [];
                const full = attendees.length >= e.capacity;
                const isFirst = i === 0;
                const { date, time } = formatEventTime(e.date_time);
                return (
                  <li
                    key={e.id}
                    className={`group border border-border bg-surface p-5 transition-[border-color,transform] hover:border-ink hover:-translate-y-[1px] ${
                      isFirst ? "rounded-[16px] md:p-7" : "rounded-[10px]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Chip tone="iris" size="sm">
                            {date}
                          </Chip>
                          <span className="font-mono text-[11px] text-muted">
                            {time}
                          </span>
                          {full ? <Chip tone="ember" size="sm">Full</Chip> : null}
                        </div>
                        <Link
                          href={`/events/${e.id}`}
                          className={`block font-display font-medium tracking-tight text-ink hover:text-iris-deep ${
                            isFirst ? "text-[22px] md:text-[26px]" : "text-[18px]"
                          }`}
                        >
                          {e.title}
                        </Link>
                        {e.description && isFirst ? (
                          <p className="mt-2 text-[14px] text-ink-soft leading-relaxed line-clamp-2">
                            {e.description}
                          </p>
                        ) : null}
                        <div className="mt-3 flex items-center gap-4">
                          {attendees.length > 0 ? (
                            <AvatarStack
                              size="sm"
                              people={attendees.slice(0, 4).map((p) => ({
                                id: p.user_id,
                                name: `${p.first_name} ${p.last_name}`,
                                initials: initialsOf(p.first_name, p.last_name),
                                src: p.avatar_url,
                              }))}
                              max={4}
                            />
                          ) : null}
                          <div className="text-[12px] text-muted">
                            {attendees.length}/{e.capacity} seats
                            {e.location ? ` \u00b7 ${e.location}` : ""}
                          </div>
                        </div>
                      </div>
                      {!full ? (
                        <form
                          action={async () => {
                            "use server";
                            await joinEventAction(e.id);
                          }}
                        >
                          <SubmitButton
                            pendingLabel="Joining…"
                            className={buttonClass({
                              variant: isFirst ? "primary" : "secondary",
                              size: isFirst ? "md" : "sm",
                            })}
                          >
                            Join
                          </SubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
            People you might click with
          </h2>
          <Link
            href="/people/find"
            className="text-[12px] text-muted hover:text-ember-deep"
          >
            Find more &rarr;
          </Link>
        </div>
        {!matches || (matches as MatchRow[]).length === 0 ? (
          <div className="border-l-2 border-border pl-4 text-[14px] text-muted">
            Add a few hobbies on your{" "}
            <Link href="/profile" className="text-ember-deep hover:underline">
              profile
            </Link>{" "}
            to unlock matches.
          </div>
        ) : (
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 md:-mx-0 md:px-0">
            {(matches as MatchRow[]).slice(0, 8).map((m) => (
              <Link
                key={m.user_id}
                href={`/people/${m.user_id}`}
                className="group flex w-[220px] shrink-0 flex-col gap-3 border border-border bg-surface p-4 transition-[border-color,transform] hover:border-ink hover:-translate-y-[1px] rounded-[12px]"
              >
                <Avatar
                  src={m.avatar_url}
                  initials={initialsOf(m.first_name, m.last_name)}
                  size="lg"
                  shape="squircle"
                />
                <div>
                  <div className="text-[14px] font-medium text-ink">
                    {m.first_name} {m.last_name}
                  </div>
                  <div className="text-[12px] text-sage mt-0.5">
                    {m.shared_interests} shared interest
                    {m.shared_interests !== 1 ? "s" : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HeroEvent({
  event,
  attendees,
  joined,
  now,
}: {
  event: EventRow;
  attendees: AttendeeProfile[];
  joined: boolean;
  now: number;
}) {
  const { date, time } = formatEventTime(event.date_time);
  const eventTs = new Date(event.date_time).getTime();
  const isToday =
    new Date(event.date_time).toDateString() ===
    new Date(now).toDateString();
  const isSoon = eventTs - now < 24 * 60 * 60 * 1000;

  return (
    <section className="relative rounded-[16px] border border-border bg-surface p-6 md:p-8">
      <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-end">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            {isToday ? (
              <Chip tone="ember" size="sm">
                <span className="h-1.5 w-1.5 rounded-full bg-ember animate-pulse" />
                Today
              </Chip>
            ) : isSoon ? (
              <Chip tone="ember" size="sm">Tomorrow</Chip>
            ) : (
              <Chip tone="iris" size="sm">Next up</Chip>
            )}
            <span className="eyebrow">{joined ? "You\u2019re in" : "Open"}</span>
          </div>
          <h2 className="font-display text-[28px] md:text-[36px] leading-[1.05] font-medium tracking-tight text-ink">
            <Link href={`/events/${event.id}`} className="hover:text-iris-deep">
              {event.title}
            </Link>
          </h2>
          {event.description ? (
            <p className="text-[15px] text-ink-soft max-w-2xl leading-relaxed line-clamp-2">
              {event.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-5 md:items-end md:text-right">
          <div className="flex flex-col gap-1">
            <div className="font-display text-[18px] text-ink">{date}</div>
            <div className="font-mono text-[13px] text-muted">
              {time}
              {event.location ? ` \u00b7 ${event.location}` : ""}
            </div>
          </div>
          {attendees.length > 0 ? (
            <div className="flex items-center gap-3 md:justify-end">
              <AvatarStack
                people={attendees.slice(0, 5).map((p) => ({
                  id: p.user_id,
                  name: `${p.first_name} ${p.last_name}`,
                  initials: initialsOf(p.first_name, p.last_name),
                  src: p.avatar_url,
                }))}
                max={5}
                size="md"
              />
              <span className="text-[13px] text-muted">
                {attendees.length}/{event.capacity} going
              </span>
            </div>
          ) : null}
          <Link
            href={`/events/${event.id}`}
            className={buttonClass({
              variant: joined ? "secondary" : "primary",
              size: "lg",
            })}
          >
            {joined ? "Open" : "I\u2019m in"}
          </Link>
        </div>
      </div>
    </section>
  );
}
