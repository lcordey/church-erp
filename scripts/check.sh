#!/usr/bin/env bash

set -euo pipefail

echo "1/4 Lint"
pnpm lint

echo "2/4 TypeScript"
pnpm typecheck

echo "3/4 Tests"
pnpm test

echo "4/4 Build"
pnpm build

echo
echo "Tous les contrôles sont passés."
