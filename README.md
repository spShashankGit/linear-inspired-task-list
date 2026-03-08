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



_______

# Future Feature List

This file captures intentionally deferred features beyond the core challenge timebox.

## 1) AI Ticket Description Assistant v1.5
- Why deferred: Core challenge should prioritize reliability, security, and delivery first.
- Expected impact: Faster issue authoring and better description quality consistency.
- Effort estimate: 4-6 hours.
- Risks/dependencies: Prompt quality tuning, model latency, fallback UX when suggestion fails.

## 2) Multi-channel Nudge Delivery (Slack + Email)
- Why deferred: In-app notifications provide sufficient core signal for v1.
- Expected impact: Better user reach and adoption in existing team workflows.
- Effort estimate: 5-8 hours.
- Risks/dependencies: API credentials, rate limiting per provider, delivery failure handling.

## 3) Advanced Command Palette Actions
- Why deferred: Must first stabilize baseline keyboard flows and bulk operations.
- Expected impact: Faster triage and reduced UI navigation cost.
- Effort estimate: 3-5 hours.
- Risks/dependencies: Action discoverability, shortcut collision, command permissions.

## 4) Kanban Analytics and Throughput Insights
- Why deferred: Core board functionality has higher priority than analytics depth.
- Expected impact: Better planning decisions and bottleneck visibility.
- Effort estimate: 4-7 hours.
- Risks/dependencies: Event model completeness, metric correctness, chart UX clarity.

## 5) Fine-grained RBAC for Bulk Operations
- Why deferred: Baseline authz is enough for challenge MVP.
- Expected impact: Better enterprise readiness and safer team workflows.
- Effort estimate: 4-6 hours.
- Risks/dependencies: Role model expansion, migration strategy, policy testing.

## 6) Production-grade Kubernetes Hardening
- Why deferred: Initial GKE deployment demonstrates deployment competence; hardening can follow.
- Expected impact: Improved resilience and security posture in production.
- Effort estimate: 6-10 hours.
- Risks/dependencies: NetworkPolicy design, pod security standards, secret rotation and observability tuning.

## 7) Load and Chaos Testing Suite
- Why deferred: Functional correctness and deterministic behavior come first.
- Expected impact: Higher confidence under concurrency and failure conditions.
- Effort estimate: 5-9 hours.
- Risks/dependencies: Test environment realism, noisy metrics, failure triage time.

## Prioritization Heuristic
- Implement deferred features only after core Definition of Done is green:
  - `lint`, `typecheck`, tests, security scan artifacts, docs, and demo flow.
