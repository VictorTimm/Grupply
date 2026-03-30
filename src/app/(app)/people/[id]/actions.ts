"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function sendConnectionAction(targetUserId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  if (!profile?.organization_id) redirect("/register");

  const { data: existing } = await supabase
    .from("user_connections")
    .select("id")
    .or(
      `and(requester_id.eq.${userId},responder_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},responder_id.eq.${userId})`,
    )
    .limit(1);

  if (existing && existing.length > 0) return;

  const { error } = await supabase.from("user_connections").insert({
    organization_id: profile.organization_id,
    requester_id: userId,
    responder_id: targetUserId,
    status: "pending",
  });

  if (error) return;

  await supabase.from("audit_logs").insert({
    organization_id: profile.organization_id,
    user_id: userId,
    action: "connection.request",
    entity_type: "user_connection",
    entity_id: targetUserId,
  });

  revalidatePath(`/people/${targetUserId}`);
  revalidatePath("/people/find");
}

export async function respondConnectionAction(
  connectionId: string,
  response: "accepted" | "declined",
) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: conn } = await supabase
    .from("user_connections")
    .select("id, responder_id, organization_id, requester_id")
    .eq("id", connectionId)
    .single();

  if (!conn || conn.responder_id !== userId) return;

  const { error } = await supabase
    .from("user_connections")
    .update({ status: response })
    .eq("id", connectionId);

  if (error) return;

  await supabase.from("audit_logs").insert({
    organization_id: conn.organization_id,
    user_id: userId,
    action: `connection.${response}`,
    entity_type: "user_connection",
    entity_id: connectionId,
  });

  revalidatePath(`/people/${conn.requester_id}`);
  revalidatePath("/people/find");
}
