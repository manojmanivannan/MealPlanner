#!/bin/bash
# Restore PostgreSQL database tables from CSV files into a Docker Compose service
# Usage: ./restore_db.sh 

set -e

CONTAINER_NAME=mealplanner-db-1
DB_NAME=recipes
DB_USER=postgres

# --- IMPORTANT ---
# List tables in the order they should be restored to respect foreign key constraints.
# Parent tables (like ingredients, recipes) must be restored BEFORE child tables (weekly_plan).
TABLES_TO_RESTORE="ingredients recipes weekly_plan"

# for each table in the list, perform a restore
for TABLE in $TABLES_TO_RESTORE; do
    CSV_FILE="./backend/${TABLE}.csv"

    if [ ! -f "$CSV_FILE" ]; then
        echo "Error: Backup file $CSV_FILE not found. Skipping restore for table $TABLE."
        continue
    fi

    echo "Restoring table $TABLE from $CSV_FILE..."
    
    # 1. Clear existing data from the table. TRUNCATE is used as it's fast.
    # The CASCADE option will also clear any dependent data in other tables.
    echo "  -> Truncating table $TABLE..."
    docker exec -t $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "TRUNCATE TABLE $TABLE RESTART IDENTITY CASCADE;"

    # reset any sequences associated with the table
    echo "  -> Resetting sequences for table $TABLE..."
    docker exec -t $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "SELECT pg_catalog.setval(pg_get_serial_sequence('$TABLE', 'id'), 1, false);"

    # 2. Copy data from the CSV file into the table.
    # The command tells psql to expect CSV format and to treat the first line as a header to be ignored.
    echo "  -> Copying data from $CSV_FILE to table $TABLE..."
    cat "$CSV_FILE" | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "COPY $TABLE FROM STDIN WITH (FORMAT csv, HEADER true)"

    echo "Restore completed for table $TABLE"
done

echo "Database restore finished."