#!/bin/bash
# Deploy script run on the VM by the GitHub Actions pipeline.
# Authenticates docker to ACR via IMDS (no subscription role required),
# pulls the new image, restarts the stack, prunes old images.
#
# Usage: deploy.sh <image:tag>

set -eu

NEW_IMAGE="${1:?image tag required}"
VM_APP_DIR="/opt/starky-auth"

cd "$VM_APP_DIR"

# Discover the UAMI client ID via instance metadata.
# When multiple managed identities are attached (e.g. user-assigned + system-
# assigned), IMDS requires the client_id parameter to disambiguate.
CLIENT_ID=$(curl -sS -H "Metadata:true" \
  "http://169.254.169.254/metadata/instance?api-version=2021-02-01" \
  | python3 -c "import json,sys;print(json.loads(sys.stdin.read())['compute']['identity']['clientIds'][0])")

# Get an AAD token for management.azure.com audience
MGMT_TOKEN=$(curl -sS -H "Metadata:true" \
  "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fmanagement.azure.com%2F&client_id=${CLIENT_ID}" \
  | python3 -c "import json,sys;print(json.loads(sys.stdin.read())['access_token'])")

# Exchange for an ACR refresh token (data-plane, needs AcrPull only)
REFRESH_TOKEN=$(curl -sS -X POST \
  -d "grant_type=access_token&service=starkyacr.azurecr.io&access_token=${MGMT_TOKEN}" \
  "https://starkyacr.azurecr.io/oauth2/exchange" \
  | python3 -c "import json,sys;print(json.loads(sys.stdin.read())['refresh_token'])")

# Log docker in with the refresh token (null-GUID username per ACR's spec)
echo "${REFRESH_TOKEN}" | docker login starkyacr.azurecr.io \
  --username 00000000-0000-0000-0000-000000000000 --password-stdin

docker compose pull
docker compose up -d
docker image prune -f --filter "until=168h" >/dev/null

echo "deploy-ok image=${NEW_IMAGE}"
