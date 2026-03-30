import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { sendConnectionAction, respondConnectionAction } from "./actions";

export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: targetUserId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: person } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name, biography, avatar_url, organization_id")
    .eq("user_id", targetUserId)
    .single();

  if (!person) redirect("/people/find");

  const { data: hobbies } = await supabase
    .from("user_hobbies")
    .select("hobby_id, hobbies(name)")
    .eq("user_id", targetUserId);

  const { data: myHobbies } = await supabase
    .from("user_hobbies")
    .select("hobby_id")
    .eq("user_id", userId);

  const myHobbyIds = new Set((myHobbies ?? []).map((h) => h.hobby_id as string));
  const hobbyList = (hobbies ?? []).map((h) => {
    const raw = h.hobbies as unknown as
      | { name: string }
      | { name: string }[]
      | null;
    const flat = Array.isArray(raw) ? raw[0] : raw;
    return {
      name: flat?.name ?? "",
      shared: myHobbyIds.has(h.hobby_id as string),
    };
  });

  const { data: connections } = await supabase
    .from("user_connections")
    .select("id, requester_id, responder_id, status")
    .or(
      `and(requester_id.eq.${userId},responder_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},responder_id.eq.${userId})`,
    )
    .limit(1);

  const conn = connections?.[0] ?? null;
  const isRequester = conn?.requester_id === userId;
  const isSelf = userId === targetUserId;

  const { data: sharedEvents } = await supabase
    .from("event_attendees")
    .select("event_id")
    .eq("user_id", targetUserId);

  const { data: myEvents } = await supabase
    .from("event_attendees")
    .select("event_id")
    .eq("user_id", userId);

  const myEventIds = new Set((myEvents ?? []).map((e) => e.event_id as string));
  const sharedEventIds = (sharedEvents ?? [])
    .map((e) => e.event_id as string)
    .filter((eid) => myEventIds.has(eid));

  let sharedEventNames: Array<{ id: string; title: string }> = [];
  if (sharedEventIds.length > 0) {
    const { data: eventRows } = await supabase
      .from("events")
      .select("id, title")
      .in("id", sharedEventIds.slice(0, 5));
    sharedEventNames = (eventRows ?? []).map((e) => ({
      id: e.id as string,
      title: e.title as string,
    }));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar
                src={(person.avatar_url as string | null) ?? null}
                initials={`${(person.first_name as string).charAt(0)}${(person.last_name as string).charAt(0)}`}
                size="lg"
                className="font-semibold"
              />
              <div>
                <h1 className="text-lg font-semibold">
                  {person.first_name} {person.last_name}
                </h1>
                {hobbyList.filter((h) => h.shared).length > 0 && (
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">
                    {hobbyList.filter((h) => h.shared).length} shared interest
                    {hobbyList.filter((h) => h.shared).length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
            <Link
              href="/people/find"
              className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
            >
              Back
            </Link>
          </div>

          {(person.biography as string | null) && (
            <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
              {person.biography as string}
            </p>
          )}

          {!isSelf && (
            <div className="mt-5">
              {!conn ? (
                <form action={async () => { "use server"; await sendConnectionAction(targetUserId); }}>
                  <button
                    type="submit"
                    className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    Send connection request
                  </button>
                </form>
              ) : conn.status === "pending" && !isRequester ? (
                <div className="flex gap-2">
                  <form action={async () => { "use server"; await respondConnectionAction(conn.id as string, "accepted"); }}>
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Accept
                    </button>
                  </form>
                  <form action={async () => { "use server"; await respondConnectionAction(conn.id as string, "declined"); }}>
                    <button
                      type="submit"
                      className="rounded-xl border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    >
                      Decline
                    </button>
                  </form>
                </div>
              ) : conn.status === "pending" && isRequester ? (
                <span className="inline-block rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-500 dark:border-zinc-800">
                  Connection request pending
                </span>
              ) : conn.status === "accepted" ? (
                <span className="inline-block rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Connected
                </span>
              ) : (
                <span className="inline-block rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-500 dark:border-zinc-800">
                  {conn.status as string}
                </span>
              )}
            </div>
          )}
        </section>

        {sharedEventNames.length > 0 && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold">Shared events</h2>
            <div className="mt-3 flex flex-col gap-2">
              {sharedEventNames.map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="rounded-xl border border-zinc-100 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900"
                >
                  {e.title}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold">Interests</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {hobbyList.length === 0 ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              No hobbies listed.
            </div>
          ) : (
            hobbyList.map((h) => (
              <span
                key={h.name}
                className={`rounded-full px-3 py-1 text-xs ${
                  h.shared
                    ? "bg-emerald-100 font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {h.name}
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
