import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";

import { updateProfileAction } from "./actions";
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
    .select("id, name")
    .order("name", { ascending: true });

  const initials = `${(profile.first_name as string).charAt(0)}${(profile.last_name as string).charAt(0)}`;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-sm font-semibold">Profile photo</h2>
          <ProfileAvatarUploader
            userId={userId}
            currentUrl={(profile.avatar_url as string | null) ?? null}
            initials={initials}
          />
        </section>

        <ProfileForm
          profile={{
            first_name: profile.first_name as string,
            last_name: profile.last_name as string,
            biography: (profile.biography as string | null) ?? "",
            current_hobbies: hobbyNames,
          }}
          allHobbies={(allHobbies ?? []).map((h) => ({
            id: h.id as string,
            name: h.name as string,
          }))}
          updateAction={updateProfileAction}
        />
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold">Your profile preview</h2>
        <div className="mt-4 flex items-center gap-3">
          <Avatar
            src={(profile.avatar_url as string | null) ?? null}
            initials={initials}
            size="lg"
            className="font-semibold"
          />
          <div>
            <div className="font-medium">
              {profile.first_name} {profile.last_name}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {auth.user?.email}
            </div>
          </div>
        </div>
        {(profile.biography as string | null) && (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {profile.biography as string}
          </p>
        )}
        {hobbyNames.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {hobbyNames.map((name) => (
              <span
                key={name}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
