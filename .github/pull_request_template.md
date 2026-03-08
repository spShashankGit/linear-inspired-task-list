## Summary
- What changed:
- Why this change:
- Risk level (low/medium/high):

## Validation
- [ ] `pnpm --filter @app/api build`
- [ ] `pnpm --filter @app/web build`
- [ ] `pnpm --filter @app/web test:unit`
- [ ] Manual keyboard-first checks (`Option+K`, `c`, `Option+N`, `Option+B`)

## Security Checklist (OWASP-aligned)
- [ ] Input validation added/updated where needed
- [ ] No secrets committed to source code
- [ ] Auth/session behavior unchanged or explicitly reviewed
- [ ] Error paths avoid leaking sensitive internals
- [ ] Dependencies introduced are justified

## Demo Notes
- Commands to run locally:
- Any feature flags or env vars:
- Screenshots/video updated (if UI changed):
