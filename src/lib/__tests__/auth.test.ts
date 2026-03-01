// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const { createSession, getSession, deleteSession, verifySession } =
  await import("../auth");

const TEST_SECRET = new TextEncoder().encode("development-secret-key");
const COOKIE_NAME = "auth-token";

async function makeToken(
  payload: object,
  options: { expiresIn?: string } = {}
) {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(options.expiresIn ?? "7d")
    .setIssuedAt()
    .sign(TEST_SECRET);
}

function makeRequest(token?: string): NextRequest {
  return {
    cookies: {
      get: (name: string) =>
        name === COOKIE_NAME && token ? { value: token } : undefined,
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// createSession

test("createSession sets an HTTP-only cookie with a JWT", async () => {
  await createSession("user-1", "test@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [name, token, options] = mockCookieStore.set.mock.calls[0];

  expect(name).toBe(COOKIE_NAME);
  expect(typeof token).toBe("string");
  expect(token.split(".")).toHaveLength(3); // valid JWT format
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession JWT contains userId and email", async () => {
  await createSession("user-42", "hello@example.com");

  const token = mockCookieStore.set.mock.calls[0][1];
  const [, payloadB64] = token.split(".");
  const payload = JSON.parse(atob(payloadB64));

  expect(payload.userId).toBe("user-42");
  expect(payload.email).toBe("hello@example.com");
});

// getSession

test("getSession returns null when no cookie is present", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns the session payload for a valid token", async () => {
  const token = await makeToken({ userId: "user-1", email: "a@b.com" });
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("a@b.com");
});

test("getSession returns null for an expired token", async () => {
  const token = await makeToken(
    { userId: "user-1", email: "a@b.com" },
    { expiresIn: "0s" }
  );
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for a tampered token", async () => {
  const token = "header.invalidpayload.invalidsignature";
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

// deleteSession

test("deleteSession removes the auth cookie", async () => {
  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledWith(COOKIE_NAME);
});

// verifySession

test("verifySession returns null when request has no cookie", async () => {
  const session = await verifySession(makeRequest());

  expect(session).toBeNull();
});

test("verifySession returns the session payload for a valid token in the request", async () => {
  const token = await makeToken({ userId: "user-2", email: "x@y.com" });

  const session = await verifySession(makeRequest(token));

  expect(session?.userId).toBe("user-2");
  expect(session?.email).toBe("x@y.com");
});

test("verifySession returns null for an invalid token in the request", async () => {
  const session = await verifySession(makeRequest("not.a.jwt"));

  expect(session).toBeNull();
});

test("verifySession returns null for an expired token in the request", async () => {
  const token = await makeToken(
    { userId: "user-1", email: "a@b.com" },
    { expiresIn: "0s" }
  );

  const session = await verifySession(makeRequest(token));

  expect(session).toBeNull();
});
