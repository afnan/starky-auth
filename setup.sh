#!/bin/bash
# Keycloak + Caddy setup for Ubuntu VPS.
# Installs Docker, seeds .env, configures firewall.
# TLS is handled automatically by Caddy — no certbot step.

set -e

echo "======================================"
echo "Keycloak + Caddy Setup"
echo "======================================"
echo ""

# Warn if not Ubuntu (but don't block)
if [ ! -f /etc/os-release ] || ! grep -q "Ubuntu" /etc/os-release; then
    echo "Warning: tuned for Ubuntu. Proceeding anyway..."
fi

# Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker "$USER"
    rm get-docker.sh
    echo "✓ Docker installed. Log out and back in for group membership to apply."
else
    echo "✓ Docker already installed"
fi

# Docker Compose plugin
if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose plugin..."
    sudo apt-get update -qq
    sudo apt-get install -y docker-compose-plugin
    echo "✓ Docker Compose plugin installed"
else
    echo "✓ Docker Compose already installed"
fi

# .env
if [ ! -f .env ]; then
    if [ -f env.example ]; then
        cp env.example .env
        echo "✓ Created .env from env.example"
        echo "⚠ Edit .env and set: AUTH_HOSTNAME, ADMIN_HOSTNAME, ACME_EMAIL,"
        echo "  ADMIN_ALLOWED_IPS, KEYCLOAK_ADMIN_PASSWORD, POSTGRES_PASSWORD"
    else
        echo "✗ env.example not found"
        exit 1
    fi
else
    echo "✓ .env already exists"
fi

# Runtime directories
mkdir -p import backups
echo "✓ Runtime directories ready"

chmod +x backup.sh setup.sh 2>/dev/null || true

# UFW
if command -v ufw &> /dev/null; then
    echo ""
    read -p "Configure UFW firewall (22/80/443)? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo ufw allow 22/tcp comment 'SSH'
        sudo ufw allow 80/tcp comment 'HTTP (ACME + redirect)'
        sudo ufw allow 443/tcp comment 'HTTPS'
        echo "✓ Firewall rules added"
        read -p "Enable UFW now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo ufw --force enable
            echo "✓ UFW enabled"
        fi
    fi
fi

echo ""
echo "======================================"
echo "Next steps"
echo "======================================"
echo "1. Edit .env  — hostnames, ACME email, admin IPs, passwords"
echo "2. Point DNS A records for both hostnames at this server's public IP"
echo "3. Verify DNS propagated: nslookup <AUTH_HOSTNAME>"
echo "4. docker compose up -d"
echo "5. Watch Caddy acquire certificates: docker compose logs -f caddy"
echo ""
echo "See README.md for the full guide."
