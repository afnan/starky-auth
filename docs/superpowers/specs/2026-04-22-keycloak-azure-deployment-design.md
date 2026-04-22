# Starky Central Auth on Azure — Design

**Status:** Infrastructure provisioned; implementation plan pending
**Date:** 2026-04-22 (updated post-provisioning)
**Repo:** `github.com/afnan/starky-auth`

## Changes from initial design (applied during provisioning, 2026-04-22)

- **VM family**: Standard_B2s → **Standard_D2s_v4** (2 vCPU Intel, 8 GiB RAM). Driven by B2s_v2 quota wall in AU East; D2s_v4 was the next available size. Side benefit: 8 GiB RAM eliminates the Xmx-trimming workaround from audit finding A1 — `-Xmx2048m` stays as originally designed with comfortable headroom.
- **OS**: Ubuntu 22.04 LTS → **Ubuntu 24.04 LTS** (portal default; newer LTS, supports everything we need).
- **Subnet size**: /27 → /24 (more addresses than needed; harmless).
- **NSG**: priority-4096 explicit deny row removed per audit finding A2.
- **Deployer identity**: new `id-starky-auth-deployer` UAMI → **reused existing `github-starky-frontend` App Registration**. Contributor-on-RG covers AcrPush + Virtual Machine Contributor. Blast-radius tradeoff accepted.
- **Azure Backup (VM-level)**: skipped. pg_dump to blob storage is the sole backup layer for v1.
- **Tag `managed-by`**: `github-actions` → `allspice` (ownership-oriented rather than mechanism-oriented).
- **Static public IP assigned**: `20.167.84.219`.

## Summary

Deploy Keycloak 26.1 as the central identity provider for Starky (`starkyapp.com`) on a single Azure VM in the existing `rg-starkyapp` resource group. A custom Keycloak image with Tailwind-built themes is published to the existing `starkyacr` registry. GitHub Actions deploys on push to `main` via OIDC-federated identity and `az vm run-command invoke` — no SSH port exposure, no long-lived secrets. Major Keycloak version bumps run behind a manual workflow gate because they trigger DB schema migrations.

## Goals

- Public authentication at `https://auth.starkyapp.com`
- IP-allow-listed admin console at `https://auth-admin.starkyapp.com`
- Tailwind-branded theme, baked into the image, extensible to all Keycloak login flows
- CI/CD on push to `main` with clean rollback by git SHA
- Single-instance deployment (scale bucket "A" — downtime during reboot is acceptable)
- Zero Keycloak admin exposure to the public internet (separate hostname + IP allow-list + admin-path block on public host)

## Non-goals (v1)

- HA / multi-region
- Managed Postgres (Azure Database for PostgreSQL Flexible Server)
- Multi-realm tenancy
- Theme coverage beyond the login page (MFA, forgot-password, email verification, account console, email templates are **deliberate future work** — structure supports them, content to be added later)
- SMTP configuration (done post-deploy in realm settings)
- Identity federation (Google / Microsoft / SAML) — realm config, not deployment
- Key rotation automation

## Architecture

### High-level

```
Hostinger DNS
    │  A records (auth, auth-admin) → Azure static IP
    ▼
Azure Static Public IP  (Standard SKU, attached to VM NIC)
    │  80, 443 only (NSG)
    ▼
┌─ Azure VM: vm-starky-auth-prod (Standard_B2s, Ubuntu 22.04) ──────┐
│                                                                   │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────────┐    │
│  │    Caddy    │   │   Keycloak   │   │    Postgres 16       │    │
│  │  TLS + IP   │ → │ 26.1 custom  │ → │  local Docker vol    │    │
│  │  allowlist  │   │ image (ACR)  │   │                      │    │
│  └─────────────┘   └──────────────┘   └──────────────────────┘    │
│                                                                   │
│  /opt/starky-auth/     ← compose, caddy config, .env              │
│  User-assigned MI      ← ACR Pull, Storage Blob Data Contributor  │
│                                                                   │
│  Azure Backup (VM snapshot, daily, 30d)                           │
│  cron 02:00  pg_dump → Azure Storage (90d via lifecycle)          │
└───────────────────────────────────────────────────────────────────┘

GitHub push to main
    │
    ▼
Actions: build-and-deploy
    ├── Tailwind CSS build
    ├── Docker build → starkyacr.azurecr.io/starky-auth:<sha>
    └── az vm run-command invoke → docker compose pull + up -d keycloak
```

