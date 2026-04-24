#!/bin/bash
# Deploy script run on the VM by the GitHub Actions pipeline.
# Docker ACR credentials are synced from the runner to the VM by the
# pipeline's sync step, so this script just pulls + restarts.
#
# Usage: deploy.sh <image:tag>

set -eu

NEW_IMAGE="${1:?image tag required}"
VM_APP_DIR="/opt/starky-auth"

cd "$VM_APP_DIR"

docker compose pull
docker compose up -d

# `docker compose up -d` only recreates containers when image/env/volume
# *definitions* change — not when bind-mounted file contents change.
# Caddy reads its config once at startup, so a Caddyfile edit alone
# wouldn't take effect. Ask Caddy to reload in-place (graceful, no
# dropped connections). Fall back to a hard restart if the admin API
# isn't reachable for any reason.
if docker exec keycloak-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile 2>/dev/null; then
  echo "caddy-reloaded"
else
  docker compose restart caddy
  echo "caddy-restarted"
fi

docker image prune -f --filter "until=168h" >/dev/null

echo "deploy-ok image=${NEW_IMAGE}"
