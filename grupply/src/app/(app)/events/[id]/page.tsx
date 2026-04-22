import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { leaveEventAction } from "@/app/(app)/dashboard/actions";
import { ConfirmActionForm } from "@/components/ConfirmActionForm";
import { JoinEventButton } from "@/components/JoinEventButton";
import { SubmitButton } from "@/components/SubmitButton";
import { Chip, buttonClass } from "@/components/ui";

import { updateEventAction, cancelEventAction, deleteEventAction } from "./actions";
import { EventEditForm } from "./EventEditForm";

function initialsOf(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!event) redirect("/events/discover");

  const { data: creator } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name, avatar_url")
    .eq("user_id", event.creator_id)
    .single();

  const { data: attendeeRows } = await supabase
    .from("event_attendees")
    .select("user_id")
    .eq("event_id", id);

  const attendeeIds = (attendeeRows ?? []).map((r) => r.user_id as string);

  type ProfileRow = {
    user_id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  const profilesByUser = new Map<string, ProfileRow>();
  if (attendeeIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, avatar_url")
      .in("user_id", attendeeIds);
    for (const p of profs ?? []) {
      profilesByUser.set(p.user_id as string, p as ProfileRow);
    }
  }

  const attendeeList = attendeeIds.map((uid) => {
    const p = profilesByUser.get(uid);
    return {
      user_id: uid,
      first_name: p?.first_name ?? "",
      last_name: p?.last_name ?? "",
      avatar_url: p?.avatar_url ?? null,
    };
  });

  const isCreator = event.creator_id === userId;
  const isAttending = attendeeList.some((a) => a.user_id === userId);
  const isCanceled = event.status === "canceled";
  const isFull = attendeeList.length >= event.capacity;
  const isPast = new Date(event.date_time) < new Date();
  const isToday = new Date(event.date_time).toDateString() === new Date().toDateString();

  const d = new Date(event.date_time);
  const datePretty = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timePretty = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/events/discover"
          className="text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ember-deep"
        >
          &larr; Back to Discover
        </Link>
      </div>

      <header className="rounded-[16px] border border-border bg-surface p-6 md:p-8 flex flex-col gap-5">
        <div className="flex items-center gap-2 flex-wrap">
          {isToday && !isCanceled ? (
            <Chip tone="ember" size="sm">
              <span className="h-1.5 w-1.5 rounded-full bg-ember animate-pulse" />
              Today
            </Chip>
          ) : null}
          {isCanceled ? <Chip tone="clay" size="sm">Canceled</Chip> : null}
          {isPast && !isCanceled ? <Chip tone="outline" size="sm">Past</Chip> : null}
          {isFull && !isCanceled && !isPast ? (
            <Chip tone="ember" size="sm">Full</Chip>
          ) : null}
          {isAttending ? <Chip tone="sage" size="sm">Going</Chip> : null}
          {isCreator ? <Chip tone="iris" size="sm">You&rsquo;re hosting</Chip> : null}
        </div>

        <h1 className="font-display text-[36px] md:text-[48px] leading-[1.02] font-medium tracking-tight text-ink max-w-3xl">
          {event.title}
        </h1>

        <dl className="grid gap-x-6 gap-y-3 text-[14px] md:grid-cols-2">
          <div className="flex items-baseline gap-2">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-muted w-16 shrink-0">
              When
            </dt>
            <dd className="text-ink">
              {datePretty}, {timePretty}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-muted w-16 shrink-0">
              Where
            </dt>
            <dd className="text-ink">{event.location || "TBD"}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-muted w-16 shrink-0">
              Seats
            </dt>
            <dd className="text-ink font-mono">
              {attendeeList.length}/{event.capacity}
            </dd>
          </div>
          {creator ? (
            <div className="flex items-baseline gap-2">
              <dt className="text-[11px] uppercase tracking-[0.14em] text-muted w-16 shrink-0">
                Host
              </dt>
              <dd>
                <Link
                  href={`/people/${creator.user_id}`}
                  className="inline-flex items-center gap-1.5 text-ink hover:text-iris-deep"
                >
                  <Avatar
                    src={creator.avatar_url}
                    initials={initialsOf(creator.first_name, creator.last_name)}
                    size="sm"
                    className="h-6 w-6 text-[10px]"
                  />
                  {creator.first_name} {creator.last_name}
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>

        {!isCanceled && !isPast ? (
          <div className="flex items-center gap-3">
            {isAttending ? (
              <form
                action={async () => {
                  "use server";
                  await leaveEventAction(id);
                }}
              >
                <SubmitButton
                  pendingLabel={"Leaving\u2026"}
                  className={buttonClass({ variant: "secondary", size: "lg" })}
                >
                  Leave event
                </SubmitButton>
              </form>
            ) : !isFull ? (
              <JoinEventButton eventId={id} variant="primary" size="lg" />
            ) : (
              <span className={buttonClass({ variant: "quiet", size: "lg" })}>
                Event is full
              </span>
            )}
          </div>
        ) : null}
      </header>

      <div className="grid gap-6 md:grid-cols-[7fr_5fr]">
        <div className="flex flex-col gap-6">
          <section className="rounded-[14px] border border-border bg-surface p-6">
            {event.description ? (
              <p className="text-[15px] leading-[1.7] text-ink-soft max-w-2xl whitespace-pre-wrap">
                {event.description}
              </p>
            ) : (
              <p className="text-[14px] text-muted italic">
                No description yet. Ping the host for vibes.
              </p>
            )}
          </section>

          {isCreator && !isCanceled ? (
            <EventEditForm event={event} updateAction={updateEventAction} />
          ) : null}

          {isCreator ? (
            <section className="rounded-[14px] border border-clay/40 bg-clay/5 p-6 flex flex-col gap-3">
              <h2 className="text-[13px] uppercase tracking-[0.14em] text-clay font-medium">
                Danger zone
              </h2>
              <p className="text-[13px] text-muted">
                These actions can&rsquo;t be undone.
              </p>
              <div className="flex flex-wrap gap-2">
                {!isCanceled ? (
                  <ConfirmActionForm
                    action={async () => {
                      "use server";
                      await cancelEventAction(id);
                    }}
                    initialLabel="Cancel event"
                    confirmLabel="Click again to cancel"
                    pendingLabel={"Canceling\u2026"}
                    className={buttonClass({ variant: "danger", size: "sm" })}
                    confirmClassName={buttonClass({ variant: "danger", size: "sm" }) + " bg-clay/10 border-clay"}
                    formClassName="inline"
                  />
                ) : null}
                <ConfirmActionForm
                  action={async () => {
                    "use server";
                    await deleteEventAction(id);
                  }}
                  initialLabel="Delete event"
                  confirmLabel="Click again to delete"
                  pendingLabel={"Deleting\u2026"}
                  className={buttonClass({ variant: "danger", size: "sm" }) + " bg-clay text-white border-clay hover:bg-clay"}
                  confirmClassName={buttonClass({ variant: "danger", size: "sm" }) + " bg-clay text-white border-clay"}
                  formClassName="inline"
                />
              </div>
            </section>
          ) : null}
        </div>

        <aside className="rounded-[14px] border border-border bg-surface overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border">
            <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
              Attendees
            </h2>
            <span className="font-mono text-[12px] text-muted">
              {attendeeList.length}/{event.capacity}
            </span>
          </div>

          {attendeeList.length === 0 ? (
            <div className="px-5 py-5 text-[13px] text-muted">
              Be the first to say yes.
            </div>
          ) : (
            <ul className="flex flex-col">
              {attendeeList.map((a, i) => (
                <li
                  key={a.user_id}
                  className={`px-5 py-2.5 ${i === 0 ? "" : "border-t border-border"}`}
                >
                  <Link
                    href={`/people/${a.user_id}`}
                    className="group flex items-center gap-3"
                  >
                    <Avatar
                      src={a.avatar_url}
                      initials={initialsOf(a.first_name, a.last_name)}
                      size="sm"
                    />
                    <span className="text-[14px] text-ink group-hover:text-iris-deep">
                      {a.first_name} {a.last_name}
                    </span>
                    {a.user_id === event.creator_id ? (
                      <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-iris-deep">
                        Host
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
