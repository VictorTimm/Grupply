import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Escape `%` and `_` for Postgres ILIKE when passed through PostgREST `.or()` filters. */
function ilikePattern(raw: string): string {
  const escaped = raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  return `%${escaped}%`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ events: [], people: [] });

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return NextResponse.json({ events: [], people: [] }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  const organizationId = profile?.organization_id;
  if (!organizationId) return NextResponse.json({ events: [], people: [] }, { status: 400 });

  const { data: eventsTs } = await supabase
    .from("events")
    .select("id,title,date_time,location")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .textSearch("search", q, { type: "websearch" })
    .order("date_time", { ascending: true })
    .limit(5);

  let events = eventsTs ?? [];
  if (events.length === 0) {
    const pattern = ilikePattern(q);
    const { data: eventsFb } = await supabase
      .from("events")
      .select("id,title,date_time,location")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .ilike("title", pattern)
      .order("date_time", { ascending: true })
      .limit(5);
    events = eventsFb ?? [];
  }

  const { data: peopleRpc, error: peopleRpcError } = await supabase.rpc("search_org_people", {
    p_query: q,
  });

  const people =
    !peopleRpcError && peopleRpc?.length
      ? peopleRpc
      : await fallbackPeopleSearch(supabase, organizationId, q);

  return NextResponse.json({ events, people });
}

async function fallbackPeopleSearch(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  q: string,
) {
  const pattern = ilikePattern(q);
  const peopleSelect = "user_id,first_name,last_name,avatar_url";
  const [{ data: peopleTs }, { data: byFirst }, { data: byLast }] = await Promise.all([
    supabase
      .from("profiles")
      .select(peopleSelect)
      .eq("organization_id", organizationId)
      .textSearch("search", q, { type: "websearch" })
      .order("last_name", { ascending: true })
      .limit(5),
    supabase
      .from("profiles")
      .select(peopleSelect)
      .eq("organization_id", organizationId)
      .ilike("first_name", pattern)
      .order("last_name", { ascending: true })
      .limit(5),
    supabase
      .from("profiles")
      .select(peopleSelect)
      .eq("organization_id", organizationId)
      .ilike("last_name", pattern)
      .order("last_name", { ascending: true })
      .limit(5),
  ]);
  let people = peopleTs ?? [];
  if (people.length === 0) {
    const merged = new Map<string, (typeof people)[number]>();
    for (const row of [...(byFirst ?? []), ...(byLast ?? [])]) {
      merged.set(row.user_id, row);
    }
    people = Array.from(merged.values())
      .sort((a, b) => (a.last_name ?? "").localeCompare(b.last_name ?? ""))
      .slice(0, 5);
  }
  return people;
}

