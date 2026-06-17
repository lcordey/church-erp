#!/usr/bin/env bash

set -euo pipefail

source scripts/network-addresses.sh

certificate_dir=".certificates"
ca_key="${certificate_dir}/church-erp-local-ca.key"
ca_certificate="${certificate_dir}/church-erp-local-ca.crt"
server_key="${certificate_dir}/church-erp-local.key"
server_request="${certificate_dir}/church-erp-local.csr"
server_certificate="${certificate_dir}/church-erp-local.crt"
openssl_config="${certificate_dir}/server-extension.cnf"
phone_ip="$(detect_phone_ip)"
linux_ip="$(detect_linux_ip)"

if ! command -v openssl >/dev/null 2>&1; then
  echo "OpenSSL est requis pour générer les certificats locaux."
  exit 1
fi

mkdir -p "${certificate_dir}"
chmod 700 "${certificate_dir}"

if [[ ! -f "${ca_key}" || ! -f "${ca_certificate}" ]]; then
  echo "Création de l'autorité de certification locale..."
  openssl req \
    -x509 \
    -newkey rsa:3072 \
    -sha256 \
    -days 3650 \
    -nodes \
    -keyout "${ca_key}" \
    -out "${ca_certificate}" \
    -subj "/CN=Church ERP Local Development CA" \
    -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" >/dev/null 2>&1
fi

cat >"${openssl_config}" <<EOF
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=@alt_names

[alt_names]
DNS.1=localhost
IP.1=127.0.0.1
EOF

san_index=2

if [[ -n "${linux_ip}" && "${linux_ip}" != "127.0.0.1" ]]; then
  printf "IP.%s=%s\n" "${san_index}" "${linux_ip}" >>"${openssl_config}"
  san_index=$((san_index + 1))
fi

if [[ -n "${phone_ip}" && "${phone_ip}" != "${linux_ip}" ]]; then
  printf "IP.%s=%s\n" "${san_index}" "${phone_ip}" >>"${openssl_config}"
fi

echo "Création du certificat HTTPS local..."
openssl req \
  -new \
  -newkey rsa:2048 \
  -nodes \
  -keyout "${server_key}" \
  -out "${server_request}" \
  -subj "/CN=localhost" >/dev/null 2>&1

openssl x509 \
  -req \
  -in "${server_request}" \
  -CA "${ca_certificate}" \
  -CAkey "${ca_key}" \
  -CAcreateserial \
  -out "${server_certificate}" \
  -days 365 \
  -sha256 \
  -extfile "${openssl_config}" >/dev/null 2>&1

rm -f "${server_request}" "${openssl_config}"
chmod 600 "${ca_key}" "${server_key}"
chmod 644 "${ca_certificate}" "${server_certificate}"

echo
echo "Certificat HTTPS créé."
echo "Autorité à installer sur le natel :"
echo "  ${ca_certificate}"

if [[ -n "${phone_ip}" ]]; then
  echo
  echo "Adresse HTTPS prévue :"
  echo "  https://${phone_ip}:3000"
fi

echo
echo "Ne partage jamais les fichiers .key."
echo "Après installation et approbation du certificat CA sur le natel :"
echo "  pnpm dev:phone"
