FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y wget
RUN pip install fastapi uvicorn psycopg2-binary pydantic alembic sqlalchemy

COPY . .

RUN chmod +x entrypoint.sh

# Set the entrypoint script to be executed when the container starts
ENTRYPOINT ["/app/entrypoint.sh"]