### Azure resource inventory

All in `rg-starkyapp`, `australiaeast`, with the tag schema below.

| Resource | Name | SKU / Config |
|---|---|---|
| VM | `vm-starky-auth-prod` | Standard_D2s_v4 (2 vCPU Intel, 8 GiB), Ubuntu 24.04 LTS |
| OS disk | (auto) | Premium SSD, 64 GB |
| NIC | `vm-starky-auth-prodXXX` | on `snet-auth` |
| VNet | `vnet-starky-auth` | `10.40.0.0/24` |
| Subnet | `snet-auth` | `10.40.0.0/24` |
| Public IP | `pip-starky-auth-prod` | Standard SKU, **Static**, `20.167.84.219` |
| NSG | `nsg-starky-auth-prod` | Allow 80/tcp (prio 100), Allow 443/tcp (prio 110). Built-in 65500 DenyAll handles the rest. |
| User-assigned MI | `id-starky-auth-vm` | attached to VM; `AcrPull` on `starkyacr`, `Storage Blob Data Contributor` on `ststarkyauthbackups` |
| Storage account | `ststarkyauthbackups` | StorageV2, LRS, container `pgdumps`, lifecycle rule (cool 30d / delete 90d, actual prefix scope pending — may apply to all blobs) |
| App Registration (reused) | `github-starky-frontend` | Contributor on `rg-starkyapp` covers AcrPush + VM Contributor. Federated credential `starky-auth-main` → `repo:afnan/starky-auth:ref:refs/heads/main`. |
| ACR (exists) | `starkyacr` | add repo `starky-auth` |

### NSG rules

| Priority | Direction | Source | Port | Action | Purpose |
|---|---|---|---|---|---|
| 100 | Inbound | Internet | 80/tcp | Allow | HTTP (ACME challenge + redirect to HTTPS) |
| 110 | Inbound | Internet | 443/tcp | Allow | HTTPS |

Azure's built-in `DenyAllInBound` at priority 65500 catches everything else. No explicit deny rule is added (audit finding A2).

**Port 22 is not opened.** Deploy access is via `az vm run-command invoke` (Actions, using OIDC identity). Break-glass access is the Azure Serial Console in the portal (always available, no network path required).

### DNS at Hostinger

```
auth.starkyapp.com        A    <pip-starky-auth-prod>    TTL 300
auth-admin.starkyapp.com  A    <pip-starky-auth-prod>    TTL 300
```

TTL starts at 300 during initial cutover; bump to 3600 after first deploy verified.

### Tag schema

Applied to every Azure resource:

| Key | Value |
|---|---|
| `project` | `starky-auth` |
| `env` | `prod` |
| `component` | one of `vm`, `network`, `storage`, `identity`, `backup` |
| `managed-by` | `github-actions` |
| `owner` | `accounts@allspicetech.com.au` |

This lets Azure Cost Analysis filter the auth stack even though it shares the RG with frontend resources.

## Components

### Caddy

Unchanged container (`caddy:2-alpine`). Caddyfile changes:
1. Remove the `@root` / `/srv/landing.html` block
2. Add `redir @root https://starkyapp.com 302` on the public hostname
3. Keep the admin-path 403 block on the public hostname (defense-in-depth)
4. Add a `/realms/master/*` → 404 block on the public hostname (audit finding A3 — master realm endpoints should not be publicly reachable)
5. Keep the IP allow-list on the admin hostname

Caddy continues to terminate TLS via Let's Encrypt HTTP-01. `caddy_data` volume persists the account key and issued certs across container restarts.

### Keycloak (custom image in ACR)

New `Dockerfile` at repo root using the recommended two-stage pattern for Keycloak optimized mode:

