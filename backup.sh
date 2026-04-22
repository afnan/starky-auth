#!/bin/bash
# Keycloak Database Backup Script
# Usage: ./backup.sh

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/keycloak-backup-$TIMESTAMP.sql"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting Keycloak database backup..."

# Check if containers are running
if ! docker compose ps --status running | grep -q "keycloak-postgres"; then
    echo "Error: PostgreSQL container is not running!"
    exit 1
fi

# Perform backup
echo "Creating backup: $BACKUP_FILE"
docker compose exec -T postgres pg_dump \
    -U "${POSTGRES_USER:-keycloak_db_user}" \
    -d "${POSTGRES_DB:-keycloak}" \
    --clean \
    --if-exists \
    --format=plain > "$BACKUP_FILE"

# Compress backup
echo "Compressing backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

# Verify backup was created
if [ -f "$BACKUP_FILE_GZ" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)
    echo "✓ Backup created successfully: $BACKUP_FILE_GZ ($BACKUP_SIZE)"
else
    echo "✗ Error: Backup file was not created!"
    exit 1
fi

# Clean up old backups (keep backups older than RETENTION_DAYS)
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "keycloak-backup-*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Cleanup complete."

# List current backups
echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR"/keycloak-backup-*.sql.gz 2>/dev/null || echo "No backups found."

echo ""
echo "Backup completed successfully!"
