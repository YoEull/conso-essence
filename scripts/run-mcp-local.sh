#!/usr/bin/env bash
# Runs the MCP Edge Function locally (Deno in Docker) against the project in
# .env.local, on http://127.0.0.1:8787/mcp. Stop with: docker rm -f mcp-local
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.local; set +a
docker rm -f mcp-local >/dev/null 2>&1 || true
docker run -d --name mcp-local --network host \
  -v "$PWD/supabase/functions/mcp:/app" -w /app \
  -e DENO_SERVE_ADDRESS=tcp:127.0.0.1:8787 \
  -e SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  denoland/deno:latest deno run -A index.ts