```dockerfile
# Build stage — augments the Keycloak distribution with themes and optimizations
FROM quay.io/keycloak/keycloak:26.1 AS builder
ENV KC_DB=postgres
ENV KC_FEATURES=token-exchange,admin-fine-grained-authz
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
COPY themes/ /opt/keycloak/themes/
RUN /opt/keycloak/bin/kc.sh build

# Runtime stage
FROM quay.io/keycloak/keycloak:26.1
COPY --from=builder /opt/keycloak/ /opt/keycloak/
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start", "--optimized"]
```

Build-time vs runtime split matters: features, DB type, health/metrics toggles are **build-time** and move into Dockerfile `ENV`s. Connection strings, credentials, hostnames, proxy settings stay **runtime** in `docker-compose.yml`.

`docker-compose.yml` updates:
- `image: ${IMAGE:-starkyacr.azurecr.io/starky-auth:latest}` (substitutable for pinned-SHA deploys)
- Remove `./themes:/opt/keycloak/themes:ro` (themes are baked into the image)
- Remove build-time flags from `command:` (they're baked in)
- Keep runtime env (`KC_HOSTNAME`, `KC_DB_URL`, admin creds, etc.)

### Postgres

No change — vanilla `postgres:16-alpine` with existing tuning flags. Local Docker volume on the VM's OS disk.

### Starky theme (Tailwind)

Scaffolded at `themes/starky/`:

```
themes/starky/
├── package.json              # tailwindcss, postcss, autoprefixer
├── tailwind.config.js        # content: ["./login/**/*.ftl"]
├── src/
│   └── input.css             # @tailwind base/components/utilities
└── login/
    ├── theme.properties      # parent=keycloak, styles=css/styles.css
    ├── template.ftl          # shared page layout (branded chrome)
    ├── login.ftl             # v1 deliverable
    └── resources/
        ├── css/
        │   └── styles.css    # BUILT (gitignored, produced by tailwind)
        ├── js/
        └── img/
```

**v1 deliverable:** `login.ftl` + shared `template.ftl`.

**Future files (tracked, not blocking v1):** `register.ftl`, `login-reset-password.ftl`, `login-otp.ftl`, `login-verify-email.ftl`, `terms.ftl`, `error.ftl`, + `email/` theme type, + `account/` theme type. The structure supports drop-in additions.

Keycloak's theme static resources are served with `max-age=2592000` (already set in compose) — Tailwind's hashed output isn't needed; immutable caching for the built `styles.css` is sufficient.

### State split: what lives where

| Location | Contents | Lifecycle |
|---|---|---|
| Docker image (ACR) | Keycloak binaries, themes, built Tailwind CSS | Rebuilt per commit, tagged by git SHA |
| VM `/opt/starky-auth/` | `docker-compose.yml`, `caddy/Caddyfile`, `.env`, `backup.sh` | Seeded once at bootstrap; updated rarely (config changes go through a separate PR that triggers a VM-side `az vm run-command` to re-sync) |
| Docker volumes on VM | `postgres_data`, `keycloak_data`, `caddy_data`, `caddy_config` | Persist across container restarts; backed up by Azure Backup + pg_dump |
| Azure Storage | pg_dump archives | 90d via lifecycle |

## CI/CD

### `.github/workflows/build-and-deploy.yml` (push to `main`)

Steps:
1. Checkout
2. Set up Node 20
3. `cd themes/starky && npm ci && npx tailwindcss -i src/input.css -o login/resources/css/styles.css --minify`
4. Azure login via existing OIDC federated credential (re-used pattern from frontend pipeline)
5. `az acr login --name starkyacr`
6. `docker build -t starkyacr.azurecr.io/starky-auth:${{ github.sha }} -t starkyacr.azurecr.io/starky-auth:latest .`
7. `docker push` both tags
8. `az vm run-command invoke --resource-group rg-starkyapp --name vm-starky-auth-prod --command-id RunShellScript --scripts "cd /opt/starky-auth && IMAGE=starkyacr.azurecr.io/starky-auth:${{ github.sha }} docker compose pull keycloak && IMAGE=starkyacr.azurecr.io/starky-auth:${{ github.sha }} docker compose up -d keycloak"`
9. Poll `docker compose exec keycloak /opt/keycloak/bin/kc.sh …` health endpoint until UP or 120s → fail the job if not UP

### `.github/workflows/major-upgrade.yml` (manual `workflow_dispatch`)

Used for Keycloak major version bumps (26 → 27 etc.). Inputs: `new_version` tag. Steps:
1. Trigger manual `backup.sh` on the VM; verify the pg_dump lands in `ststarkyauthbackups`
2. Build image with new version tag in Dockerfile
3. Deploy as in the main workflow
4. Boot runs DB schema migration — monitored via the health-check poll

### `.github/workflows/rollback.yml` (manual `workflow_dispatch`)

Inputs: `image_tag`. Runs `az vm run-command` to pin `IMAGE=<tag>` and restart the Keycloak service. ~30s to roll back.

### Deploy characteristics

- Theme / patch changes: container swap, ~20s of 502s while new Keycloak starts
- Postgres + Caddy containers untouched on Keycloak deploys → zero DB migration risk from theme changes
- Image tags: every `main` commit gets `<git-sha>` + `latest`. Rollbacks reference SHA.
- Concurrency: workflow uses `concurrency: group: starky-auth-deploy, cancel-in-progress: false` — back-to-back merges queue rather than racing.
- Rollback persistence: the deploy command updates `IMAGE=<sha>` inside `/opt/starky-auth/.env` so the rollback survives a VM reboot (otherwise a reboot would pull `:latest`).

## File changes required in repo

| Path | Action | Purpose |
|---|---|---|
| `Dockerfile` | **new** | Custom KC image with themes + optimized build |
| `.dockerignore` | update | Exclude `themes/starky/node_modules`, `themes/starky/src` |
| `.github/workflows/build-and-deploy.yml` | **new** | Main CI/CD |
| `.github/workflows/major-upgrade.yml` | **new** | Gated major KC upgrades |
| `.github/workflows/rollback.yml` | **new** | Manual rollback by image tag |
| `caddy/Caddyfile` | edit | Drop `@root` block; add `redir @root https://starkyapp.com 302` |
| `caddy/landing.html` | **delete** | Landing page out of scope |
| `docker-compose.yml` | edit | `image:` variable; remove theme bind mount; remove landing-page mount; drop build-time flags from `command:` |
| `env.example` | edit | Update hostnames, add `IMAGE=` placeholder, drop `KEYCLOAK_FEATURES` (moved to Dockerfile), add `AZURE_STORAGE_ACCOUNT` for backups |
| `README.md` | rewrite sections | Rebrand allspicetech → starkyapp; replace "VPS bootstrap" flow with "Azure + Actions" flow; update path `/opt/keycloak` → `/opt/starky-auth` |
| `setup.sh` | edit | Install `azcopy`, `unattended-upgrades`; remove UFW (NSG handles it); add managed identity login |
| `backup.sh` | edit | Append `azcopy copy` to Azure Storage using VM managed identity |
| `themes/starky/` | **new** | Tailwind-scaffolded theme (v1 = login page) |
| `.gitignore` | edit | Add `themes/*/login/resources/css/*.css`, `node_modules/` |

## Deployment runbook (one-time provisioning)

1. **Azure resources** — provision via `az cli` script (in implementation plan): RG (exists), VNet, subnet, NSG, public IP, VM, managed identity, Storage, Recovery Services vault. All tagged.
2. **Role assignments** — managed identity gets `AcrPull` on `starkyacr` and `Storage Blob Data Contributor` on `ststarkyauthbackups`.
3. **GitHub OIDC** — add federated credential on the Actions identity scoped to `repo:<org>/starky-auth:ref:refs/heads/main`.
4. **Hostinger DNS** — add two A records. Wait for propagation (`dig +short auth.starkyapp.com`).
5. **VM bootstrap** — via `az vm run-command invoke`, run `setup.sh` to install Docker, Compose, azcopy, unattended-upgrades.
6. **Initial file placement** — via `az vm run-command` copy the compose file, Caddyfile, and `.env` to `/opt/starky-auth`.
7. **First deploy** — push to `main`. Pipeline builds + deploys.
8. **Verification:**
   - `curl -I https://auth.starkyapp.com/` → 302 to `starkyapp.com`
   - `curl -I https://auth.starkyapp.com/realms/master/` → 200
   - `curl -I https://auth-admin.starkyapp.com/` from allowed IP → 200; from other IP → 403
9. **Initial realm** — log into admin console, create `starky` realm, set theme to `starky`, create first OIDC client, note client ID + secret for the app.

## Backup & DR

**pg_dump → Storage (sole backup layer for v1).** Daily cron 02:00 on VM. `backup.sh` dumps Postgres locally, then `azcopy copy` to `ststarkyauthbackups/pgdumps/YYYY-MM-DD.sql.gz` using the VM's user-assigned managed identity. Local copies kept 7d, storage copies kept 90d (via lifecycle).

**Azure Backup (VM snapshot): intentionally skipped for v1.** Tradeoff: saves ~AUD $10/mo; gives up ~2-hour recovery-from-scratch if the VM is lost (provision new VM, reinstall Docker, restore DB from pg_dump). Acceptable for scale-A internal auth. Enabling later is a two-minute portal click if DR requirements change.

**Recovery drill.** Quarterly calendar reminder: restore a recent pg_dump to a scratch Postgres, boot a test Keycloak against it, confirm realm + user data. Not automated; process documented in README.

## Cost estimate (AUD, `australiaeast`, pay-as-you-go)

| Item | /mo |
|---|---|
| VM Standard_D2s_v4 | ~$130 |
| Premium SSD 64 GB | ~$15 |
| Static public IP | ~$5 |
| Azure Backup | skipped ($0) |
| Storage (backup blobs, <5 GB) | ~$1 |
| Bandwidth | ~$2 |
| ACR | (existing cost, no delta) |
| **Total** | **~$155** |

1-year reservation on D2s_v4 drops to roughly **~$95/mo**. If cost becomes a concern, the most impactful lever is moving from D2s_v4 to a B-series v2 size once quota is approved (~$40/mo savings at pay-as-you-go).

## Open follow-ups (tracked, not blocking v1)

- **Full theme coverage:** register, forgot-password, MFA/OTP, email verification, terms, error, plus `email/` and `account/` theme types
- **SMTP provider:** needed before forgot-password flows work end-to-end
- **`ADMIN_ALLOWED_IPS`:** need your current office/home external IP(s) before first deploy
- **Azure Backup (VM snapshot):** re-enable if DR requirements tighten beyond "2-hour recovery from pg_dump is OK"
- **Key Vault migration (audit A5):** move `KEYCLOAK_ADMIN_PASSWORD` and `POSTGRES_PASSWORD` out of `.env` plaintext. Pattern: entrypoint wrapper fetches via `az keyvault secret show` using VM managed identity, exports as env var.
- **Bicep/Terraform IaC (audit A6):** current infra was provisioned via Azure portal. Migrate to Bicep for reproducibility before the first DR drill.
- **Harden `KC_HOSTNAME_STRICT=true` (audit A4):** currently `false` carried over from template. Flip after first realm is stable.
- **Centralized log shipping (audit A8):** App Insights agent or Azure Monitor — not in v1.
- **Rate limiting / brute-force hardening (audit A9):** Keycloak realm setting + optional Caddy ratelimit. Realm-config concern, enable after first realm is live.
- **NTP verification (audit A10):** Ubuntu 24.04's `systemd-timesyncd` handles this by default — verify during initial VM bootstrap.
- **Lifecycle rule scope**: confirm blob prefix filter on `ststarkyauthbackups` lifecycle rule actually scopes to `pgdumps/` — portal filter-set tab didn't appear during setup.
- **Observability:** App Insights or Grafana agent on the VM — not in v1.
- **Key rotation:** Keycloak realm signing keys — schedule TBD.
- **Identity federation:** Google / Microsoft / SAML providers inside the realm — handled in realm config when app integration begins.
- **Deployer identity separation:** currently reusing `github-starky-frontend` App Reg. If blast-radius separation becomes important, create a dedicated `github-starky-auth` App Reg and migrate the federated credential.
