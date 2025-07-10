#!/bin/sh

# This script is used as the container's entrypoint.
# It applies database migrations and then starts the main application.

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Waiting for the database to be ready..."
sleep 10

# Apply database migrations
echo "Applying database migrations..."
alembic -c /app/db/alembic.ini upgrade head

# Run data seeding. Note: In production, you might run this as a separate, one-off task.
echo "Seeding initial data..."
python /app/db/seed_data.py

# Execute the command passed to this script (the uvicorn command in our case)
uvicorn app:app --host 0.0.0.0 --port 5000