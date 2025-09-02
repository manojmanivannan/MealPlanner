#!/bin/bash
#
docker compose down --remove-orphans --volumes && docker compose --profile prod up --build -d
