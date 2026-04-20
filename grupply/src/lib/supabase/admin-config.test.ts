import { afterEach, describe, expect, it, vi } from "vitest";

import { getSupabaseAdminConfigStatus } from "@/lib/supabase/admin-config";

describe("getSupabaseAdminConfigStatus", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a matching service-role key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://projref.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      [
        "header",
        Buffer.from(JSON.stringify({ role: "service_role", ref: "projref" })).toString("base64url"),
        "signature",
      ].join("."),
    );

    expect(getSupabaseAdminConfigStatus()).toMatchObject({
      ok: true,
      code: "ok",
      role: "service_role",
      serviceRef: "projref",
      urlRef: "projref",
    });
  });

  it("rejects a token without the service_role claim", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://projref.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      [
        "header",
        Buffer.from(JSON.stringify({ role: "anon", ref: "projref" })).toString("base64url"),
        "signature",
      ].join("."),
    );

    expect(getSupabaseAdminConfigStatus()).toMatchObject({
      ok: false,
      code: "unexpected_service_role",
      role: "anon",
    });
  });

  it("rejects project mismatches between url and service key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://projref.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      [
        "header",
        Buffer.from(JSON.stringify({ role: "service_role", ref: "otherref" })).toString("base64url"),
        "signature",
      ].join("."),
    );

    expect(getSupabaseAdminConfigStatus()).toMatchObject({
      ok: false,
      code: "service_role_project_mismatch",
      serviceRef: "otherref",
      urlRef: "projref",
    });
  });
});
