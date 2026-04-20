import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { Chip } from "@/components/ui";

type Person = {
  user_id: string;
  first_name: string;
  last_name: string;
  biography: string | null;
  avatar_url: string | null;
};

type HobbyTag = { id: string; name: string; shared: boolean };

type ConnectionState = { status: string; isRequester: boolean };

function initialsOf(p: Person) {
  return `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase();
}

export default async function FindPeoplePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
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

  const { data: peopleRaw } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name, biography, avatar_url")
    .eq("organization_id", organizationId)
    .neq("user_id", userId)
    .order("last_name", { ascending: true })
    .limit(80);

  const people: Person[] = (peopleRaw as Person[] | null) ?? [];

  const { count: profilesInThisOrg } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  const { data: myHobbies } = await supabase
    .from("user_hobbies")
    .select("hobby_id, hobbies(name)")
    .eq("user_id", userId);
  const myHobbyIds = new Set(
    (myHobbies ?? []).map((h) => h.hobby_id as string),
  );
  const myHobbyNames = new Map<string, string>();
  for (const row of myHobbies ?? []) {
    const rawH = row.hobbies as unknown as
      | { name: string }
      | { name: string }[]
      | null;
    const hname = (Array.isArray(rawH) ? rawH[0]?.name : rawH?.name) ?? "";
    myHobbyNames.set(row.hobby_id as string, hname);
  }

  const peopleIds = people.map((p) => p.user_id);
  const { data: allHobbies } = peopleIds.length > 0
    ? await supabase
        .from("user_hobbies")
        .select("user_id, hobby_id, hobbies(name)")
        .in("user_id", peopleIds)
    : { data: [] };

  const hobbyMap = new Map<string, HobbyTag[]>();
  for (const row of allHobbies ?? []) {
    const uid = row.user_id as string;
    const hid = row.hobby_id as string;
    const rawH = row.hobbies as unknown as
      | { name: string }
      | { name: string }[]
      | null;
    const hname = (Array.isArray(rawH) ? rawH[0]?.name : rawH?.name) ?? "";
    if (!hobbyMap.has(uid)) hobbyMap.set(uid, []);
    hobbyMap.get(uid)!.push({ id: hid, name: hname, shared: myHobbyIds.has(hid) });
  }

  const { data: connections } = await supabase
    .from("user_connections")
    .select("id, requester_id, responder_id, status")
    .or(`requester_id.eq.${userId},responder_id.eq.${userId}`);

  const connectionMap = new Map<string, ConnectionState>();
  for (const c of connections ?? []) {
    const otherId = (c.requester_id === userId
      ? c.responder_id
      : c.requester_id) as string;
    connectionMap.set(otherId, {
      status: c.status as string,
      isRequester: c.requester_id === userId,
    });
  }

  const peopleWithSharedCount = people
    .map((p) => {
      const hobbies = hobbyMap.get(p.user_id) ?? [];
      const shared = hobbies.filter((h) => h.shared).length;
      return { person: p, hobbies, sharedCount: shared };
    })
    .sort((a, b) => b.sharedCount - a.sharedCount);

  const featured = peopleWithSharedCount.slice(0, 3);
  const remaining = peopleWithSharedCount.slice(3);

  const hobbyGroups = new Map<
    string,
    { hobbyName: string; people: typeof peopleWithSharedCount }
  >();
  for (const mine of myHobbyIds) {
    const name = myHobbyNames.get(mine) ?? "";
    const matches = remaining.filter((entry) =>
      entry.hobbies.some((h) => h.id === mine),
    );
    if (matches.length > 0) {
      hobbyGroups.set(mine, { hobbyName: name, people: matches });
    }
  }

  const placedIds = new Set<string>();
  for (const { people: group } of hobbyGroups.values()) {
    for (const entry of group) placedIds.add(entry.person.user_id);
  }
  const unplaced = remaining.filter((r) => !placedIds.has(r.person.user_id));

  return (
    <div className="flex flex-col gap-10">
      {resolvedSearchParams?.error ? (
        <div
          className="border-l-2 border-clay bg-clay/5 px-4 py-2.5 text-[13px] text-clay"
          role="alert"
        >
          {resolvedSearchParams.error}
        </div>
      ) : null}

      {people.length === 0 ? (
        <div className="border-l-2 border-border pl-4 text-[14px] text-muted max-w-2xl">
          <p>No other members in your organization yet.</p>
          {(profilesInThisOrg ?? 0) <= 1 ? (
            <p className="mt-2 text-[13px]">
              Share your invite code from{" "}
              <Link href="/settings" className="text-ember-deep hover:underline">
                Settings
              </Link>
              . Teammates who register with it show up here.
            </p>
          ) : null}
        </div>
      ) : null}

      {featured.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
            Most in common with you
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map(({ person, hobbies, sharedCount }, i) => {
              const conn = connectionMap.get(person.user_id);
              const isSecond = i === 1;
              return (
                <Link
                  key={person.user_id}
                  href={`/people/${person.user_id}`}
                  className={`group flex flex-col gap-4 border border-border bg-surface p-6 transition-[border-color,transform] hover:border-ink hover:-translate-y-[1px] ${
                    isSecond ? "rounded-[16px] md:-translate-y-3" : "rounded-[12px]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Avatar
                      src={person.avatar_url}
                      initials={initialsOf(person)}
                      size="lg"
                      shape="squircle"
                    />
                    {conn ? (
                      <Chip
                        tone={conn.status === "accepted" ? "sage" : "neutral"}
                        size="sm"
                      >
                        {conn.status === "accepted"
                          ? "Connected"
                          : conn.status === "pending"
                            ? conn.isRequester
                              ? "Pending"
                              : "Respond"
                            : conn.status}
                      </Chip>
                    ) : null}
                  </div>
                  <div>
                    <div className="font-display text-[20px] font-medium tracking-tight text-ink leading-tight">
                      {person.first_name} {person.last_name}
                    </div>
                    {sharedCount > 0 ? (
                      <div className="eyebrow text-ember-deep mt-2">
                        {sharedCount} shared interest
                        {sharedCount !== 1 ? "s" : ""}
                      </div>
                    ) : null}
                  </div>
                  {person.biography ? (
                    <p className="text-[13px] leading-relaxed text-ink-soft line-clamp-3">
                      {person.biography}
                    </p>
                  ) : null}
                  {hobbies.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {hobbies.slice(0, 4).map((h) => (
                        <Chip
                          key={h.id}
                          tone={h.shared ? "ember" : "outline"}
                          size="sm"
                        >
                          {h.name}
                        </Chip>
                      ))}
                      {hobbies.length > 4 ? (
                        <Chip tone="ghost" size="sm">
                          +{hobbies.length - 4}
                        </Chip>
                      ) : null}
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {Array.from(hobbyGroups.entries()).map(([hid, group]) => (
        <section key={hid} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
              You both like{" "}
              <span className="text-ink italic normal-case tracking-normal">
                {group.hobbyName}
              </span>
            </h2>
            <span className="font-mono text-[12px] text-muted">
              {group.people.length}
            </span>
          </div>
          <ul className="flex flex-col rounded-[12px] border border-border bg-surface overflow-hidden">
            {group.people.map(({ person, hobbies, sharedCount }, i) => (
              <PersonRow
                key={person.user_id}
                person={person}
                hobbies={hobbies}
                sharedCount={sharedCount}
                conn={connectionMap.get(person.user_id)}
                first={i === 0}
              />
            ))}
          </ul>
        </section>
      ))}

      {unplaced.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
              Also in your org
            </h2>
            <span className="font-mono text-[11px] text-mute-soft">
              {unplaced.length.toString().padStart(2, "0")}
            </span>
          </div>
          <ul className="flex flex-col rounded-[12px] border border-border bg-surface overflow-hidden">
            {unplaced.map(({ person, hobbies, sharedCount }, i) => (
              <PersonRow
                key={person.user_id}
                person={person}
                hobbies={hobbies}
                sharedCount={sharedCount}
                conn={connectionMap.get(person.user_id)}
                first={i === 0}
                compact
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function PersonRow({
  person,
  hobbies,
  sharedCount,
  conn,
  first,
  compact,
}: {
  person: Person;
  hobbies: HobbyTag[];
  sharedCount: number;
  conn?: ConnectionState;
  first: boolean;
  compact?: boolean;
}) {
  return (
    <li
      className={`${first ? "" : "border-t border-border"} ${compact ? "py-3 px-4" : "py-4 px-5"}`}
    >
      <Link
        href={`/people/${person.user_id}`}
        className="group flex items-center gap-4"
      >
        <Avatar
          src={person.avatar_url}
          initials={initialsOf(person)}
          size={compact ? "sm" : "md"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-medium text-ink group-hover:text-iris-deep ${
                compact ? "text-[14px]" : "text-[15px]"
              }`}
            >
              {person.first_name} {person.last_name}
            </span>
            {sharedCount > 0 ? (
              <span className="eyebrow text-ember-deep">
                {sharedCount} shared
              </span>
            ) : null}
            {conn?.status === "accepted" ? (
              <Chip tone="sage" size="sm">Connected</Chip>
            ) : null}
          </div>
          {!compact && person.biography ? (
            <p className="text-[12px] text-muted line-clamp-1 mt-0.5">
              {person.biography}
            </p>
          ) : null}
        </div>
        {!compact ? (
          <div className="hidden md:flex flex-wrap justify-end gap-1 max-w-[260px]">
            {hobbies.slice(0, 3).map((h) => (
              <Chip
                key={h.id}
                tone={h.shared ? "ember" : "ghost"}
                size="sm"
              >
                {h.name}
              </Chip>
            ))}
          </div>
        ) : null}
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted group-hover:text-ember-deep">
          View →
        </span>
      </Link>
    </li>
  );
}
