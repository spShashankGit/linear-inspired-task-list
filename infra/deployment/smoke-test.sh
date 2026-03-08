#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <WEB_BASE_URL>"
    echo "Example: $0 https://demo.example.com"
    exit 1
fi

WEB_BASE_URL="${1%/}"

echo "[1/3] Checking web root..."
curl -fsS "$WEB_BASE_URL/" >/dev/null

echo "[2/3] Checking GraphQL board query via /graphql..."
GRAPHQL_RESPONSE="$(curl -fsS "$WEB_BASE_URL/graphql" \
  -H 'content-type: application/json' \
  --data '{"query":"query { board { issues { id title owner status } } }"}')"

if echo "$GRAPHQL_RESPONSE" | grep -q '"errors"'; then
    echo "GraphQL response contains errors:"
    echo "$GRAPHQL_RESPONSE"
    exit 2
fi

echo "$GRAPHQL_RESPONSE" | grep -q '"issues"' || {
    echo "GraphQL response did not contain issues payload"
    echo "$GRAPHQL_RESPONSE"
    exit 3
}

echo "[3/3] Smoke test passed."
