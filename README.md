# Keycloak Central Identity Provider

Production-ready Keycloak deployment with **automatic TLS** (Caddy + Let's Encrypt).
No certbot, no renewal cron, no manual cert copying.

**Example domains:**
- `auth.allspicetech.com.au` — public authentication
- `auth-admin.allspicetech.com.au` — admin console (IP-restricted)

---

## What's in the box

- **Keycloak 26.1** on PostgreSQL 16
- **Caddy** reverse proxy — automatic Let's Encrypt, HTTP→HTTPS redirect, security headers
- **IP-restricted admin console** on a separate subdomain
- **Branded landing page** at the public root
- **Per-realm custom themes**

## Architecture

```
Internet
    ↓
┌──────────────────────────┐
│          Caddy           │  TLS termination, auto Let's Encrypt,
│      (ports 80 / 443)    │  security headers, admin IP allow-list
└─────────────┬────────────┘
              │ http
┌─────────────▼────────────┐
│         Keycloak         │  OIDC / OAuth2 / SAML
│      (internal 8080)     │
└─────────────┬────────────┘
              │
┌─────────────▼────────────┐
│        PostgreSQL        │
└──────────────────────────┘
```

---

## Deployment

### Prerequisites
- Ubuntu 22.04+ server (root access)
- Static public IPv4
- DNS access for two A records
- Ports 22, 80, 443 reachable from the internet

### 1. Point DNS first
Add two A records pointing at the server's public IP:

| Name         | Type | Value        |
|--------------|------|--------------|
| `auth`       | A    | `SERVER_IP`  |
| `auth-admin` | A    | `SERVER_IP`  |

Verify before starting:
```bash
nslookup auth.yourdomain.com
nslookup auth-admin.yourdomain.com
```
Both should return the server IP. Caddy will fail to issue certs if DNS isn't live yet.

### 2. Deploy the files
```bash
scp -r . root@SERVER_IP:/opt/keycloak
ssh root@SERVER_IP
cd /opt/keycloak
./setup.sh
```
`setup.sh` installs Docker + Compose, seeds `.env`, and optionally configures UFW.

### 3. Configure `.env`
```bash
nano .env
```
Required:
- `AUTH_HOSTNAME`, `ADMIN_HOSTNAME` — bare hostnames (no `https://`)
- `ACME_EMAIL` — Let's Encrypt sends expiry notices here
- `ADMIN_ALLOWED_IPS` — space-separated IPs/CIDRs allowed on the admin subdomain.
  Get your IP with `curl ifconfig.me`.
- `KEYCLOAK_ADMIN_PASSWORD`, `POSTGRES_PASSWORD` — use `openssl rand -base64 32`

### 4. Start
```bash
docker compose up -d
docker compose logs -f caddy
```
On first request to either hostname, Caddy requests TLS certificates from Let's Encrypt.
Requirements:
- DNS resolves to this server
- Port 80 reachable from the internet (ACME HTTP-01 challenge)

### 5. Verify
```bash
curl -I https://auth.yourdomain.com/           # 200, with HSTS header
curl -I https://auth-admin.yourdomain.com/     # 403 unless your IP is allowed
```

Open in browser:
- Landing page: `https://auth.yourdomain.com`
- Admin console: `https://auth-admin.yourdomain.com` (from an allowed IP)

Login: user `admin`, password from `.env`.

---

## First realm setup

1. Admin console → top-left dropdown → **Create realm**
2. Name it after the client (e.g. `boxe`)
3. **Realm settings** → **Themes** → **Login Theme** → `starky` (shipped by the Keycloakify JAR baked into the image)
4. **Clients** → **Create client** → OIDC → set redirect URIs → copy client secret

Integration URL for your app:
```
https://auth.yourdomain.com/realms/<realm>/protocol/openid-connect/auth
```

---

## Custom themes

The login theme is a **Keycloakify** React project at `./keycloak-theme/`.
It compiles into a provider JAR that the `Dockerfile` copies into
`/opt/keycloak/providers/` before `kc.sh build`. No runtime bind-mount —
everything is baked into the image.

Local preview (no Keycloak instance required):
```bash
cd keycloak-theme
npm install
npm run dev                 # Keycloakify mock runtime (Storybook-style)
```

Build the JAR locally:
```bash
cd keycloak-theme
npm run build               # requires JDK 17 on PATH (JAVA_HOME set)
# -> dist_keycloak/keycloak-theme-for-kc-all-other-versions.jar
```

The GitHub Actions pipeline does the JAR build and then `docker build`, so
local builds are only for iteration. For full details see
`docs/superpowers/specs/2026-04-22-keycloak-theme-design.md`.

Theme caching — set `KC_THEME_CACHING=false` in `.env` only during live
debugging against a running Keycloak; keep it `true` in production.

---

## Common operations

| Task                | Command                                                         |
|---------------------|-----------------------------------------------------------------|
| View logs           | `docker compose logs -f [service]`                              |
| Restart a service   | `docker compose restart [service]`                              |
| Backup DB           | `./backup.sh`                                                   |
| Upgrade Keycloak    | bump `KEYCLOAK_VERSION` in `.env`, `docker compose pull && up -d` |
| Upgrade Caddy       | `docker compose pull caddy && docker compose up -d caddy`       |
| Reload Caddy config | `docker compose restart caddy`                                  |

### Schedule backups
```cron
0 2 * * * cd /opt/keycloak && ./backup.sh >> /var/log/keycloak-backup.log 2>&1
```

---

## Troubleshooting

### Certificates aren't issuing
- DNS not pointing here yet: `dig +short auth.yourdomain.com`
- Port 80 blocked: test `curl http://auth.yourdomain.com/health` from another network
- Caddy logs: `docker compose logs caddy` — look for ACME errors
- Don't delete the `caddy_data` volume — it holds Let's Encrypt account keys and issued certs

### Admin console returns 403
Your IP isn't in `ADMIN_ALLOWED_IPS`. Update `.env`, then:
```bash
docker compose up -d caddy   # picks up env changes
```

### Keycloak won't start
```bash
docker compose logs keycloak
```
Usually DB connectivity or heap pressure. Bump `-Xmx` in `docker-compose.yml` if the VM is small.

### Hostname mismatch errors
Keycloak echoes back hostnames from `KC_HOSTNAME`. If you browse directly to the server IP instead of the hostname, you'll see "URL is outside of the configured frontendUrl" — browse to the hostname instead.

---

## Security checklist

- [ ] `.env` filled; not committed
- [ ] `ADMIN_ALLOWED_IPS` set (default `127.0.0.1/32` denies everyone)
- [ ] Strong generated passwords (not defaults)
- [ ] `KEYCLOAK_ADMIN_USER` changed from `admin`
- [ ] UFW enabled, only 22/80/443 open
- [ ] DNS resolves before first boot
- [ ] `backup.sh` scheduled via cron

---

## Files

```
/opt/keycloak/
├── docker-compose.yml
├── .env                    # configuration (not in git)
├── env.example
├── setup.sh                # one-shot VPS bootstrap
├── backup.sh               # pg_dump + retention
├── caddy/
│   ├── Caddyfile           # reverse proxy + automatic TLS
│   └── landing.html        # public landing page (/)
├── keycloak-theme/         # Keycloakify React project — builds provider JAR
├── themes/                 # (legacy classic-theme slot — README only)
├── import/                 # realm JSON (imported on first boot)
└── backups/                # pg_dump archives (gitignored)
```

---

## References
- [Keycloak docs](https://www.keycloak.org/documentation)
- [Caddy docs](https://caddyserver.com/docs/)
- [Let's Encrypt rate limits](https://letsencrypt.org/docs/rate-limits/)
