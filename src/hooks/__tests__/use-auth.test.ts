import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";

const mockSignInAction = vi.mocked(signInAction);
const mockSignUpAction = vi.mocked(signUpAction);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" } as any);
});

describe("useAuth - signIn", () => {
  it("returns success result and redirects to anon work project when sign-in succeeds with queued work", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: [{ role: "user", content: "hello" }],
      fileSystemData: { "index.tsx": "code" },
    } as any);
    mockCreateProject.mockResolvedValue({ id: "anon-project-id" } as any);

    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "pass");
    });

    expect(returnValue).toEqual({ success: true });
    expect(mockCreateProject).toHaveBeenCalledWith({
      name: expect.stringContaining("Design from"),
      messages: [{ role: "user", content: "hello" }],
      data: { "index.tsx": "code" },
    });
    expect(mockClearAnonWork).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
  });

  it("redirects to most recent existing project when sign-in succeeds with no anon work", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([
      { id: "project-1" },
      { id: "project-2" },
    ] as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/project-1");
  });

  it("creates a new project and redirects when sign-in succeeds and no projects exist", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "fresh-project-id" } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith({
      name: expect.stringMatching(/^New Design #\d+$/),
      messages: [],
      data: {},
    });
    expect(mockPush).toHaveBeenCalledWith("/fresh-project-id");
  });

  it("returns failure result and does not redirect when sign-in fails", async () => {
    mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "wrong");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockGetProjects).not.toHaveBeenCalled();
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it("ignores anon work when messages array is empty", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} } as any);
    mockGetProjects.mockResolvedValue([{ id: "existing-project" }] as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockClearAnonWork).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-project");
  });
});

describe("useAuth - signUp", () => {
  it("returns success result and creates project from anon work on successful sign-up", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: [{ role: "user", content: "make a button" }],
      fileSystemData: {},
    } as any);
    mockCreateProject.mockResolvedValue({ id: "signup-project-id" } as any);

    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signUp("new@example.com", "pass");
    });

    expect(returnValue).toEqual({ success: true });
    expect(mockCreateProject).toHaveBeenCalledOnce();
    expect(mockClearAnonWork).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/signup-project-id");
  });

  it("redirects to existing project on successful sign-up with no anon work", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "my-project" }] as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "pass");
    });

    expect(mockPush).toHaveBeenCalledWith("/my-project");
  });

  it("returns failure result and does not redirect when sign-up fails", async () => {
    mockSignUpAction.mockResolvedValue({ success: false, error: "Email taken" });

    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signUp("taken@example.com", "pass");
    });

    expect(returnValue).toEqual({ success: false, error: "Email taken" });
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("useAuth - isLoading", () => {
  it("starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  it("is false after a completed signIn", async () => {
    mockSignInAction.mockResolvedValue({ success: false });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "p");
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("is false after a completed signUp", async () => {
    mockSignUpAction.mockResolvedValue({ success: false });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("a@b.com", "p");
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("resets isLoading to false even when signIn throws", async () => {
    mockSignInAction.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "p").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("resets isLoading to false even when signUp throws", async () => {
    mockSignUpAction.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("a@b.com", "p").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});
