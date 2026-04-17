import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/env";

function sanitizeNextPath(next: string | null, type?: string | null) {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  if (type === "recovery") {
    return "/reset/confirm";
  }

  return "/login?verified=1";
}

export async function GET(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"), type);

  let response = NextResponse.redirect(new URL(next, requestUrl.origin));

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent("Invalid or expired authentication link. Please try again.")}`,
      requestUrl.origin,
    ),
  );
}
