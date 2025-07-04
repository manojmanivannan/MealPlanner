#!/bin/bash
# Backup PostgreSQL database from Docker Compose service
# Usage: ./backup_db.sh [backup_filename.sql]

CONTAINER_NAME=mealplanner-db-1
DB_NAME=recipes
DB_USER=postgres
BACKUP_FILE=${1:-backup.sql}

echo "Backing up database $DB_NAME from container $CONTAINER_NAME to $BACKUP_FILE ..."
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME > "$BACKUP_FILE"
if [ $? -ne 0 ]; then
    echo "Backup failed!"
    exit 1
else
    echo "Backup completed: $BACKUP_FILE"
fi
