"use client";

import Link from "next/link";
import { useState } from "react";

import { SubmitButton } from "@/components/SubmitButton";

type RegisterFormProps = {
  isCreateFlow: boolean;
  registerAction: (formData: FormData) => Promise<void>;
};

export function RegisterForm({
  isCreateFlow,
  registerAction,
}: RegisterFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function validatePasswords() {
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return false;
    }

    setPasswordError(null);
    return true;
  }

  return (
    <form
      action={registerAction}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        if (!validatePasswords()) {
          event.preventDefault();
        }
      }}
    >
      {isCreateFlow ? <input type="hidden" name="_flow" value="new" /> : null}

      {isCreateFlow ? (
        <>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Organization name</span>
            <input
              name="organization_name"
              required
              placeholder="Your company or team name"
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
            />
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            <Link href="/register" className="font-medium text-zinc-700 underline dark:text-zinc-300">
              Join an existing company instead
            </Link>{" "}
            (invite code from your admin).
          </p>
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Invite code</span>
            <input
              name="join_code"
              autoComplete="off"
              required
              placeholder="Paste the code from your admin"
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-500">
              Ask an owner or admin to copy it from Settings if you do not have one yet.
            </span>
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            <Link
              href="/register?flow=new"
              className="font-medium text-zinc-700 underline dark:text-zinc-300"
            >
              Create a new company instead
            </Link>
          </p>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">First name</span>
          <input
            name="first_name"
            required
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Last name</span>
          <input
            name="last_name"
            required
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => {
            const nextPassword = event.target.value;
            setPassword(nextPassword);
            if (confirmPassword && nextPassword === confirmPassword) {
              setPasswordError(null);
            }
          }}
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">Confirm password</span>
        <input
          name="confirm_password"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => {
            const nextConfirmPassword = event.target.value;
            setConfirmPassword(nextConfirmPassword);
            if (passwordError && password === nextConfirmPassword) {
              setPasswordError(null);
            }
          }}
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
        />
      </label>

      {passwordError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {passwordError}
        </div>
      ) : null}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">Hobbies (comma-separated)</span>
        <input
          name="hobbies"
          placeholder="Coffee, Hiking, Board games"
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">Bio</span>
        <textarea
          name="biography"
          rows={3}
          className="resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 outline-none transition focus:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-700"
        />
      </label>

      <SubmitButton
        pendingLabel="Creating account…"
        className="h-11 rounded-2xl bg-[#0052FF] text-sm font-medium text-white shadow-sm transition hover:bg-[#0046DD]"
      >
        Create account
      </SubmitButton>
    </form>
  );
}
