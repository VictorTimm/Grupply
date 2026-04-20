import { redirect } from "next/navigation";

import { ConfirmActionForm } from "@/components/ConfirmActionForm";
import { CopyInviteCodeButton } from "@/components/CopyInviteCodeButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Chip, buttonClass } from "@/components/ui";

import {
  deleteMyDataAction,
  rotateOrganizationJoinCodeAction,
  signOutAction,
} from "./actions";
import { SettingsNav } from "./SettingsNav";

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
  const orgName = (orgRow?.name as string | undefined) ?? "Your organization";

  return (
    <div className="flex flex-col gap-8">
      {resolvedSearchParams?.error ? (
        <div
          className="border-l-2 border-clay bg-clay/5 px-4 py-2.5 text-[13px] text-clay"
          role="alert"
        >
          {resolvedSearchParams.error}
        </div>
      ) : null}

      <div className="grid gap-10 md:grid-cols-[180px_1fr]">
        <SettingsNav />

        <div className="flex flex-col gap-6">
          <section
            id="account"
            className="rounded-[14px] border border-border bg-surface p-6 flex flex-col gap-5 scroll-mt-24"
          >
            <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
              Account
            </h2>
            <dl className="flex flex-col">
              <div className="grid grid-cols-[140px_1fr] items-baseline gap-3 border-b border-border py-3">
                <dt className="text-[12px] uppercase tracking-[0.14em] text-muted">
                  Email
                </dt>
                <dd className="text-[14px] text-ink">{auth.user.email}</dd>
              </div>
              <div className="grid grid-cols-[140px_1fr] items-baseline gap-3 py-3">
                <dt className="text-[12px] uppercase tracking-[0.14em] text-muted">
                  User ID
                </dt>
                <dd className="font-mono text-[12px] text-ink-soft break-all">
                  {auth.user.id}
                </dd>
              </div>
            </dl>
            <form action={signOutAction}>
              <button
                type="submit"
                className={buttonClass({ variant: "secondary", size: "sm" })}
              >
                Sign out
              </button>
            </form>
          </section>

          <section
            id="organization"
            className="rounded-[14px] border border-border bg-surface p-6 flex flex-col gap-5 scroll-mt-24"
          >
            <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
              Organization
            </h2>

            {organizationId ? (
              <div className="flex flex-col gap-5">
                <div>
                  <div className="font-display text-[22px] text-ink">
                    {orgName}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-muted break-all">
                    {organizationId}
                  </div>
                </div>

                <p className="text-[13px] text-muted max-w-xl leading-relaxed">
                  Teammates only appear in search and People when they join this
                  organization. Share the invite code so they sign up in the
                  right company space.
                </p>

                <div className="flex flex-col gap-3 border-t border-border pt-5">
                  <div className="text-[12px] uppercase tracking-[0.14em] text-muted">
                    Invite code
                  </div>
                  {joinCode ? (
                    <>
                      <div className="inline-flex w-fit items-center gap-3 rounded-[8px] border border-border bg-surface-sunk px-3 py-2 font-mono text-[13px] text-ink break-all">
                        {joinCode}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CopyInviteCodeButton code={joinCode} />
                        {canRotateInvite ? (
                          <ConfirmActionForm
                            action={rotateOrganizationJoinCodeAction}
                            initialLabel="Rotate code"
                            confirmLabel="Click again to rotate"
                            pendingLabel={"Rotating\u2026"}
                            className={buttonClass({ variant: "ghost", size: "sm" })}
                            confirmClassName={buttonClass({ variant: "danger", size: "sm" })}
                            formClassName="inline"
                          />
                        ) : null}
                      </div>
                      <p className="text-[12px] text-muted">
                        {canRotateInvite
                          ? "Rotating generates a new code. Anyone with the old one can no longer register."
                          : "Ask an owner or admin to rotate the code if it may have leaked."}
                      </p>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-[13px] text-muted">
                        No invite code is available yet.
                      </p>
                      {canRotateInvite ? (
                        <ConfirmActionForm
                          action={rotateOrganizationJoinCodeAction}
                          initialLabel="Generate code"
                          confirmLabel="Click again to generate"
                          pendingLabel={"Generating\u2026"}
                          className={buttonClass({ variant: "secondary", size: "sm" })}
                          confirmClassName={buttonClass({ variant: "primary", size: "sm" })}
                          formClassName="inline"
                        />
                      ) : (
                        <p className="text-[12px] text-muted">
                          Ask an owner or admin to generate one.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {memberRole ? (
                  <div>
                    <Chip tone="iris" size="sm">
                      Role: {memberRole}
                    </Chip>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-[14px] text-muted">No organization on file.</p>
            )}
          </section>

          <section
            id="notifications"
            className="rounded-[14px] border border-border bg-surface p-6 flex flex-col gap-4 scroll-mt-24"
          >
            <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted font-medium">
              Notifications
            </h2>
            <p className="text-[13px] text-muted max-w-xl leading-relaxed">
              Event reminders arrive 1 day and 1 hour before each event. All
              in-app notifications are on by default.
            </p>
            <div className="flex flex-col">
              {[
                "Event join/leave activity",
                "Connection requests",
                "Reminders 1 day and 1 hour before",
              ].map((label, i) => (
                <label
                  key={label}
                  className={`flex items-center gap-3 py-3 ${
                    i === 0 ? "" : "border-t border-border"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked
                    readOnly
                    className="h-4 w-4 accent-ember"
                  />
                  <span className="text-[14px] text-ink">{label}</span>
                  <span className="ml-auto text-[11px] uppercase tracking-[0.14em] text-muted">
                    Always on
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section
            id="danger"
            className="rounded-[14px] border border-clay/40 bg-clay/5 p-6 flex flex-col gap-4 scroll-mt-24"
          >
            <h2 className="text-[13px] uppercase tracking-[0.14em] text-clay font-medium">
              Danger zone
            </h2>
            <p className="text-[13px] text-muted max-w-xl leading-relaxed">
              Permanently delete your profile, memberships, event attendance,
              connections, messages, and notifications. Your auth account may
              still exist until an admin removes it.
            </p>
            <div>
              <ConfirmActionForm
                action={deleteMyDataAction}
                initialLabel="Delete my data"
                confirmLabel="Click again to delete"
                pendingLabel={"Deleting\u2026"}
                className={buttonClass({ variant: "danger", size: "md" }) + " bg-clay text-white border-clay hover:bg-clay/90"}
                confirmClassName={buttonClass({ variant: "danger", size: "md" }) + " bg-clay/90 text-white border-clay"}
                formClassName="inline"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
