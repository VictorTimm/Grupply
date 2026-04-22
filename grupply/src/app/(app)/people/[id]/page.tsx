import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";
import { Chip, buttonClass } from "@/components/ui";
import {
  disconnectConnectionAction,
  respondConnectionAction,
  sendConnectionAction,
} from "./actions";
import { startConversationAction } from "@/app/(app)/messages/actions";

export default async function PersonProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { id: targetUserId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
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

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  const { data: hobbies } = await supabase
    .from("user_hobbies")
    .select("hobby_id, hobbies(name)")
    .eq("user_id", targetUserId);

  const { data: myHobbies } = await supabase
    .from("user_hobbies")
    .select("hobby_id")
    .eq("user_id", userId);

  const myHobbyIds = new Set(
    (myHobbies ?? []).map((h) => h.hobby_id as string),
  );
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

  const sharedCount = hobbyList.filter((h) => h.shared).length;

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
  const sameOrg =
    !isSelf &&
    !!myProfile?.organization_id &&
    myProfile.organization_id === (person.organization_id as string | null);

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

  let sharedEventNames: Array<{ id: string; title: string; date_time: string }> = [];
  if (sharedEventIds.length > 0) {
    const { data: eventRows } = await supabase
      .from("events")
      .select("id, title, date_time")
      .in("id", sharedEventIds.slice(0, 8))
      .order("date_time", { ascending: false });
    sharedEventNames = (eventRows ?? []).map((e) => ({
      id: e.id as string,
      title: e.title as string,
      date_time: e.date_time as string,
    }));
  }

  const firstName = person.first_name as string;
  const lastName = person.last_name as string;
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const bio = person.biography as string | null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/people/find"
          className="text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ember-deep"
        >
          &larr; Back to Find people
        </Link>
      </div>

      <header className="rounded-[16px] border border-border bg-surface p-6 md:p-8 grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
        <div className="relative">
          <Avatar
            src={(person.avatar_url as string | null) ?? null}
            initials={initials}
            size="xl"
            shape="squircle"
            className="h-24 w-24 text-2xl md:h-28 md:w-28 md:text-[32px]"
          />
          {sharedCount > 0 ? (
            <div className="absolute -bottom-2 -right-2 rounded-[8px] border border-border bg-canvas px-2.5 py-1">
              <div className="text-[10px] uppercase tracking-[0.14em] text-ember-deep leading-none">
                In common
              </div>
              <div className="font-display text-[18px] font-medium text-ink leading-none mt-0.5">
                {sharedCount}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[32px] md:text-[44px] leading-[1.02] font-medium tracking-tight text-ink">
            {firstName} {lastName}
          </h1>
          {bio ? (
            <p className="text-[15px] leading-[1.6] text-ink-soft max-w-2xl">
              {bio}
            </p>
          ) : (
            <p className="text-[14px] italic text-muted max-w-xl">
              No bio yet &mdash; they&rsquo;re keeping it mysterious.
            </p>
          )}
        </div>
      </header>

      {resolvedSearchParams?.error ? (
        <div
          className="border-l-2 border-clay bg-clay/5 px-4 py-2.5 text-[13px] text-clay"
          role="alert"
        >
          {resolvedSearchParams.error}
        </div>
      ) : null}

      {sameOrg ? (
        <div className="flex justify-end">
          <form action={startConversationAction}>
            <input type="hidden" name="recipient_id" value={targetUserId} />
            <SubmitButton
              pendingLabel="Opening…"
              className={buttonClass({ variant: "secondary", size: "md" })}
            >
              Message
            </SubmitButton>
          </form>
        </div>
      ) : null}

      {!isSelf ? (
        <section className="rounded-[14px] border border-border bg-surface px-5 py-4 flex flex-col gap-3">
          {!conn || conn.status === "declined" ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-display text-[18px] text-ink">
                  Want to stay in touch?
                </div>
                <div className="text-[13px] text-muted">
                  {conn?.status === "declined"
                    ? "The last request was declined. You can send a new one."
                    : "Send a connection request — no big deal."}
                </div>
              </div>
              <form
                action={async () => {
                  "use server";
                  await sendConnectionAction(targetUserId);
                }}
              >
                <SubmitButton
                  pendingLabel="Sending…"
                  className={buttonClass({ variant: "primary", size: "md" })}
                >
                  Connect
                </SubmitButton>
              </form>
            </div>
          ) : conn.status === "pending" && !isRequester ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-display text-[18px] text-ink">
                  {firstName} wants to connect
                </div>
                <div className="text-[13px] text-muted">
                  Your call.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <form
                  action={async () => {
                    "use server";
                    await respondConnectionAction(conn.id as string, "declined");
                  }}
                >
                  <SubmitButton
                    pendingLabel="…"
                    className={buttonClass({ variant: "ghost", size: "md" })}
                  >
                    Decline
                  </SubmitButton>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await respondConnectionAction(conn.id as string, "accepted");
                  }}
                >
                  <SubmitButton
                    pendingLabel="Accepting…"
                    className={buttonClass({ variant: "primary", size: "md" })}
                  >
                    Accept
                  </SubmitButton>
                </form>
              </div>
            </div>
          ) : conn.status === "pending" && isRequester ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-display text-[18px] text-ink">
                  Request sent
                </div>
                <div className="text-[13px] text-muted">
                  Waiting for {firstName}.
                </div>
              </div>
              <Chip tone="neutral" size="md">Pending</Chip>
            </div>
          ) : conn.status === "accepted" ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Chip tone="sage" size="md">Connected</Chip>
                <span className="text-[13px] text-muted">
                  You&rsquo;re teammates in Grupply.
                </span>
              </div>
              <form
                action={async () => {
                  "use server";
                  await disconnectConnectionAction(
                    conn.id as string,
                    targetUserId,
                  );
                }}
              >
                <SubmitButton
                  pendingLabel="Disconnecting…"
                  className={buttonClass({ variant: "ghost", size: "sm" })}
                >
                  Disconnect
                </SubmitButton>
              </form>
            </div>
          ) : (
            <Chip tone="neutral" size="md">
              {conn.status as string}
            </Chip>
          )}
        </section>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[7fr_5fr]">
        <section className="rounded-[14px] border border-border bg-surface p-6 flex flex-col gap-4">
          <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
            Interests
          </h2>
          {hobbyList.length === 0 ? (
            <div className="text-[14px] italic text-muted">
              No hobbies listed yet.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {hobbyList.map((h) => (
                <Chip
                  key={h.name}
                  tone={h.shared ? "ember" : "neutral"}
                  size="md"
                >
                  {h.shared ? (
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-ember"
                    />
                  ) : null}
                  {h.name}
                </Chip>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[14px] border border-border bg-surface overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
              Paths crossed
            </h2>
          </div>
          {sharedEventNames.length === 0 ? (
            <div className="px-5 py-5 text-[13px] italic text-muted">
              You haven&rsquo;t been at the same event yet.
            </div>
          ) : (
            <ul className="flex flex-col">
              {sharedEventNames.map((e, i) => (
                <li
                  key={e.id}
                  className={`px-5 py-2.5 ${i === 0 ? "" : "border-t border-border"}`}
                >
                  <Link
                    href={`/events/${e.id}`}
                    className="flex items-center justify-between gap-3 text-[14px] text-ink hover:text-iris-deep"
                  >
                    <span>{e.title}</span>
                    <span className="font-mono text-[11px] text-muted">
                      {new Date(e.date_time).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "2-digit",
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
