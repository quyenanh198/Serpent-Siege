#!/bin/sh
# Update the game on the Mac mini: pull the latest code, rebuild the container, check it is up.
set -e
cd "$(dirname "$0")"
git pull --ff-only
docker compose up -d --build
sleep 3
curl -fsS http://127.0.0.1:8090/api/health >/dev/null && echo "Serpent Siege is up on port 8090"
