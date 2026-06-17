#!/usr/bin/env bash

set -euo pipefail

if ! grep -qi microsoft /proc/version 2>/dev/null; then
  echo "Cette commande est uniquement nécessaire sous WSL2."
  exit 0
fi

if ! command -v powershell.exe >/dev/null 2>&1; then
  echo "PowerShell Windows est introuvable."
  exit 1
fi

windows_script="$(wslpath -w "$(pwd)/scripts/windows-phone-network.ps1")"

echo "Windows va demander une autorisation administrateur."
echo "Cette opération expose uniquement le port TCP 3000 sur le réseau privé."

powershell.exe -NoProfile -Command \
  "Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','${windows_script}'"

echo
echo "Configuration réseau Windows terminée."
echo "Lance maintenant : pnpm dev:phone"
