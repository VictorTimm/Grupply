"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function joinEventAction(eventId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userId)
    .single();
  if (profileError) return;

  const { error } = await supabase.rpc("join_event_with_capacity", {
    target_event_id: eventId,
  });

  if (error) return;

  await supabase.from("audit_logs").insert({
    organization_id: profile.organization_id,
    user_id: userId,
    action: "event.join",
    entity_type: "event",
    entity_id: eventId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/events/joined");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events/discover");
  return;
}

export async function leaveEventAction(eventId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  const { error } = await supabase
    .from("event_attendees")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (error) return;

  if (profile?.organization_id) {
    await supabase.from("audit_logs").insert({
      organization_id: profile.organization_id,
      user_id: userId,
      action: "event.leave",
      entity_type: "event",
      entity_id: eventId,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/events/joined");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events/discover");
  return;
}

export async function createEventAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { ok: false as const, message: "Not authenticated." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const date_time = String(formData.get("date_time") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const capacity = Number.parseInt(capacityRaw || "0", 10);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userId)
    .single();
  if (profileError) return { ok: false as const, message: profileError.message };

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      organization_id: profile.organization_id,
      creator_id: userId,
      title,
      description,
      location,
      date_time,
      capacity,
      status: "active",
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, message: error.message };

  const { error: attendeeError } = await supabase.from("event_attendees").insert({
    organization_id: profile.organization_id,
    event_id: event.id,
    user_id: userId,
  });

  if (attendeeError) {
    await supabase.from("events").delete().eq("id", event.id);
    return { ok: false as const, message: attendeeError.message };
  }

  await supabase.from("audit_logs").insert({
    organization_id: profile.organization_id,
    user_id: userId,
    action: "event.create",
    entity_type: "event",
    entity_id: event.id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/events/discover");
  revalidatePath("/events/joined");
  revalidatePath(`/events/${event.id}`);
  return { ok: true as const, eventId: event.id as string };
}

export async function markNotificationReadAction(notificationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);
  if (error) return { ok: false as const, message: error.message };

  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", userId)
      .single();

    if (profile?.organization_id) {
      await supabase.from("audit_logs").insert({
        organization_id: profile.organization_id,
        user_id: userId,
        action: "notification.read",
        entity_type: "notification",
        entity_id: notificationId,
      });
    }
  }

  revalidatePath("/dashboard");
  return { ok: true as const };
}

