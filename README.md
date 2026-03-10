# Linear Inspired Task List

A Linear-inspired, keyboard-first task board built to showcase staff-level engineering fundamentals:
- strongly typed frontend and GraphQL backend,
- clear design decisions and docs

## Keyboard Shortcuts
- `Option+K`: open command palette.
- `c`: open create ticket flow.
- `Option+N`: move selected issue(s) to next bucket.
- `Option+B`: move selected issue(s) to previous bucket.
- `Enter` in command palette: open selected issue detail and focus comments.
- 
## Core Product Features
- Kanban board with statuses: `Todo`, `In Progress`, `Parked`, `Done`.
- Keyboard-first command flow (`Option+K`) with create/search/open actions.
- Global shortcuts for status movement (`Option+N` next, `Option+B` previous).
- Drag-and-drop card movement and ordering.
- Issue detail panel with communication thread.
- In-app nudge notifications (bell icon), unread state, and comment posting.
- Session-scoped GraphQL API persistence (ephemeral JSON per session).

## Repository Layout
- `apps/web`: React + TypeScript frontend.
- `apps/api`: GraphQL Yoga API with typed resolvers.


## Local Development
```bash
pnpm install --no-frozen-lockfile
pnpm dev
```

Useful scripts:
- `pnpm dev:web`
- `pnpm dev:api`
- `pnpm --filter @app/api build`
- `pnpm --filter @app/web build`
- `pnpm --filter @app/web test:unit`
