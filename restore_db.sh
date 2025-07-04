#!/bin/bash
# Restore PostgreSQL database to Docker Compose service
# Usage: ./restore_db.sh [backup_filename.sql]

CONTAINER_NAME=mealplanner-db-1
DB_NAME=recipes
DB_USER=postgres
BACKUP_FILE=${1:-backup.sql}

echo "Restoring database $DB_NAME in container $CONTAINER_NAME from $BACKUP_FILE ..."
cat "$BACKUP_FILE" | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME
if [ $? -ne 0 ]; then
    echo "Restore failed!"
    exit 1
else
    echo "Restore completed from: $BACKUP_FILE"
fi
