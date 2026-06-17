#!/usr/bin/env bash

set -euo pipefail

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  echo "Fichier .env.local créé."
fi

echo "Démarrage de Supabase..."
pnpm db:start

echo "Application des migrations et chargement des données de démonstration..."
pnpm db:reset

echo
echo "Environnement local prêt."
echo "Lance l'application avec : pnpm dev"
echo "Pour un natel : pnpm dev:phone"
