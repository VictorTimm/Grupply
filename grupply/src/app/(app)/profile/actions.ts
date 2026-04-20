"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateProfileAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const biography = String(formData.get("biography") ?? "").trim();
  const hobbiesRaw = String(formData.get("hobbies") ?? "").trim();
  const hobbyNames = hobbiesRaw
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
    .slice(0, 20);

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  if (!profile?.organization_id) redirect("/register");
  const organizationId = profile.organization_id as string;
  const { data: ownedCustomHobbies } = await supabase
    .from("hobbies")
    .select("id, name")
    .eq("created_by", userId);

  const { error } = await supabase
    .from("profiles")
    .update({ first_name, last_name, biography })
    .eq("user_id", userId);

  if (error) return;

  const { error: deleteHobbiesError } = await supabase
    .from("user_hobbies")
    .delete()
    .eq("user_id", userId);

  if (deleteHobbiesError) return;

  if (hobbyNames.length > 0) {
    // Insert user-owned custom hobbies that don't exist yet in the catalog.
    const { data: existing } = await supabase
      .from("hobbies")
      .select("name")
      .in("name", hobbyNames);

    const existingNames = new Set(
      (existing ?? []).map((h) => h.name as string),
    );
    const newNames = hobbyNames.filter((n) => !existingNames.has(n));

    if (newNames.length > 0) {
      const { error: insertHobbiesError } = await supabase
        .from("hobbies")
        .insert(newNames.map((name) => ({ name, created_by: userId })));

      if (insertHobbiesError && insertHobbiesError.code !== "23505") {
        return;
      }
    }

    // Now all hobby names exist in the catalog — resolve ids and link
    const { data: hobbyRows, error: hobbyRowsError } = await supabase
      .from("hobbies")
      .select("id, name")
      .in("name", hobbyNames);

    if (hobbyRowsError) return;

    if (hobbyRows && hobbyRows.length > 0) {
      const inserts = hobbyRows.map((h) => ({
        organization_id: organizationId,
        user_id: userId,
        hobby_id: h.id,
      }));
      const { error: insertUserHobbiesError } = await supabase.from("user_hobbies").insert(inserts);
      if (insertUserHobbiesError) return;
    }
  }

  for (const hobby of ownedCustomHobbies ?? []) {
    const hobbyId = hobby.id as number;
    const hobbyName = hobby.name as string;

    if (hobbyNames.includes(hobbyName)) {
      continue;
    }

    const { count, error: hobbyUsageError } = await supabase
      .from("user_hobbies")
      .select("*", { count: "exact", head: true })
      .eq("hobby_id", hobbyId);

    if (hobbyUsageError) continue;

    if ((count ?? 0) === 0) {
      await supabase
        .from("hobbies")
        .delete()
        .eq("id", hobbyId)
        .eq("created_by", userId);
    }
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    user_id: userId,
    action: "profile.update",
    entity_type: "profile",
    entity_id: userId,
  });

  revalidatePath("/profile");
  revalidatePath("/people/find");
}

export async function deleteCustomHobbyAction(hobbyId: string) {
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

  const { data: hobby } = await supabase
    .from("hobbies")
    .select("id, created_by")
    .eq("id", hobbyId)
    .single();

  if (!hobby || (hobby.created_by as string | null) !== userId) {
    return;
  }

  await supabase
    .from("user_hobbies")
    .delete()
    .eq("user_id", userId)
    .eq("hobby_id", hobbyId);

  const { count } = await supabase
    .from("user_hobbies")
    .select("*", { count: "exact", head: true })
    .eq("hobby_id", hobbyId);

  if ((count ?? 0) === 0) {
    await supabase
      .from("hobbies")
      .delete()
      .eq("id", hobbyId)
      .eq("created_by", userId);
  }

  revalidatePath("/profile");
  revalidatePath("/people/find");
}

export async function setAvatarUrlAction(avatarUrl: string | null) {
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

  await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("user_id", userId);

  await supabase.from("audit_logs").insert({
    organization_id: profile.organization_id as string,
    user_id: userId,
    action: avatarUrl ? "profile.avatar.set" : "profile.avatar.remove",
    entity_type: "profile",
    entity_id: userId,
  });

  revalidatePath("/profile");
  revalidatePath("/people/find");
  revalidatePath("/dashboard");
}
