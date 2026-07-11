#!/usr/bin/env bash

set -euo pipefail

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  echo "Fichier .env.local créé."
fi

set -a
source .env.local
set +a

export NEXT_DIST_DIR="${NEXT_DIST_DIR:-.next-dev}"
exec pnpm exec next dev
