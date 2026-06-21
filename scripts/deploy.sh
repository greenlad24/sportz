#!/usr/bin/env bash
# פריסה בטוחה לדרופלט: בנייה -> העלאה -> בדיקת בריאות -> rollback אוטומטי.
# שימוש: ./scripts/deploy.sh
# מחזיר 0 אם הפריסה בריאה, 1 אם נכשלה (ובוצע rollback אם יש קומיט תקין ידוע).
set -uo pipefail
cd "$(dirname "$0")/.."

LAST_GOOD_FILE=".last-good-deploy"
HEALTH_URL="http://localhost:3000/"
RETRIES=30
SLEEP=3

current=$(git rev-parse HEAD)
echo "==> Deploying $current"

build_and_up() {
  docker compose up -d --build
}

health_ok() {
  for _ in $(seq 1 "$RETRIES"); do
    code=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo 000)
    if [ "$code" = "200" ]; then return 0; fi
    sleep "$SLEEP"
  done
  return 1
}

if ! build_and_up; then
  echo "==> Build/up failed. Previous container (if any) keeps running. No rollback needed." >&2
  exit 1
fi

if health_ok; then
  echo "$current" >"$LAST_GOOD_FILE"
  echo "==> Healthy. Recorded last-good = $current"
  exit 0
fi

echo "==> HEALTH CHECK FAILED for $current" >&2
if [ -f "$LAST_GOOD_FILE" ]; then
  good=$(cat "$LAST_GOOD_FILE")
  echo "==> Rolling back to last-good $good" >&2
  git checkout -f "$good"
  build_and_up
  if health_ok; then
    echo "==> Rollback healthy. Site restored to $good. Fix forward on a branch, then re-deploy." >&2
  else
    echo "==> Rollback ALSO unhealthy. Manual intervention required." >&2
  fi
else
  echo "==> No last-good commit recorded; cannot auto-rollback. Investigate now." >&2
fi
exit 1
