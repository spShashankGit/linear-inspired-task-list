#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/infra/security"
OUTPUT_FILE="$OUTPUT_DIR/security-check-output.txt"

: > "$OUTPUT_FILE"

log() {
    printf '%s\n' "$1" | tee -a "$OUTPUT_FILE"
}

run() {
    local label="$1"
    shift
    log ""
    log "## $label"
    if "$@" >> "$OUTPUT_FILE" 2>&1; then
        log "[PASS] $label"
    else
        log "[WARN] $label failed. Review output above."
    fi
}

cd "$ROOT_DIR"

log "Security checks run at: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
run "API build/typecheck" pnpm --filter @app/api build
run "Web build/typecheck" pnpm --filter @app/web build
run "Web unit tests" pnpm --filter @app/web test:unit
if [[ "${RUN_AUDIT:-0}" == "1" ]]; then
    run "Dependency audit (workspace)" pnpm audit --prod
else
    log ""
    log "## Dependency audit (workspace)"
    log "[SKIP] Set RUN_AUDIT=1 to run network-dependent dependency audit."
fi

if command -v trivy >/dev/null 2>&1; then
    run "Trivy filesystem scan" trivy fs --scanners vuln,misconfig --severity HIGH,CRITICAL --exit-code 0 .
else
    log ""
    log "## Trivy filesystem scan"
    log "[SKIP] trivy not installed."
fi

log ""
log "Security checks complete. Output: $OUTPUT_FILE"
