import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { deleteCustomHobbyAction, updateProfileAction } from "./actions";
import { ProfileForm } from "./ProfileForm";
import { ProfileAvatarUploader } from "./ProfileAvatarUploader";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, biography, avatar_url, organization_id")
    .eq("user_id", userId)
    .single();

  if (!profile) redirect("/register");

  const { data: hobbies } = await supabase
    .from("user_hobbies")
    .select("hobby_id, hobbies(name)")
    .eq("user_id", userId);

  const hobbyNames = (hobbies ?? [])
    .map((h) => {
      const raw = h.hobbies as unknown as { name: string } | { name: string }[] | null;
      return (Array.isArray(raw) ? raw[0]?.name : raw?.name) ?? "";
    })
    .filter(Boolean);

  const { data: allHobbies } = await supabase
    .from("hobbies")
    .select("id, name, created_by")
    .or(`created_by.is.null,created_by.eq.${userId}`)
    .order("name", { ascending: true });

  const firstName = profile.first_name as string;
  const lastName = profile.last_name as string;
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <section className="rounded-[14px] border border-border bg-surface p-6">
        <ProfileAvatarUploader
          userId={userId}
          currentUrl={(profile.avatar_url as string | null) ?? null}
          initials={initials}
        />
      </section>

      <ProfileForm
        profile={{
          first_name: firstName,
          last_name: lastName,
          biography: (profile.biography as string | null) ?? "",
          current_hobbies: hobbyNames,
        }}
        allHobbies={(allHobbies ?? []).map((h) => ({
          id: h.id as string,
          name: h.name as string,
          isOwnedCustom: (h.created_by as string | null) === userId,
        }))}
        deleteCustomHobbyAction={deleteCustomHobbyAction}
        updateAction={updateProfileAction}
      />
    </div>
  );
}
