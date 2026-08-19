#!/bin/bash
# Backup PostgreSQL database tables from Docker Compose service
# Usage: ./backup_db.sh


CONTAINER_NAME=mealplanner-db-1
DB_NAME=recipes
DB_USER=postgres
TABLES_TO_BACKUP="recipes weekly_plan ingredients"

# for each table in the list, perform a backup
for TABLE in $TABLES_TO_BACKUP; do
    echo "Backing up table $TABLE from container $CONTAINER_NAME to $TABLE.csv ..."

    # Get all columns except 'user_id'. The CSV is a single canonical set of
    # unique items, not separated per user; user_id is assigned on restore.
    COLUMNS=$(docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -Atc "SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_name = '$TABLE' AND column_name <> 'user_id'")

    if [ -z "$COLUMNS" ]; then
        echo "No columns found for table $TABLE (maybe only has user_id?)"
        continue
    fi

    # Deduplicate so only one row per unique item is exported, preferring the
    # demo user's (user_id = 1) copy when several users hold the same item.
    # recipes have a unique id per row, so no dedup is needed for them.
    case $TABLE in
        ingredients)
            DEDUP="DISTINCT ON (\"name\")"
            ORDER="\"name\", (user_id = 1) DESC, id" ;;
        weekly_plan)
            DEDUP="DISTINCT ON (\"day\", \"meal_type\")"
            ORDER="\"day\", \"meal_type\", (user_id = 1) DESC, id" ;;
        *)
            DEDUP=""
            ORDER="id" ;;
    esac

    # Run COPY with the filtered, deduplicated columns
    docker exec  $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c \
    "COPY (SELECT $DEDUP $COLUMNS FROM $TABLE ORDER BY $ORDER) TO STDOUT WITH CSV HEADER" \
    > "./backend/data/${TABLE}.csv"

    if [ $? -ne 0 ]; then
        echo "Backup failed for table $TABLE!"
        exit 1
    else
        echo "Backup completed for table $TABLE"
    fi
done