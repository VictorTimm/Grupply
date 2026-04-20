"use client";

import { useRef, useState, useTransition } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Avatar } from "@/components/Avatar";
import { buttonClass } from "@/components/ui";
import { setAvatarUrlAction } from "./actions";

type Props = {
  userId: string;
  currentUrl: string | null;
  initials: string;
};

const MAX_SIZE_MB = 2;

export function ProfileAvatarUploader({ userId, currentUrl, initials }: Props) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = uploading || isPending;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB} MB.`);
      return;
    }

    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const path = userId;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      startTransition(async () => {
        await setAvatarUrlAction(publicUrl);
        setPreview(publicUrl);
      });
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setError(null);
    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.storage.from("avatars").remove([userId]);

      startTransition(async () => {
        await setAvatarUrlAction(null);
        setPreview(null);
      });
    } catch {
      setError("Remove failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-6">
      <Avatar
        src={preview}
        initials={initials}
        size="xl"
        shape="squircle"
        className="h-28 w-28 text-[32px]"
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label
            className={`${buttonClass({ variant: "secondary", size: "sm" })} ${busy ? "pointer-events-none opacity-50" : ""} cursor-pointer`}
          >
            {busy ? "Uploading…" : preview ? "Change photo" : "Upload photo"}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={busy}
            />
          </label>

          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className={buttonClass({ variant: "ghost", size: "sm" })}
            >
              Remove
            </button>
          )}
        </div>

        {error ? (
          <p className="text-[12px] text-clay">{error}</p>
        ) : (
          <p className="text-[11px] text-muted">
            JPG, PNG or WebP &middot; under {MAX_SIZE_MB} MB
          </p>
        )}
      </div>
    </div>
  );
}
