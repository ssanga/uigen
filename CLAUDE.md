# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # First-time setup: install deps + prisma generate + migrate
npm run dev          # Start dev server with Turbopack (uses node-compat.cjs shim)
npm run build        # Production build
npm run start        # Run production server
npm run test         # Run all Vitest tests
npm run lint         # ESLint
npm run db:reset     # Reset and re-seed the SQLite database
```

Run a single test file:
```bash
npx vitest run src/lib/__tests__/file-system.test.ts
```

**Environment variables** (`.env`):
- `ANTHROPIC_API_KEY` — optional; omit to run in mock mode (hardcoded component examples)
- `JWT_SECRET` — defaults to `"development-secret-key"` in dev

`node-compat.cjs` is required at startup via `NODE_OPTIONS` — it stubs out `globalThis.localStorage/sessionStorage` to fix SSR compatibility with Node 25+.

## Architecture

UIGen is an AI-powered React component generator. Users describe a component in chat; Claude generates and modifies files in a virtual filesystem; a sandboxed iframe renders the live preview.

### Request / data flow

```
User prompt
  → ChatContext (useChat from @ai-sdk/react)
    → POST /api/chat  { messages, files (serialized VFS), projectId }
      → VirtualFileSystem.deserializeFromNodes(files)
      → streamText(claude-haiku-4-5, tools: str_replace_editor + file_manager)
        → tool calls stream back to client
          → FileSystemContext.handleToolCall() updates in-memory VFS
            → refreshTrigger → PreviewFrame re-renders
              → Babel transforms JSX in-browser
                → importMap with blob URLs + esm.sh for npm packages
                  → sandboxed iframe
      → onFinish: serialize VFS + messages → prisma.project.update()
```

### Key modules

**`src/lib/file-system.ts`** — `VirtualFileSystem` class. Purely in-memory tree of `FileNode` objects. All tool commands (`view`, `create`, `str_replace`, `insert`, `rename`, `delete`) run against this. Serializes to/from plain JSON for API transport and DB storage.

**`src/lib/tools/`** — Tool definitions passed to `streamText`:
- `str-replace.ts` → `str_replace_editor` tool (view/create/edit/undo files)
- `file-manager.ts` → `file_manager` tool (rename/delete)

**`src/lib/transform/jsx-transformer.ts`** — Client-side pipeline:
- `transformJSX()`: Babel transpiles JSX/TSX, strips CSS imports, collects missing imports
- `createImportMap()`: Builds ES module import map; maps `@/` aliases to blob URLs and bare npm specifiers to `esm.sh`
- `createPreviewHTML()`: Full HTML document with Tailwind CDN, import map, error boundary, and dynamic app loader

**`src/lib/contexts/`** — Two React contexts:
- `file-system-context.tsx`: Owns the `VirtualFileSystem` instance; exposes CRUD methods and `handleToolCall`; tracks `selectedFile` and `refreshTrigger`
- `chat-context.tsx`: Owns `useChat` state; sends files from FileSystemContext to the API; handles anonymous-work migration on sign-in

**`src/lib/provider.ts`** — Returns either the real Anthropic Claude model or a `MockLanguageModel` (no API key). Mock returns static JSX for counter/form/card prompts. Max steps: 4 (mock) / 40 (real).

**`src/lib/auth.ts`** — JWT sessions (HS256, 7-day, HTTP-only cookie). `getSession()` / `createSession()` / `deleteSession()`.

**`src/actions/`** — Next.js Server Actions: `signUp`, `signIn`, `signOut`, `getUser`, `createProject`, `getProject`, `getProjects`.

### Database

SQLite via Prisma. The canonical schema is defined in `prisma/schema.prisma` — refer to it whenever you need to understand the structure of data stored in the database. Anonymous projects have `userId: null`. Projects are saved only when the user is authenticated and a `projectId` is provided to the API.

### Auth & routing

- `src/middleware.ts` protects `/api/projects` and `/api/filesystem` paths (JWT check).
- `/` redirects authenticated users to their latest project or creates a new one.
- `/[projectId]` requires auth; deserializes stored messages and VFS into `MainContent`.
- `src/lib/anon-work-tracker.ts` uses `sessionStorage` to migrate anonymous work to a new user account on sign-in.

### UI layout

`main-content.tsx` renders a three-panel `ResizablePanelGroup`:
- **Left (35%)**: `ChatInterface` → `MessageList` + `MessageInput`
- **Right (65%)**: Tabs → `PreviewFrame` (iframe) | `FileTree` + `CodeEditor` (Monaco)

## Code style

Only add comments where the logic is non-obvious. Self-explanatory code should not be commented.

### Tests

Tests live alongside source in `__tests__/` subdirectories. Vitest with jsdom. Coverage includes `VirtualFileSystem`, `jsx-transformer`, both contexts, and all chat/editor components.
