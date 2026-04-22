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
docker image prune -f --filter "until=168h" >/dev/null

echo "deploy-ok image=${NEW_IMAGE}"
