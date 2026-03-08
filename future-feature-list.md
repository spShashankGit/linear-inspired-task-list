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
