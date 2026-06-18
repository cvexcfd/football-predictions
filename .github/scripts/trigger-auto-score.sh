#!/usr/bin/env bash
# Trigger auto-score workflow via repository_dispatch
# Also keeps old PL/pgSQL disabled (it re-enables itself on every run)
# Used by local cron as primary trigger (GH cron is unreliable on free tier)
set -euo pipefail

REPO="cvexcfd/football-predictions"
DB_URL="${SUPABASE_URL:-https://wvwigonyubvzzkzwdisg.supabase.co}"
DB_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
TOKEN="${GITHUB_TOKEN:-$(gh auth token 2>/dev/null || echo "")}"
NOW="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

if [ -z "$TOKEN" ]; then
  echo "${NOW} FATAL: GITHUB_TOKEN not set and gh auth failed"
  exit 1
fi
if [ -z "$DB_KEY" ]; then
  echo "${NOW} FATAL: SUPABASE_SERVICE_ROLE_KEY not set"
  exit 1
fi

# Step 1: Keep old PL/pgSQL disabled (it re-enables itself)
PATCH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH "${DB_URL}/rest/v1/auto_score_config?id=eq.true" \
  -H "apikey: ${DB_KEY}" \
  -H "Authorization: Bearer ${DB_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}')

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "https://api.github.com/repos/${REPO}/dispatches" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -d '{"event_type": "auto_score_trigger"}')

if [ "$STATUS" = "204" ]; then
  echo "${NOW} trigger=OK PLpgSQL_disable=${PATCH_STATUS}"
else
  echo "${NOW} trigger=FAILED(HTTP_${STATUS}) PLpgSQL_disable=${PATCH_STATUS}"
  exit 1
fi
