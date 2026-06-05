#!/usr/bin/env bash
# scaffold.sh — one-shot provisioning + first deploy of the archaeology substrate.
#
# Idempotent — safe to re-run. Each step prints what it did or skipped.
#
# Prerequisites:
#   - Cloudflare API token with: D1 / R2 / Workers / Vectorize Edit scopes
#   - CF account ID
#   - gh CLI authenticated (for setting ARCHAEOLOGY_INGEST_TOKEN repo secret)
#   - Node 20+, Python 3.11+
#
# Usage:
#   cd tools/archaeology
#   bash scaffold.sh
#
# Variables read from environment OR prompted interactively:
#   PROJECT_SLUG               — short name (e.g. "subs", "dms", "askbc")
#   PROJECT_ID                 — full project name (e.g. "bc-subscriptions")
#   CLOUDFLARE_API_TOKEN       — CF token (or path in CF_TOKEN_FILE)
#   CLOUDFLARE_ACCOUNT_ID      — CF account UUID
#   GH_REPO                    — owner/name for setting ARCHAEOLOGY_INGEST_TOKEN secret

set -euo pipefail

# ------- 0. resolve variables -------

PROJECT_SLUG="${PROJECT_SLUG:-}"
PROJECT_ID="${PROJECT_ID:-}"
CF_TOKEN_FILE="${CF_TOKEN_FILE:-$HOME/.config/cf/token}"
GH_REPO="${GH_REPO:-}"

read_or_prompt() {
  local var=$1 prompt=$2
  if [ -z "${!var}" ]; then
    read -r -p "$prompt: " value
    export "$var=$value"
  fi
}

read_or_prompt PROJECT_SLUG "Project slug (e.g. subs, dms, askbc)"
read_or_prompt PROJECT_ID   "Project ID  (e.g. bc-subscriptions, dms-self-serve)"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  if [ -f "$CF_TOKEN_FILE" ]; then
    export CLOUDFLARE_API_TOKEN="$(cat "$CF_TOKEN_FILE")"
  else
    echo "ERROR: CLOUDFLARE_API_TOKEN not set and $CF_TOKEN_FILE missing"
    exit 1
  fi
fi

read_or_prompt CLOUDFLARE_ACCOUNT_ID "Cloudflare account ID"
read_or_prompt GH_REPO              "GitHub repo (owner/name) for secrets"

# ------- 1. templatize files (fills {{PROJECT_SLUG}} and {{PROJECT_ID}} placeholders) -------

echo "[scaffold] templatizing files for PROJECT_SLUG=$PROJECT_SLUG / PROJECT_ID=$PROJECT_ID"

# We use a portable sed pattern (works on macOS + GNU)
templatize() {
  local file=$1
  # macOS sed needs '' after -i; we sidestep with a temp file
  local tmp="${file}.scaffold.tmp"
  sed -e "s|{{PROJECT_SLUG}}|${PROJECT_SLUG}|g" \
      -e "s|{{PROJECT_ID}}|${PROJECT_ID}|g" \
      "$file" > "$tmp"
  mv "$tmp" "$file"
}

for f in \
  worker/wrangler.toml \
  worker/package.json \
  ingesters/_common.py \
  embed_drive.py \
  web/ArchaeologyChat.tsx; do
  if [ -f "$f" ] && grep -q "{{PROJECT_SLUG}}\|{{PROJECT_ID}}" "$f"; then
    templatize "$f"
    echo "  templatized $f"
  fi
done

# Compute Claude Code session-dir slug if it's still a placeholder. Claude Code
# derives `~/.claude/projects/<slug>` from the repo's absolute path by replacing
# '/' with '-'.
if [ -f ingesters/sessions.py ] && grep -q "{{CLAUDE_SESSION_DIR_SLUG}}" ingesters/sessions.py; then
  repo_abs="$(cd ../.. && pwd)"
  slug="$(echo "$repo_abs" | sed 's|/|-|g')"
  sed -e "s|{{CLAUDE_SESSION_DIR_SLUG}}|${slug}|g" ingesters/sessions.py > ingesters/sessions.py.tmp
  mv ingesters/sessions.py.tmp ingesters/sessions.py
  echo "  templatized ingesters/sessions.py (session-dir slug: $slug)"
