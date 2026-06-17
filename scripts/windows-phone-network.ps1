$ErrorActionPreference = "Stop"

$port = 3000
$ruleName = "Church ERP local phone access"
$wslAddress = (
  wsl.exe hostname -I
).Trim().Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)[0]

if (-not $wslAddress) {
  throw "Impossible de détecter l'adresse IPv4 WSL."
}

Write-Host "Adresse WSL détectée : $wslAddress"

netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$port `
  2>$null | Out-Null

netsh interface portproxy add v4tov4 `
  listenaddress=0.0.0.0 `
  listenport=$port `
  connectaddress=$wslAddress `
  connectport=$port | Out-Null

Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue |
  Remove-NetFirewallRule

New-NetFirewallRule `
  -DisplayName $ruleName `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort $port `
  -Profile Private | Out-Null

Write-Host ""
Write-Host "Transfert configuré : Windows:$port -> ${wslAddress}:$port"
Write-Host "Règle pare-feu privée créée."
