#!/usr/bin/env bash

set -euo pipefail

source scripts/network-addresses.sh

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  echo "Fichier .env.local créé."
fi

pnpm db:start >/dev/null

if command -v ss >/dev/null 2>&1 && ss -H -ltn "sport = :3000" | grep -q .; then
  echo
  echo "Le port 3000 est déjà utilisé."
  echo "Arrête l'ancien serveur avec Ctrl+C dans son terminal, puis relance :"
  echo "  pnpm dev:phone"
  exit 1
fi

phone_ip="$(detect_phone_ip)"
protocol="http"
next_arguments=(--hostname 0.0.0.0 --port 3000)

if [[ -f .certificates/church-erp-local.key && -f .certificates/church-erp-local.crt ]]; then
  protocol="https"
  next_arguments+=(
    --experimental-https
    --experimental-https-key .certificates/church-erp-local.key
    --experimental-https-cert .certificates/church-erp-local.crt
    --experimental-https-ca .certificates/church-erp-local-ca.crt
  )
fi

echo
echo "Application accessible sur cet ordinateur :"
echo "  ${protocol}://localhost:3000"

if [[ -n "${phone_ip}" ]]; then
  echo
  echo "Application accessible depuis un natel sur le même Wi-Fi :"
  echo "  ${protocol}://${phone_ip}:3000"
else
  echo
  echo "Adresse réseau non détectée automatiquement."
  echo "Trouve l'adresse IPv4 de l'ordinateur puis ouvre http://ADRESSE_IP:3000."
fi

if [[ "${protocol}" == "http" ]]; then
  echo
  echo "HTTPS n'est pas encore configuré."
  echo "Exécute pnpm https:setup puis installe le certificat CA sur le natel."
fi

if detect_wsl; then
  echo
  echo "WSL2 détecté : l'adresse affichée est celle de Windows."
  echo "Si elle ne répond pas, le pare-feu ou le mode réseau WSL bloque le port 3000."
  echo "Consulte la section « Local Phone Testing » de docs/setup.md."
fi

echo
echo "Laisse ce terminal ouvert. Ctrl+C arrête le serveur Next.js."
echo

exec pnpm exec next dev "${next_arguments[@]}"
