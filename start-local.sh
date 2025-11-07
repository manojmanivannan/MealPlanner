#!/bin/bash
#
docker compose down --remove-orphans --volumes && docker system prune &&  docker compose --profile local up --build
