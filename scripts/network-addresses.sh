#!/usr/bin/env bash

detect_wsl() {
  grep -qi microsoft /proc/version 2>/dev/null
}

detect_linux_ip() {
  local address=""

  if command -v ip >/dev/null 2>&1; then
    address="$(
      ip route get 1.1.1.1 2>/dev/null |
        awk '{ for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit } }'
    )"
  fi

  if [[ -z "${address}" ]] && command -v hostname >/dev/null 2>&1; then
    address="$(hostname -I 2>/dev/null | awk '{ print $1 }')"
  fi

  printf "%s" "${address}"
}

detect_windows_ip() {
  if ! detect_wsl || ! command -v powershell.exe >/dev/null 2>&1; then
    return
  fi

  powershell.exe -NoProfile -Command \
    '$route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Select-Object -First 1; (Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress' \
    2>/dev/null | tr -d '\r'
}

detect_phone_ip() {
  local windows_ip

  windows_ip="$(detect_windows_ip)"

  if [[ -n "${windows_ip}" ]]; then
    printf "%s" "${windows_ip}"
    return
  fi

  detect_linux_ip
}
