import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { joinEventAction, leaveEventAction } from "@/app/(app)/dashboard/actions";
import { ConfirmActionForm } from "@/components/ConfirmActionForm";
import { SubmitButton } from "@/components/SubmitButton";

import { updateEventAction, cancelEventAction, deleteEventAction } from "./actions";
import { EventEditForm } from "./EventEditForm";

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
    .select("first_name, last_name")
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

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold">{event.title}</h1>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                {isCanceled && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                    Canceled
                  </span>
                )}
                {isPast && !isCanceled && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                    Past
                  </span>
                )}
                {isFull && !isCanceled && !isPast && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    Full
                  </span>
                )}
              </div>
            </div>
            <Link
              href="/events/discover"
              className="shrink-0 text-sm text-zinc-500 hover:underline dark:text-zinc-400"
            >
              Back
            </Link>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Date & time</dt>
              <dd className="mt-0.5">{new Date(event.date_time).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Location</dt>
              <dd className="mt-0.5">{event.location || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Capacity</dt>
              <dd className="mt-0.5">
                {attendeeList.length} / {event.capacity}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Created by</dt>
              <dd className="mt-0.5">
                {creator ? `${creator.first_name} ${creator.last_name}` : "Unknown"}
              </dd>
            </div>
          </dl>

          {event.description && (
            <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
              {event.description}
            </p>
          )}

          {!isCanceled && !isPast && (
            <div className="mt-5 flex gap-2">
              {isAttending ? (
                <form action={async () => { "use server"; await leaveEventAction(id); }}>
                  <SubmitButton
                    pendingLabel="Leaving…"
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    Leave event
                  </SubmitButton>
                </form>
              ) : !isFull ? (
                <form action={async () => { "use server"; await joinEventAction(id); }}>
                  <SubmitButton
                    pendingLabel="Joining…"
                    className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    Join event
                  </SubmitButton>
                </form>
              ) : (
                <span className="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-400 dark:border-zinc-800">
                  Event is full
                </span>
              )}
            </div>
          )}
        </section>

        {isCreator && !isCanceled && (
          <EventEditForm event={event} updateAction={updateEventAction} />
        )}

        {isCreator && (
          <section className="rounded-2xl border border-red-200 bg-white p-5 dark:border-red-900/50 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">
              Danger zone
            </h2>
            <div className="mt-3 flex gap-2">
              {!isCanceled && (
                <ConfirmActionForm
                  action={async () => {
                    "use server";
                    await cancelEventAction(id);
                  }}
                  initialLabel="Cancel event"
                  confirmLabel="Click again to cancel"
                  pendingLabel="Canceling…"
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
                  confirmClassName="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                  formClassName="inline"
                />
              )}
              <ConfirmActionForm
                action={async () => {
                  "use server";
                  await deleteEventAction(id);
                }}
                initialLabel="Delete event"
                confirmLabel="Click again to delete"
                pendingLabel="Deleting…"
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                confirmClassName="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
                formClassName="inline"
              />
            </div>
          </section>
        )}
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold">
          Attendees ({attendeeList.length})
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {attendeeList.length === 0 ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              No attendees yet.
            </div>
          ) : (
            attendeeList.map((a) => (
              <Link
                key={a.user_id}
                href={`/people/${a.user_id}`}
                className="flex items-center gap-2 rounded-xl border border-zinc-100 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900"
              >
                <Avatar
                  src={a.avatar_url}
                  initials={`${a.first_name.charAt(0)}${a.last_name.charAt(0)}`}
                  size="sm"
                />
                <span>
                  {a.first_name} {a.last_name}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
