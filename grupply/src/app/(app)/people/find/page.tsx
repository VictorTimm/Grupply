import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";

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

  const { data: people } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name, biography, avatar_url")
    .eq("organization_id", organizationId)
    .neq("user_id", userId)
    .order("last_name", { ascending: true })
    .limit(50);

  const { count: profilesInThisOrg } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  const { data: myHobbies } = await supabase
    .from("user_hobbies")
    .select("hobby_id")
    .eq("user_id", userId);
  const myHobbyIds = new Set((myHobbies ?? []).map((h) => h.hobby_id as string));

  const peopleIds = (people ?? []).map((p) => p.user_id as string);
  const { data: allHobbies } = peopleIds.length > 0
    ? await supabase
        .from("user_hobbies")
        .select("user_id, hobby_id, hobbies(name)")
        .in("user_id", peopleIds)
    : { data: [] };

  const hobbyMap = new Map<string, Array<{ id: string; name: string; shared: boolean }>>();
  for (const row of allHobbies ?? []) {
    const uid = row.user_id as string;
    const hid = row.hobby_id as string;
    const rawH = row.hobbies as unknown as { name: string } | { name: string }[] | null;
    const hname = (Array.isArray(rawH) ? rawH[0]?.name : rawH?.name) ?? "";
    if (!hobbyMap.has(uid)) hobbyMap.set(uid, []);
    hobbyMap.get(uid)!.push({ id: hid, name: hname, shared: myHobbyIds.has(hid) });
  }

  const { data: connections } = await supabase
    .from("user_connections")
    .select("id, requester_id, responder_id, status")
    .or(`requester_id.eq.${userId},responder_id.eq.${userId}`);

  const connectionMap = new Map<string, { id: string; status: string; isRequester: boolean }>();
  for (const c of connections ?? []) {
    const otherId = (c.requester_id === userId ? c.responder_id : c.requester_id) as string;
    connectionMap.set(otherId, {
      id: c.id as string,
      status: c.status as string,
      isRequester: c.requester_id === userId,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {resolvedSearchParams?.error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          {resolvedSearchParams.error}
        </div>
      ) : null}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-sm font-semibold">People in your organization</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(people ?? []).length === 0 ? (
            <div className="flex flex-col gap-2 text-sm text-zinc-500 dark:text-zinc-400 sm:col-span-2 lg:col-span-3">
              <p>No other members in your organization yet.</p>
              {(profilesInThisOrg ?? 0) <= 1 ? (
                <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  The database only has one profile linked to your organization id, so teammates are
                  not in the same tenant yet. Open{" "}
                  <Link href="/settings" className="font-medium text-zinc-950 underline dark:text-zinc-50">
                    Settings
                  </Link>{" "}
                  and compare the Organization id with your colleague: it must match exactly. If it
                  does not, run{" "}
                  <code className="rounded bg-zinc-100 px-1 py-0.5 text-[11px] dark:bg-zinc-900">
                    supabase/sql/move_user_to_organization.sql
                  </code>{" "}
                  in the Supabase SQL editor (postgres role), or ask them to sign up with your
                  company join code.
                </p>
              ) : null}
            </div>
          ) : (
            (people ?? []).map((p) => {
              const hobbies = hobbyMap.get(p.user_id as string) ?? [];
              const sharedCount = hobbies.filter((h) => h.shared).length;
              const conn = connectionMap.get(p.user_id as string);

              return (
                <Link
                  key={p.user_id}
                  href={`/people/${p.user_id}`}
                  className="flex flex-col gap-2 rounded-xl border border-zinc-100 p-4 transition hover:border-zinc-200 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:border-zinc-800 dark:hover:bg-zinc-900/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={(p.avatar_url as string | null) ?? null}
                      initials={`${(p.first_name as string).charAt(0)}${(p.last_name as string).charAt(0)}`}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {p.first_name} {p.last_name}
                      </div>
                      {sharedCount > 0 && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                          {sharedCount} shared interest{sharedCount !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                    {conn && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          conn.status === "accepted"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {conn.status === "accepted"
                          ? "Connected"
                          : conn.status === "pending"
                            ? conn.isRequester
                              ? "Pending"
                              : "Respond"
                            : conn.status}
                      </span>
                    )}
                  </div>
                  {(p.biography as string | null) && (
                    <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {p.biography as string}
                    </p>
                  )}
                  {hobbies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {hobbies.slice(0, 5).map((h) => (
                        <span
                          key={h.id}
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            h.shared
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {h.name}
                        </span>
                      ))}
                      {hobbies.length > 5 && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          +{hobbies.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
