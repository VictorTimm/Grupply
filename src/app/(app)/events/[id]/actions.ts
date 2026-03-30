"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateEventAction(eventId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("creator_id, organization_id")
    .eq("id", eventId)
    .single();

  if (!event || event.creator_id !== userId) return;

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const date_time = String(formData.get("date_time") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const capacity = Number.parseInt(capacityRaw || "0", 10);

  const { error } = await supabase
    .from("events")
    .update({ title, description, location, date_time, capacity })
    .eq("id", eventId);

  if (error) return;

  await supabase.from("audit_logs").insert({
    organization_id: event.organization_id,
    user_id: userId,
    action: "event.update",
    entity_type: "event",
    entity_id: eventId,
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  revalidatePath("/events/discover");
  revalidatePath("/events/joined");
}

export async function cancelEventAction(eventId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("creator_id, organization_id")
    .eq("id", eventId)
    .single();

  if (!event || event.creator_id !== userId) return;

  const { error } = await supabase
    .from("events")
    .update({ status: "canceled" })
    .eq("id", eventId);

  if (error) return;

  await supabase.from("audit_logs").insert({
    organization_id: event.organization_id,
    user_id: userId,
    action: "event.cancel",
    entity_type: "event",
    entity_id: eventId,
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  revalidatePath("/events/discover");
  revalidatePath("/events/joined");
}

export async function deleteEventAction(eventId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("creator_id, organization_id")
    .eq("id", eventId)
    .single();

  if (!event || event.creator_id !== userId) return;

  await supabase.from("event_attendees").delete().eq("event_id", eventId);
  await supabase.from("events").delete().eq("id", eventId);

  await supabase.from("audit_logs").insert({
    organization_id: event.organization_id,
    user_id: userId,
    action: "event.delete",
    entity_type: "event",
    entity_id: eventId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/events/discover");
  revalidatePath("/events/joined");
  redirect("/events/joined");
}
