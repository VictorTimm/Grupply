"use client";

import Link from "next/link";
import { useState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import {
  buttonClass,
  inputClass,
  labelClass,
  textareaClass,
} from "@/components/ui";

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
      setPasswordError("Passwords don\u2019t match.");
      return false;
    }

    setPasswordError(null);
    return true;
  }

  return (
    <form
      action={registerAction}
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        if (!validatePasswords()) {
          event.preventDefault();
        }
      }}
    >
      {isCreateFlow ? <input type="hidden" name="_flow" value="new" /> : null}

      {isCreateFlow ? (
        <div>
          <label className={labelClass()} htmlFor="organization_name">
            Organization name
          </label>
          <input
            id="organization_name"
            name="organization_name"
            required
            placeholder="Your company or team name"
            className={inputClass()}
          />
          <p className="mt-2 text-[12px] text-muted">
            <Link
              href="/register"
              className="font-medium text-ink underline underline-offset-2 hover:text-ember"
            >
              Join an existing company instead
            </Link>{" "}
            (invite code required).
          </p>
        </div>
      ) : (
        <div>
          <label className={labelClass()} htmlFor="join_code">
            Invite code
          </label>
          <input
            id="join_code"
            name="join_code"
            autoComplete="off"
            required
            placeholder="Paste the code from your admin"
            className={inputClass() + " font-mono"}
          />
          <p className="mt-2 text-[12px] text-muted">
            Ask an owner or admin to copy it from Settings, or{" "}
            <Link
              href="/register?flow=new"
              className="font-medium text-ink underline underline-offset-2 hover:text-ember"
            >
              start a new company
            </Link>
            .
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass()} htmlFor="first_name">
            First name
          </label>
          <input
            id="first_name"
            name="first_name"
            required
            autoComplete="given-name"
            className={inputClass()}
          />
        </div>
        <div>
          <label className={labelClass()} htmlFor="last_name">
            Last name
          </label>
          <input
            id="last_name"
            name="last_name"
            required
            autoComplete="family-name"
            className={inputClass()}
          />
        </div>
      </div>

      <div>
        <label className={labelClass()} htmlFor="email">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass()}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass()} htmlFor="password">
            Password
          </label>
          <input
            id="password"
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
            className={inputClass()}
          />
        </div>
        <div>
          <label className={labelClass()} htmlFor="confirm_password">
            Confirm
          </label>
          <input
            id="confirm_password"
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
            className={inputClass({ invalid: !!passwordError })}
          />
        </div>
      </div>

      {passwordError ? (
        <div className="border-l-2 border-clay bg-clay/5 px-3 py-2 text-[12px] text-clay">
          {passwordError}
        </div>
      ) : null}

      <div>
        <label className={labelClass()} htmlFor="hobbies">
          Hobbies <span className="text-mute-soft normal-case tracking-normal">(comma-separated)</span>
        </label>
        <input
          id="hobbies"
          name="hobbies"
          placeholder="Coffee, Hiking, Board games"
          className={inputClass()}
        />
      </div>

      <div>
        <label className={labelClass()} htmlFor="biography">
          A line or two about you
        </label>
        <textarea
          id="biography"
          name="biography"
          rows={3}
          placeholder={"What you\u2019re into, how you spend weekends\u2026"}
          className={textareaClass()}
        />
      </div>

      <SubmitButton
        pendingLabel={"Creating account\u2026"}
        className={buttonClass({ variant: "primary", size: "lg", full: true })}
      >
        Create account
      </SubmitButton>
    </form>
  );
}
