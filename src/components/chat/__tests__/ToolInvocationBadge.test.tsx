import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

test("shows 'Creating' with filename for str_replace_editor create command in progress", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        state: "call",
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/src/components/Button.jsx" },
      }}
    />
  );

  expect(screen.getByText("Creating Button.jsx")).toBeDefined();
});

test("shows done indicator when state is result", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={{
        state: "result",
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeTruthy();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("shows spinner when state is call", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={{
        state: "call",
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
      }}
    />
  );

  expect(container.querySelector(".animate-spin")).toBeTruthy();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows 'Editing' for str_replace command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        state: "call",
        toolCallId: "2",
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/App.jsx" },
      }}
    />
  );

  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("shows 'Editing' for insert command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        state: "call",
        toolCallId: "3",
        toolName: "str_replace_editor",
        args: { command: "insert", path: "/App.jsx" },
      }}
    />
  );

  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("shows 'Reading' for view command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        state: "call",
        toolCallId: "4",
        toolName: "str_replace_editor",
        args: { command: "view", path: "/App.jsx" },
      }}
    />
  );

  expect(screen.getByText("Reading App.jsx")).toBeDefined();
});

test("shows 'Reverting' for undo_edit command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        state: "call",
        toolCallId: "5",
        toolName: "str_replace_editor",
        args: { command: "undo_edit", path: "/App.jsx" },
      }}
    />
  );

  expect(screen.getByText("Reverting App.jsx")).toBeDefined();
});

test("shows 'Renaming' for file_manager rename command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        state: "call",
        toolCallId: "6",
        toolName: "file_manager",
        args: { command: "rename", path: "/old.jsx", new_path: "/new.jsx" },
      }}
    />
  );

  expect(screen.getByText("Renaming old.jsx")).toBeDefined();
});

test("shows 'Deleting' for file_manager delete command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        state: "call",
        toolCallId: "7",
        toolName: "file_manager",
        args: { command: "delete", path: "/unused.jsx" },
      }}
    />
  );

  expect(screen.getByText("Deleting unused.jsx")).toBeDefined();
});

test("extracts only the filename from a nested path", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        state: "call",
        toolCallId: "8",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/src/components/ui/Card.tsx" },
      }}
    />
  );

  expect(screen.getByText("Creating Card.tsx")).toBeDefined();
});
