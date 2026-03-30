"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function connectionErrorRedirect(targetUserId: string, message: string): never {
  redirect(`/people/${targetUserId}?error=${encodeURIComponent(message)}`);
}

export async function sendConnectionAction(targetUserId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  if (targetUserId === userId) {
    connectionErrorRedirect(targetUserId, "You cannot connect with yourself.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  if (!profile?.organization_id) redirect("/register");

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!targetProfile || !targetProfile.organization_id) {
    connectionErrorRedirect(targetUserId, "No profile found for this person.");
  }

  const targetOrgId = targetProfile.organization_id;
  if (targetOrgId !== profile.organization_id) {
    connectionErrorRedirect(
      targetUserId,
      "You can only send connection requests to people in your organization.",
    );
  }

  const { data: existing } = await supabase
    .from("user_connections")
    .select("id, status")
    .or(
      `and(requester_id.eq.${userId},responder_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},responder_id.eq.${userId})`,
    )
    .limit(1);

  const existingStatus = existing?.[0]?.status as string | undefined;
  if (existingStatus === "pending" || existingStatus === "accepted") {
    revalidatePath(`/people/${targetUserId}`);
    revalidatePath("/people/find");
    redirect(`/people/${targetUserId}`);
  }

  const insertPayload = {
    organization_id: profile.organization_id,
    requester_id: userId,
    responder_id: targetUserId,
    status: "pending" as const,
  };

  let insertError = (await supabase.from("user_connections").insert(insertPayload)).error;

  if (insertError?.code === "23505") {
    const { data: stale } = await supabase
      .from("user_connections")
      .select("id, status")
      .or(
        `and(requester_id.eq.${userId},responder_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},responder_id.eq.${userId})`,
      )
      .maybeSingle();

    if (stale?.status === "declined") {
      const { error: upErr } = await supabase
        .from("user_connections")
        .update({
          requester_id: userId,
          responder_id: targetUserId,
          status: "pending",
        })
        .eq("id", stale.id as string);
      insertError = upErr ?? null;
    } else {
      revalidatePath(`/people/${targetUserId}`);
      revalidatePath("/people/find");
      redirect(`/people/${targetUserId}`);
    }
  }

  if (insertError) {
    if (insertError.code === "23505") {
      connectionErrorRedirect(
        targetUserId,
        "A connection or request with this person already exists.",
      );
    }
    connectionErrorRedirect(
      targetUserId,
      insertError.message || "Could not send connection request.",
    );
  }

  await supabase.from("audit_logs").insert({
    organization_id: profile.organization_id,
    user_id: userId,
    action: "connection.request",
    entity_type: "user_connection",
    entity_id: targetUserId,
  });

  revalidatePath(`/people/${targetUserId}`);
  revalidatePath("/people/find");
  redirect(`/people/${targetUserId}`);
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

  if (!conn || conn.responder_id !== userId) {
    redirect(`/people/find?error=${encodeURIComponent("Could not update that connection.")}`);
  }

  const { error } = await supabase
    .from("user_connections")
    .update({ status: response })
    .eq("id", connectionId);

  if (error) {
    redirect(
      `/people/${conn.requester_id}?error=${encodeURIComponent(error.message || "Could not update connection.")}`,
    );
  }

  await supabase.from("audit_logs").insert({
    organization_id: conn.organization_id,
    user_id: userId,
    action: `connection.${response}`,
    entity_type: "user_connection",
    entity_id: connectionId,
  });

  revalidatePath(`/people/${conn.requester_id}`);
  revalidatePath(`/people/${conn.responder_id}`);
  revalidatePath("/people/find");
  redirect(`/people/${conn.requester_id}`);
}

export async function disconnectConnectionAction(
  connectionId: string,
  profileUserId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: conn } = await supabase
    .from("user_connections")
    .select("id, requester_id, responder_id, organization_id")
    .eq("id", connectionId)
    .single();

  const isParticipant =
    conn &&
    (conn.requester_id === userId || conn.responder_id === userId);
  const involvesProfile =
    conn &&
    (conn.requester_id === profileUserId || conn.responder_id === profileUserId);

  if (!isParticipant || !involvesProfile) {
    connectionErrorRedirect(
      profileUserId,
      "You cannot disconnect this connection.",
    );
  }

  const { error } = await supabase.from("user_connections").delete().eq("id", connectionId);

  if (error) {
    connectionErrorRedirect(
      profileUserId,
      error.message || "Could not disconnect.",
    );
  }

  const otherId =
    conn.requester_id === userId ? conn.responder_id : conn.requester_id;

  await supabase.from("audit_logs").insert({
    organization_id: conn.organization_id,
    user_id: userId,
    action: "connection.disconnect",
    entity_type: "user_connection",
    entity_id: connectionId,
  });

  revalidatePath(`/people/${profileUserId}`);
  revalidatePath(`/people/${otherId}`);
  revalidatePath("/people/find");
  redirect(`/people/${profileUserId}`);
}