fi

# ------- 2. install worker dependencies -------

echo "[scaffold] installing worker dependencies"
( cd worker && npm install --silent )

# ------- 3. provision D1 / R2 / Vectorize (idempotent — skip if exists) -------

DB_NAME="${PROJECT_SLUG}-archaeology"
R2_NAME="${PROJECT_SLUG}-archaeology-blobs"
VECTORIZE_NAME="${PROJECT_SLUG}-archaeology-chunks"

run_wrangler() {
  ( cd worker && npx wrangler "$@" )
}

# D1
if ! run_wrangler d1 list 2>/dev/null | grep -q "$DB_NAME"; then
  echo "[scaffold] creating D1 database $DB_NAME"
  out=$(run_wrangler d1 create "$DB_NAME")
  db_id=$(echo "$out" | grep -E 'database_id\s*=' | head -1 | sed -E 's/.*"([0-9a-f-]+)".*/\1/')
  sed -e "s|database_id = \"PROVISION_ME\"|database_id = \"${db_id}\"|" worker/wrangler.toml > worker/wrangler.toml.tmp
  mv worker/wrangler.toml.tmp worker/wrangler.toml
  echo "  populated database_id in wrangler.toml: $db_id"
else
  echo "[scaffold] D1 database $DB_NAME already exists"
fi

# R2
if ! run_wrangler r2 bucket list 2>/dev/null | grep -q "$R2_NAME"; then
  echo "[scaffold] creating R2 bucket $R2_NAME"
  run_wrangler r2 bucket create "$R2_NAME"
else
  echo "[scaffold] R2 bucket $R2_NAME already exists"
fi

# Vectorize
if ! run_wrangler vectorize list 2>/dev/null | grep -q "$VECTORIZE_NAME"; then
  echo "[scaffold] creating Vectorize index $VECTORIZE_NAME (768 dim, cosine)"
  run_wrangler vectorize create "$VECTORIZE_NAME" --dimensions=768 --metric=cosine
else
  echo "[scaffold] Vectorize index $VECTORIZE_NAME already exists"
fi

# ------- 4. generate + set the ingest token (local file + worker secret + gh secret) -------

TOKEN_DIR="${HOME}/.config/archaeology"
TOKEN_FILE="${TOKEN_DIR}/ingest-token"

mkdir -p "$TOKEN_DIR"
if [ ! -f "$TOKEN_FILE" ]; then
  echo "[scaffold] generating fresh ingest token at $TOKEN_FILE"
  openssl rand -hex 32 > "$TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"
fi

echo "[scaffold] pushing ARCHAEOLOGY_INGEST_TOKEN to Worker secret"
( cd worker && npx wrangler secret put ARCHAEOLOGY_INGEST_TOKEN < "$TOKEN_FILE" >/dev/null )

echo "[scaffold] pushing ARCHAEOLOGY_INGEST_TOKEN to gh repo $GH_REPO"
cat "$TOKEN_FILE" | gh secret set ARCHAEOLOGY_INGEST_TOKEN -R "$GH_REPO" >/dev/null

# ------- 5. apply D1 schema -------

echo "[scaffold] applying D1 schema (events + refs + entities + ingest_bookmarks + embed-state)"
( cd worker && npm run --silent migrate:remote >/dev/null )

# ------- 6. deploy the worker -------

echo "[scaffold] deploying Worker"
deploy_out=$(run_wrangler deploy)
worker_url=$(echo "$deploy_out" | grep -oE 'https://[^ ]+\.workers\.dev' | head -1)

