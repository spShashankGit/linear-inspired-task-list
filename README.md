# Linear Inspired Task List

A Linear-inspired, keyboard-first task board built to showcase staff-level engineering fundamentals:
- strongly typed frontend and GraphQL backend,
- clear design decisions and docs,
- security and delivery automation,
- infrastructure-as-code for GCP/Kubernetes deployment.

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
- `infra/terraform`: GCP provisioning (Artifact Registry + optional GKE).
- `infra/k8s`: Kubernetes manifests for web/api deployment.
- `docs`: runbooks, review guidance, packaging checklist.

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

## Keyboard Shortcuts
- `Option+K`: open command palette.
- `c`: open create ticket flow.
- `Option+N`: move selected issue(s) to next bucket.
- `Option+B`: move selected issue(s) to previous bucket.
- `Enter` in command palette: open selected issue detail and focus comments.

## GitHub Review Mechanisms
- CODEOWNERS: `.github/CODEOWNERS`
- PR template: `.github/pull_request_template.md`
- Issue templates: `.github/ISSUE_TEMPLATE/*`
- CI checks: `.github/workflows/ci.yml`
- Security checks: `.github/workflows/security.yml`

## Deployment (GCP + GKE)
1. Provision infrastructure with Terraform in `infra/terraform`.
2. Configure GitHub Actions secrets/variables (see `docs/deployment-runbook.md`).
3. Run the `Deploy GKE` workflow (`.github/workflows/deploy-gke.yml`).

## Known Demo Constraints
- Data is intentionally ephemeral by session.
- No login/auth user system in this challenge scope.
- Designed for low-cost demo operation, not production multi-tenant scaling.
