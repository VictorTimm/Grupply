import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { NavLink } from "@/components/NavLink";
import { Eyebrow } from "@/components/ui";
import { signOutAction } from "@/app/(app)/settings/actions";

const exploreItems = [
  { href: "/dashboard", label: "Today" },
  { href: "/events/discover", label: "Discover events" },
  { href: "/people/find", label: "Find people" },
] as const;

const youItems = [
  { href: "/events/joined", label: "Your events" },
  { href: "/messages", label: "Messages" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
] as const;

export async function Sidebar() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  let profile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null = null;
  let orgName: string | null = null;

  if (userId) {
    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name, avatar_url, organization_id")
      .eq("user_id", userId)
      .maybeSingle();

    profile = data
      ? {
          first_name: data.first_name,
          last_name: data.last_name,
          avatar_url: data.avatar_url,
        }
      : null;

    if (data?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", data.organization_id)
        .maybeSingle();
      orgName = org?.name ?? null;
    }
  }

  const firstName = profile?.first_name ?? "";
  const lastName = profile?.last_name ?? "";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}` || "?";

  return (
    <aside className="hidden w-[248px] shrink-0 flex-col md:flex">
      <div className="sticky top-0 flex min-h-[calc(100vh-2rem)] flex-col px-2 py-6">
        <Link
          href="/dashboard"
          className="group flex items-baseline gap-1.5 px-2 pb-10"
        >
          <span className="font-display text-[28px] font-medium leading-none tracking-tight text-ink">
            Grupply
          </span>
          <span
            className="h-[6px] w-[6px] rounded-full bg-ember transition-transform group-hover:scale-125"
            aria-hidden
          />
        </Link>

        <div className="flex flex-col gap-1 pl-1">
          <Eyebrow className="px-2 pb-2">Explore</Eyebrow>
          {exploreItems.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-1 pl-1">
          <Eyebrow className="px-2 pb-2">You</Eyebrow>
          {youItems.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-8">
          {orgName ? (
            <div className="px-2 text-[12px] text-muted">
              <span className="eyebrow">Org</span>
              <div className="mt-1 font-medium text-ink-soft">{orgName}</div>
            </div>
          ) : null}

          <div className="mt-2 flex items-center gap-3 rounded-[12px] border border-border bg-surface px-3 py-2.5">
            <Avatar
              src={profile?.avatar_url ?? null}
              initials={initials.toUpperCase()}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-ink">
                {firstName || "You"}
                {lastName ? ` ${lastName}` : ""}
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="text-[11px] text-muted hover:text-ember-deep"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
