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
3. **Realm settings** → **Themes** → choose the login theme you've added under `themes/`
4. **Clients** → **Create client** → OIDC → set redirect URIs → copy client secret

Integration URL for your app:
```
https://auth.yourdomain.com/realms/<realm>/protocol/openid-connect/auth
```

---

## Custom themes

Put themes under `./themes/<name>/login/…` — they're bind-mounted read-only into Keycloak.
See `themes/README.md` for structure.

Development cycle:
```bash
# .env: KC_THEME_CACHING=false
docker compose restart keycloak
# Edit files, hard-refresh browser
```
Set `KC_THEME_CACHING=true` before production.

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
├── themes/                 # per-realm Keycloak themes
├── import/                 # realm JSON (imported on first boot)
└── backups/                # pg_dump archives (gitignored)
```

---

## References
- [Keycloak docs](https://www.keycloak.org/documentation)
- [Caddy docs](https://caddyserver.com/docs/)
- [Let's Encrypt rate limits](https://letsencrypt.org/docs/rate-limits/)
