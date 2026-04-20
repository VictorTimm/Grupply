import { beforeEach, describe, expect, it, vi } from "vitest";

import { provisionRegistration } from "@/lib/auth/register-provisioning";

function createAdminDouble() {
  const rpc = vi.fn();
  const deleteUser = vi.fn().mockResolvedValue({ data: null, error: null });
  const tables = new Map<string, Record<string, ReturnType<typeof vi.fn>>>();

  const getTable = (name: string) => {
    if (!tables.has(name)) {
      tables.set(name, {
        insert: vi.fn(),
        delete: vi.fn(),
        select: vi.fn(),
        in: vi.fn(),
        eq: vi.fn(),
        single: vi.fn(),
      });
    }

    return tables.get(name)!;
  };

  const admin = {
    rpc,
    from: vi.fn((name: string) => {
      const table = getTable(name);
      return {
        insert: table.insert,
        delete: table.delete,
        select: table.select,
        in: table.in,
        eq: table.eq,
        single: table.single,
      };
    }),
    auth: {
      admin: {
        deleteUser,
      },
    },
  };

  return {
    admin,
    rpc,
    deleteUser,
    getTable,
  };
}

describe("provisionRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the rpc path when the function exists", async () => {
    const { admin, rpc } = createAdminDouble();
    rpc.mockResolvedValue({ data: "org-1", error: null });

    const result = await provisionRegistration({
      admin: admin as never,
      requestId: "req-1",
      userId: "user-1",
      values: {
        email: "user@example.com",
        password: "password123",
        firstName: "Ada",
        lastName: "Lovelace",
        organizationName: "Analytical Engine",
        joinCode: "",
        biography: "Bio",
        hobbyNames: ["Chess"],
        flow: "new",
      },
    });

    expect(result).toEqual({
      organizationId: "org-1",
      strategy: "rpc",
    });
  });

  it("falls back to server-side provisioning when the rpc function is missing", async () => {
    const { admin, rpc, getTable } = createAdminDouble();
    rpc
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: "PGRST202",
          message: "function public.provision_registration does not exist",
        },
      })
      .mockResolvedValueOnce({ data: "org-joined", error: null });

    getTable("organization_members").insert.mockResolvedValue({ data: null, error: null });
    getTable("profiles").insert.mockResolvedValue({ data: null, error: null });
    getTable("hobbies").select.mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: [{ id: 1, name: "Chess" }],
        error: null,
      }),
    });
    getTable("user_hobbies").insert.mockResolvedValue({ data: null, error: null });
    getTable("audit_logs").insert.mockResolvedValue({ data: null, error: null });

    const result = await provisionRegistration({
      admin: admin as never,
      requestId: "req-2",
      userId: "user-2",
      values: {
        email: "user@example.com",
        password: "password123",
        firstName: "Grace",
        lastName: "Hopper",
        organizationName: "",
        joinCode: "invite-code",
        biography: "",
        hobbyNames: ["Chess"],
        flow: "join",
      },
    });

    expect(result).toEqual({
      organizationId: "org-joined",
      strategy: "server_fallback",
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "resolve_org_id_by_join_code", {
      p_code: "invite-code",
    });
  });

  it("rolls back the auth user when fallback provisioning fails", async () => {
    const { admin, rpc, getTable, deleteUser } = createAdminDouble();
    rpc.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST202",
        message: "function public.provision_registration does not exist",
      },
    });

    getTable("organizations").insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "org-new" },
          error: null,
        }),
      }),
    });
    getTable("organization_members").insert.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied" },
    });
    getTable("organizations").delete.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    await expect(
      provisionRegistration({
        admin: admin as never,
        requestId: "req-3",
        userId: "user-3",
        values: {
          email: "user@example.com",
          password: "password123",
          firstName: "Grace",
          lastName: "Hopper",
          organizationName: "New Org",
          joinCode: "",
          biography: "",
          hobbyNames: [],
          flow: "new",
        },
      }),
    ).rejects.toMatchObject({
      code: "42501",
      message: "permission denied",
    });

    expect(deleteUser).toHaveBeenCalledWith("user-3");
  });
});
