import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { deleteMyDataAction, signOutAction } from "./actions";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const organizationId = profile?.organization_id as string | undefined;
  const { data: orgRow } = organizationId
    ? await supabase.from("organizations").select("name").eq("id", organizationId).maybeSingle()
    : { data: null };

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-sm font-semibold">Account</h1>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Email
            </dt>
            <dd className="mt-0.5">{auth.user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              User ID
            </dt>
            <dd className="mt-0.5 font-mono text-xs">{auth.user.id}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Organization
            </dt>
            <dd className="mt-0.5">
              {organizationId ? (
                <>
                  <span className="font-medium">
                    {(orgRow?.name as string | undefined) ?? "Unknown name"}
                  </span>
                  <div className="mt-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {organizationId}
                  </div>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Find People and search only show users whose account uses this exact id. If a
                    teammate sees a different value here, run{" "}
                    <code className="rounded bg-zinc-100 px-1 py-0.5 text-[11px] dark:bg-zinc-900">
                      supabase/sql/move_user_to_organization.sql
                    </code>{" "}
                    in the Supabase SQL Editor (as postgres), or register with a company join code.
                  </p>
                </>
              ) : (
                <span className="text-zinc-500 dark:text-zinc-400">No organization on file.</span>
              )}
            </dd>
          </div>
        </dl>
        <form action={signOutAction} className="mt-4">
          <button
            type="submit"
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold">Notification preferences</h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          All in-app notifications are enabled by default. Event reminders are sent 1 day and 1 hour before event start time.
        </p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked
              readOnly
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            <span className="text-zinc-700 dark:text-zinc-300">
              Event join/leave notifications
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked
              readOnly
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            <span className="text-zinc-700 dark:text-zinc-300">
              Connection request notifications
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked
              readOnly
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            <span className="text-zinc-700 dark:text-zinc-300">
              Event reminders (1 day & 1 hour before)
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-red-200 bg-white p-5 dark:border-red-900/50 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">
          Danger zone
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Permanently delete your profile, memberships, event attendance, connections,
          messages, and notifications. Your auth account may still exist until an admin
          deletes it.
        </p>
        <form action={deleteMyDataAction} className="mt-3">
          <button
            type="submit"
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete my data
          </button>
        </form>
      </section>
    </div>
  );
}
