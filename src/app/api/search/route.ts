import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const { data: events } = await supabase
    .from("events")
    .select("id,title,date_time,location")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .textSearch("search", q, { type: "websearch" })
    .order("date_time", { ascending: true })
    .limit(5);

  const { data: people } = await supabase
    .from("profiles")
    .select("user_id,first_name,last_name,avatar_url")
    .eq("organization_id", organizationId)
    .textSearch("search", q, { type: "websearch" })
    .order("last_name", { ascending: true })
    .limit(5);

  return NextResponse.json({ events: events ?? [], people: people ?? [] });
}

