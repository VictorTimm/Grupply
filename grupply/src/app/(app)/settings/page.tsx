import { redirect } from "next/navigation";

import { ConfirmActionForm } from "@/components/ConfirmActionForm";
import { CopyInviteCodeButton } from "@/components/CopyInviteCodeButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { deleteMyDataAction, rotateOrganizationJoinCodeAction, signOutAction } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

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
    ? await supabase
        .from("organizations")
        .select("name, join_code")
        .eq("id", organizationId)
        .maybeSingle()
    : { data: null };

  const { data: membership } = organizationId
    ? await supabase
        .from("organization_members")
        .select("member_role")
        .eq("organization_id", organizationId)
        .eq("user_id", auth.user.id)
        .maybeSingle()
    : { data: null };

  const memberRole = membership?.member_role as string | undefined;
  const canRotateInvite = memberRole === "owner" || memberRole === "admin";
  const joinCode = (orgRow?.join_code as string | null | undefined)?.trim() ?? "";

  return (
    <div className="grid gap-4">
      {resolvedSearchParams?.error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          {resolvedSearchParams.error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-sm font-semibold">Account</h1>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Email</dt>
            <dd className="mt-0.5">{auth.user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">User ID</dt>
            <dd className="mt-0.5 font-mono text-xs">{auth.user.id}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Organization</dt>
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
                    Teammates only appear in search and People when they join the same organization.
                    Share your invite code so they sign up in the right company space.
                  </p>

                  <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-900">
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Invite code
                    </div>
                    <div className="mt-2 space-y-2">
                      {joinCode ? (
                        <>
                          <div className="break-all font-mono text-xs text-zinc-800 dark:text-zinc-200">
                            {joinCode}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <CopyInviteCodeButton code={joinCode} />
                            {canRotateInvite ? (
                              <ConfirmActionForm
                                action={rotateOrganizationJoinCodeAction}
                                initialLabel="Rotate code"
                                confirmLabel="Click again to rotate"
                                pendingLabel="Rotating…"
                                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
                                confirmClassName="rounded-xl border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-900/60 dark:text-amber-100 dark:hover:bg-amber-900/80"
                                formClassName="inline"
                              />
                            ) : null}
                          </div>
                          {canRotateInvite ? (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Rotating generates a new code. Anyone with the old code can no longer use
                              it to register.
                            </p>
                          ) : (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Ask an owner or admin to rotate the code if it may have leaked.
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            No invite code is available yet.
                          </p>
                          {canRotateInvite ? (
                            <ConfirmActionForm
                              action={rotateOrganizationJoinCodeAction}
                              initialLabel="Generate code"
                              confirmLabel="Click again to generate"
                              pendingLabel="Generating…"
                              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
                              confirmClassName="rounded-xl border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-900/60 dark:text-amber-100 dark:hover:bg-amber-900/80"
                              formClassName="inline"
                            />
                          ) : (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Ask an owner or admin to generate a new invite code.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
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
          All in-app notifications are enabled by default. Event reminders are sent 1 day and 1 hour
          before event start time.
        </p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked
              readOnly
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            <span className="text-zinc-700 dark:text-zinc-300">Event join/leave notifications</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked
              readOnly
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            <span className="text-zinc-700 dark:text-zinc-300">Connection request notifications</span>
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
        <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">Danger zone</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Permanently delete your profile, memberships, event attendance, connections, messages, and
          notifications. Your auth account may still exist until an admin deletes it.
        </p>
        <div className="mt-3">
          <ConfirmActionForm
            action={deleteMyDataAction}
            initialLabel="Delete my data"
            confirmLabel="Click again to delete"
            pendingLabel="Deleting…"
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            confirmClassName="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
            formClassName="inline"
          />
        </div>
      </section>
    </div>
  );
}