# Now that the Worker is deployed we know its full URL, extract the CF workers
# subdomain (e.g. "bigcommerce-testing-7727") and substitute into files that
# reference {{CF_WORKERS_SUBDOMAIN}}. Required by web/ArchaeologyChat.tsx,
# ingesters/_common.py, and embed_drive.py.
cf_subdomain=$(echo "$worker_url" | sed -E 's|https://[^.]+\.([^.]+)\.workers\.dev|\1|')
if [ -n "$cf_subdomain" ] && [ "$cf_subdomain" != "$worker_url" ]; then
  echo "[scaffold] CF workers subdomain detected: $cf_subdomain"
  for f in \
    web/ArchaeologyChat.tsx \
    ingesters/_common.py \
    embed_drive.py; do
    if [ -f "$f" ] && grep -q "{{CF_WORKERS_SUBDOMAIN}}" "$f"; then
      sed -e "s|{{CF_WORKERS_SUBDOMAIN}}|${cf_subdomain}|g" "$f" > "$f.scaffold.tmp"
      mv "$f.scaffold.tmp" "$f"
      echo "  templatized $f (CF subdomain)"
    fi
  done
fi

# ------- 7. smoke /health -------

echo "[scaffold] verifying /health"
if curl -sS "${worker_url}/health" | grep -q '"ok":true'; then
  echo "[scaffold] OK — substrate live at $worker_url"
else
  echo "ERROR: /health did not return ok"
  exit 1
fi

# ------- 8. install Claude Code SessionEnd hook (idempotent) -------

HOOK_PATH="$HOME/.claude/hooks/archaeology-session-end.py"
if [ ! -f "$HOOK_PATH" ]; then
  if [ -f .claude/hooks/archaeology-session-end.py ]; then
    mkdir -p "$(dirname "$HOOK_PATH")"
    cp .claude/hooks/archaeology-session-end.py "$HOOK_PATH"
    chmod +x "$HOOK_PATH"
    echo "[scaffold] installed Claude Code SessionEnd hook at $HOOK_PATH"
    echo "  Next: add the hook to ~/.claude/settings.json under hooks.SessionEnd"
    echo "  (see template/.claude/settings.json.example for the snippet)"
  fi
else
  echo "[scaffold] Claude Code SessionEnd hook already present at $HOOK_PATH"
fi

# ------- 9. report next steps -------

cat <<EOF

──────────────────────────────────────────────────────────────────────
  Archaeology substrate is live for $PROJECT_ID

  Worker:        $worker_url
  D1:            $DB_NAME
  R2:            $R2_NAME
  Vectorize:     $VECTORIZE_NAME
  Token (local): $TOKEN_FILE

  Next:
    1. Backfill curated sources:
         export ARCHAEOLOGY_INGEST_TOKEN=\$(cat $TOKEN_FILE)
         export ARCHAEOLOGY_WORKER_URL=$worker_url
         python3 ingesters/sessions.py    backfill
         python3 ingesters/inputs.py      backfill
         python3 ingesters/iterations.py  backfill
         python3 ingesters/audits.py      backfill

    2. Embed:
         python3 embed_drive.py --batch 25 --daily-limit 9500

    3. Smoke test with a known-answer question:
         curl "$worker_url/derive?question=did+we+include+<thing>+as+an+input"

    4. (Optional) Enable synthesis:
         echo \$ANTHROPIC_API_KEY | ( cd worker && npx wrangler secret put ANTHROPIC_API_KEY )

    5. (Optional) Mount the chat surface in your portal:
         cp web/ArchaeologyChat.tsx <your-portal>/src/components/
         # Then mount as a global island in your layout (see web/README.md):
         #   <ArchaeologyChat client:idle pageContext={currentPath} />

  Pattern doc: ~/Workspace/dev/tools/blueprint/docs/archaeology-substrate-pattern.md
  Chat README: ~/Workspace/dev/tools/blueprint/template/tools/archaeology/web/README.md
──────────────────────────────────────────────────────────────────────
EOF
