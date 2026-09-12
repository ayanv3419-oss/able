import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null),
  createAuth: vi.fn(),
  getToken: vi.fn(async () => null),
  getUser: vi.fn(async () => ({
    email: "preview@able.test",
    id: "local-student-id",
    image: null,
  })),
  providerGet: vi.fn(async () => Response.json({ connected: true })),
  providerPost: vi.fn(async () => Response.json({ connected: true })),
}));

vi.mock("next-auth", () => ({
  default: (config: unknown) => {
    mocks.createAuth(config);
    return {
      auth: mocks.auth,
      handlers: { GET: mocks.providerGet, POST: mocks.providerPost },
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  },
}));
vi.mock("next-auth/jwt", () => ({ getToken: mocks.getToken }));
vi.mock("@/lib/db/queries", () => ({ getOrCreateUserByEmail: mocks.getUser }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => undefined),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("ABLE_LOCAL_PREVIEW", "true");
  vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
  vi.stubEnv("PLAYWRIGHT", "true");
});
afterEach(() => vi.unstubAllEnvs());

describe("local v1 without sign-in", () => {
  it("opens protected pages and APIs without looking for a session cookie", async () => {
    const { proxy } = await import("@/proxy");
    const responses = await Promise.all(
      ["/", "/settings", "/api/entitlements"].map((path) =>
        proxy(new NextRequest(`http://localhost:3105${path}`))
      )
    );
    for (const response of responses) {
      expect(response.headers.get("x-middleware-next")).toBe("1");
    }
    expect(mocks.getToken).not.toHaveBeenCalled();
  });

  it("sends old login links straight to the app", async () => {
    const { proxy } = await import("@/proxy");
    const response = await proxy(
      new NextRequest("http://localhost:3105/login")
    );
    expect(response.headers.get("location")).toBe("http://localhost:3105/");
  });

  it("uses the same persisted sample user for server and client sessions", async () => {
    const { auth, GET } = await import("@/app/(auth)/auth");
    const serverSession = await auth();
    const response = await GET(
      new NextRequest("http://localhost:3105/api/auth/session")
    );
    const clientSession = await response.json();
    expect(clientSession.user).toEqual(serverSession?.user);
    expect(clientSession.localPreview).toBe(true);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.getUser).toHaveBeenCalledWith({
      email: "preview@able.test",
      name: "Local v1",
    });
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("does not register Google or the email-selecting test provider", async () => {
    const { GET, POST } = await import("@/app/(auth)/auth");
    const response = await GET(
      new NextRequest("http://localhost:3105/api/auth/providers")
    );
    expect(await response.json()).toEqual({});
    expect(mocks.createAuth.mock.calls[0][0].providers).toEqual([]);
    const callback = await POST(
      new NextRequest("http://localhost:3105/api/auth/callback/google", {
        method: "POST",
      })
    );
    expect(callback.status).toBe(404);
    expect(mocks.providerPost).not.toHaveBeenCalled();
  });

  it.each([
    { mode: "production", preview: "true" },
    { mode: "development", preview: "false" },
  ])("keeps cookie authentication in $mode with preview=$preview", async ({
    mode,
    preview,
  }) => {
    vi.stubEnv("NODE_ENV", mode);
    vi.stubEnv("ABLE_LOCAL_PREVIEW", preview);
    const { auth, GET } = await import("@/app/(auth)/auth");
    const { proxy } = await import("@/proxy");
    expect(await auth()).toBeNull();
    expect(mocks.getUser).not.toHaveBeenCalled();
    const denied = await proxy(
      new NextRequest("http://localhost:3105/api/entitlements")
    );
    expect(denied.status).toBe(401);
    const response = await GET(
      new NextRequest("http://localhost:3105/api/auth/session")
    );
    expect(await response.json()).toEqual({ connected: true });
    expect(mocks.providerGet).toHaveBeenCalledOnce();
  });
});
