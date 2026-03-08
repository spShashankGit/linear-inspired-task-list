# OWASP Top 10 Security Report (Challenge Submission)

## Scope
- Frontend: `apps/web`
- API: `apps/api`
- Deployment manifests: `infra/k8s`
- Terraform baseline: `infra/terraform`

## Summary
This submission applies practical controls for a demo-grade system: strict input validation, signed session cookies, HTTP security headers, CORS allowlist, and secret-based runtime config in Kubernetes.

## Mapping

### A01: Broken Access Control
- Status: Partially addressed (demo scope).
- Evidence:
  - Session isolation by signed `sid` cookie in `apps/api/src/server.ts`.
  - Session data is per-session file in `/tmp/sessions/<sid>.json`.
- Gap:
  - No user authentication/authorization model yet.

### A02: Cryptographic Failures
- Status: Addressed for current scope.
- Evidence:
  - HMAC-signed session cookie with timing-safe verification in `apps/api/src/server.ts`.
  - `HttpOnly` + `SameSite=Lax` cookie settings.

### A03: Injection
- Status: Addressed for API boundary.
- Evidence:
  - All mutation inputs validated via `zod` in `apps/api/src/graphql.ts`.
  - Typed GraphQL access layer in `apps/web/src/apiClient.ts`.

### A04: Insecure Design
- Status: Partially addressed.
- Evidence:
  - Ephemeral demo data model reduces long-term data exposure.
  - Minimal surface area (single API + UI).
- Gap:
  - No threat model artifact yet.

### A05: Security Misconfiguration
- Status: Addressed.
- Evidence:
  - API sets security headers in `apps/api/src/server.ts`:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy: no-referrer`
    - `Permissions-Policy`
    - restrictive `Content-Security-Policy`
  - CORS allowlist via `WEB_ORIGIN` env variable.
  - K8s secret reference for cookie secret in `infra/k8s/api-deployment.yaml`.

### A06: Vulnerable and Outdated Components
- Status: In progress.
- Evidence:
  - Local check script added: `infra/security/run-security-checks.sh`.
- Gap:
  - Requires routine dependency update + audit cadence.

### A07: Identification and Authentication Failures
- Status: Not in challenge scope.
- Evidence:
  - Anonymous demo session model only.
- Gap:
  - No login, MFA, password policy, or RBAC.

### A08: Software and Data Integrity Failures
- Status: Partially addressed.
- Evidence:
  - Locked dependency graph via pnpm lockfile.
  - IaC and containerization defined in `infra/`.
- Gap:
  - Signed artifacts/SLSA provenance not implemented.

### A09: Security Logging and Monitoring Failures
- Status: Partially addressed.
- Evidence:
  - Communication/nudge audit trail captured at application level.
- Gap:
  - Centralized SIEM/alerting not implemented in this challenge scope.

### A10: Server-Side Request Forgery (SSRF)
- Status: Addressed by design for current scope.
- Evidence:
  - API does not perform arbitrary outbound URL fetches from user input.

## Recommended Next Controls
1. Add authentication + authorization model.
2. Add rate limiting and abuse controls for mutations.
3. Add CI security gates (dependency audit + CodeQL) in active repo branch.
4. Add formal threat model and abuse-case test cases.
