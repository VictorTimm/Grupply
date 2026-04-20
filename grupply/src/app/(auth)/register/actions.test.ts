import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  getSupabaseAdminConfigStatus: vi.fn(),
  provisionRegistration: vi.fn(),
}));

class RedirectError extends Error {
  constructor(public readonly destination: string) {
    super(`Redirected to ${destination}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (destination: string) => {
    throw new RedirectError(destination);
  },
}));

vi.mock("@/lib/app-url", () => ({
  getAppOrigin: vi.fn(async () => "http://localhost:3000"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      signUp: mocks.signUp,
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

vi.mock("@/lib/supabase/admin-config", () => ({
  getSupabaseAdminConfigStatus: mocks.getSupabaseAdminConfigStatus,
}));

vi.mock("@/lib/auth/register-provisioning", () => ({
  provisionRegistration: mocks.provisionRegistration,
}));

import { registerAction } from "./actions";

function buildFormData(entries: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

async function getRedirect(action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    if (error instanceof RedirectError) {
      return error.destination;
    }
    throw error;
  }

  throw new Error("Expected redirect");
}

function getErrorMessage(destination: string) {
  const params = new URL(destination, "http://localhost").searchParams;
  return params.get("error");
}

describe("registerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signUp.mockResolvedValue({
      data: {
        user: { id: "user-123" },
        session: null,
      },
      error: null,
    });
    mocks.provisionRegistration.mockResolvedValue({
      organizationId: "org-123",
      strategy: "rpc",
    });
    mocks.createSupabaseAdminClient.mockReturnValue({
      rpc: vi.fn(),
    });
    mocks.getSupabaseAdminConfigStatus.mockReturnValue({
      ok: true,
      code: "ok",
      message: "ok",
      role: "service_role",
      serviceRef: "projref",
      urlRef: "projref",
    });
  });

  it("creates a new company and redirects to verify when email confirmation is on", async () => {
    const destination = await getRedirect(() =>
      registerAction(
        buildFormData({
          _flow: "new",
          email: "owner@example.com",
          password: "password123",
          confirm_password: "password123",
          first_name: "Ada",
          last_name: "Lovelace",
          organization_name: "Analytical Engine",
          hobbies: "Chess, Math",
          biography: "First programmer",
        }),
      ),
    );

    expect(destination).toBe("/verify?email=owner%40example.com");
    expect(mocks.provisionRegistration).toHaveBeenCalledWith({
      admin: expect.any(Object),
      requestId: expect.any(String),
      userId: "user-123",
      values: expect.objectContaining({
        firstName: "Ada",
        lastName: "Lovelace",
        biography: "First programmer",
        hobbyNames: ["Chess", "Math"],
        joinCode: "",
        organizationName: "Analytical Engine",
        flow: "new",
      }),
    });
  });

  it("joins an existing company and redirects to dashboard when a session exists", async () => {
    mocks.signUp.mockResolvedValue({
      data: {
        user: { id: "user-456" },
        session: { access_token: "token" },
      },
      error: null,
    });

    const destination = await getRedirect(() =>
      registerAction(
        buildFormData({
          email: "member@example.com",
          password: "password123",
          confirm_password: "password123",
          first_name: "Grace",
          last_name: "Hopper",
          join_code: "invite-123",
        }),
      ),
    );

    expect(destination).toBe("/dashboard");
    expect(mocks.provisionRegistration).toHaveBeenCalledWith({
      admin: expect.any(Object),
      requestId: expect.any(String),
      userId: "user-456",
      values: expect.objectContaining({
        firstName: "Grace",
        lastName: "Hopper",
        biography: "",
        hobbyNames: [],
        joinCode: "invite-123",
        organizationName: "",
        flow: "join",
      }),
    });
  });

  it("shows a configuration error when the service-role key is invalid", async () => {
    mocks.getSupabaseAdminConfigStatus.mockReturnValue({
      ok: false,
      code: "service_role_project_mismatch",
      message: "bad project",
      role: "service_role",
      serviceRef: "other-project",
      urlRef: "projref",
    });
    mocks.createSupabaseAdminClient.mockReturnValue(null);

    const destination = await getRedirect(() =>
      registerAction(
        buildFormData({
          email: "member@example.com",
          password: "password123",
          confirm_password: "password123",
          first_name: "Grace",
          last_name: "Hopper",
          join_code: "invite-123",
        }),
      ),
    );

    expect(getErrorMessage(destination)).toContain(
      "SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL point to different Supabase projects.",
    );
  });

  it("maps provisioning failures to a friendly recovery message", async () => {
    mocks.provisionRegistration.mockRejectedValue({
      code: "42501",
      message: "permission denied for relation profiles",
    });

    const destination = await getRedirect(() =>
      registerAction(
        buildFormData({
          email: "member@example.com",
          password: "password123",
          confirm_password: "password123",
          first_name: "Grace",
          last_name: "Hopper",
          join_code: "invite-123",
        }),
      ),
    );

    expect(getErrorMessage(destination)).toContain(
      "We created the auth user, but could not finish organization setup.",
    );
  });

  it("maps invalid invite codes to the friendly register error", async () => {
    mocks.provisionRegistration.mockRejectedValue({
      code: "P0001",
      message: "invalid_join_code",
    });

    const destination = await getRedirect(() =>
      registerAction(
        buildFormData({
          email: "member@example.com",
          password: "password123",
          confirm_password: "password123",
          first_name: "Grace",
          last_name: "Hopper",
          join_code: "invite-123",
        }),
      ),
    );

    expect(getErrorMessage(destination)).toContain(
      "Invalid or unknown invite code. Check with your admin, or create a new company instead.",
    );
  });
});
