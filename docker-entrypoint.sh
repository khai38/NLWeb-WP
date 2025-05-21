#!/usr/bin/env bash
set -e

# --- 1. load .env if it exists ------------------------------------
if [ -f /app/.env ]; then           # adjust path if needed
  echo "[entrypoint] Loading .env"
  # export every non-comment line of KEY=VAL
  set -o allexport
  . /app/.env
  set +o allexport
fi

# --- optional: only seed once per container life -------------
FLAG_FILE=/tmp/db_seeded
echo "[entrypoint] SEED_ON_START: ${SEED_ON_START:-0}"
echo "[entrypoint] SEED_FEED_URL: ${SEED_FEED_URL:-}"
echo "[entrypoint] SEED_SITE: ${SEED_SITE:-}"

# --- 2. run the seed exactly once per container -------------------
if [ "${SEED_ON_START:-0}" = "1" ] && [ -n "$SEED_FEED_URL" ] && [ -n "$SEED_SITE" ]; then
  python -m tools.db_load "$SEED_FEED_URL" "$SEED_SITE"
fi

# --- 3. hand off to the real cmd ----------------------------------
exec "$@"