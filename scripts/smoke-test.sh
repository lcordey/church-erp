#!/usr/bin/env bash

set -euo pipefail

port="${PORT:-3100}"
base_url="http://127.0.0.1:${port}"
server_log="$(mktemp)"
smoke_slug="smoke-test-admin-song"
smoke_setlist_title="Setlist smoke test"

cleanup_smoke_song() {
  DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:15432/postgres}" \
    SMOKE_SLUG="${smoke_slug}" \
    SMOKE_SETLIST_TITLE="${smoke_setlist_title}" \
    node --input-type=module -e "
      import postgres from 'postgres';
      const sql = postgres(process.env.DATABASE_URL, { max: 1 });
      await sql\`delete from setlists where title = \${process.env.SMOKE_SETLIST_TITLE}\`;
      await sql\`delete from songs where slug = \${process.env.SMOKE_SLUG}\`;
      await sql.end();
    " >/dev/null 2>&1 || true
}

cleanup() {
  if [[ -n "${server_pid:-}" ]]; then
    kill "${server_pid}" 2>/dev/null || true
    wait "${server_pid}" 2>/dev/null || true
  fi

  cleanup_smoke_song

  rm -f "${server_log}"
}

trap cleanup EXIT

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
fi

set -a
source .env.local
set +a

pnpm db:start >/dev/null
cleanup_smoke_song

echo "Démarrage du serveur de test sur le port ${port}..."
pnpm exec next dev --hostname 127.0.0.1 --port "${port}" >"${server_log}" 2>&1 &
server_pid=$!

for _ in {1..30}; do
  if curl --fail --silent "${base_url}/api/songs" >/dev/null; then
    break
  fi

  if ! kill -0 "${server_pid}" 2>/dev/null; then
    cat "${server_log}"
    exit 1
  fi

  sleep 1
done

catalog="$(curl --fail --silent "${base_url}/api/songs")"
search_catalog="$(curl --fail --silent "${base_url}/api/songs?q=001")"
home_page="$(curl --fail --silent --location "${base_url}/")"
admin_page="$(curl --fail --silent --location "${base_url}/admin/chants")"
setlist_page="$(curl --fail --silent "${base_url}/setlist")"

if [[ "${catalog}" != *'"data":['* ]]; then
  echo "Échec : le catalogue public n'a pas le format attendu."
  exit 1
fi

if [[ "${search_catalog}" != *"jem-001-jaime-leternel"* ]]; then
  echo "Échec : la recherche par numéro de recueil ne retourne pas JEM001."
  exit 1
fi

if [[ "${home_page}" != *"Des chants prêts à être partagés"* ]]; then
  echo "Échec : la page d'accueil ne contient pas le catalogue attendu."
  exit 1
fi

if [[ "${admin_page}" != *"Nouveau chant"* ]]; then
  echo "Échec : la page d'administration des chants n'est pas rendue."
  exit 1
fi

if [[ "${setlist_page}" != *"Préparer les séquences de chants"* ]]; then
  echo "Échec : la page setlist n'est pas rendue."
  exit 1
fi

first_song_id="$(
  printf "%s" "${catalog}" |
    node --input-type=module -e "
      let body = '';
      for await (const chunk of process.stdin) body += chunk;
      const songs = JSON.parse(body).data;
      process.stdout.write(songs[0]?.id ?? '');
    "
)"

if [[ -z "${first_song_id}" ]]; then
  echo "Échec : aucun chant publié disponible pour tester les setlists."
  exit 1
fi

setlist_create_response="$(
  curl --fail --silent \
    --request POST \
    --header "content-type: application/json" \
    --data "{
      \"title\":\"${smoke_setlist_title}\",
      \"songIds\":[\"${first_song_id}\"]
    }" \
    "${base_url}/api/setlists"
)"
smoke_setlist_id="$(
  printf "%s" "${setlist_create_response}" |
    node --input-type=module -e "
      let body = '';
      for await (const chunk of process.stdin) body += chunk;
      process.stdout.write(JSON.parse(body).data.id);
    "
)"

if [[ -z "${smoke_setlist_id}" ]]; then
  echo "Échec : la création de setlist n'a pas retourné d'identifiant."
  exit 1
fi

setlist_detail="$(
  curl --fail --silent "${base_url}/api/setlists/${smoke_setlist_id}"
)"

if [[ "${setlist_detail}" != *"${first_song_id}"* ]]; then
  echo "Échec : la setlist créée ne contient pas le chant attendu."
  exit 1
fi

curl --fail --silent \
  --request PUT \
  --header "content-type: application/json" \
  --data "{
    \"title\":\"${smoke_setlist_title}\",
    \"songIds\":[\"${first_song_id}\",\"${first_song_id}\"]
  }" \
  "${base_url}/api/setlists/${smoke_setlist_id}" >/dev/null

setlist_play_page="$(curl --fail --silent "${base_url}/setlist/${smoke_setlist_id}/play")"

if [[ "${setlist_play_page}" != *"${smoke_setlist_title}"* ]]; then
  echo "Échec : la page lecture de setlist n'est pas rendue."
  exit 1
fi

setlist_delete_status="$(
  curl --silent --output /dev/null --write-out "%{http_code}" \
    --request DELETE \
    "${base_url}/api/setlists/${smoke_setlist_id}"
)"

if [[ "${setlist_delete_status}" != "204" ]]; then
  echo "Échec : la suppression de setlist répond ${setlist_delete_status}."
  exit 1
fi

create_response="$(
  curl --fail --silent \
    --request POST \
    --header "content-type: application/json" \
    --data "{
      \"title\":\"Chant smoke test\",
      \"slug\":\"${smoke_slug}\",
      \"author\":\"Test automatique\",
      \"copyright\":\"© Test automatique\",
      \"defaultKey\":\"C\",
      \"chordProContent\":\"{title: Chant smoke test}\\n[C]Version brouillon\"
    }" \
    "${base_url}/api/admin/songs"
)"
smoke_id="$(
  printf "%s" "${create_response}" |
    node --input-type=module -e "
      let body = '';
      for await (const chunk of process.stdin) body += chunk;
      process.stdout.write(JSON.parse(body).data.id);
    "
)"

if [[ -z "${smoke_id}" ]]; then
  echo "Échec : la création admin n'a pas retourné d'identifiant."
  exit 1
fi

new_draft_status="$(
  curl --silent --output /dev/null --write-out "%{http_code}" \
    "${base_url}/api/songs/${smoke_slug}"
)"

if [[ "${new_draft_status}" != "404" ]]; then
  echo "Échec : le nouveau brouillon est visible publiquement."
  exit 1
fi

curl --fail --silent \
  --request PUT \
  --header "content-type: application/json" \
  --data "{
    \"title\":\"Chant smoke test modifié\",
    \"slug\":\"${smoke_slug}\",
    \"author\":\"Test automatique\",
    \"copyright\":\"© Test automatique\",
    \"defaultKey\":\"D\",
    \"chordProContent\":\"{title: Chant smoke test modifié}\\n[D]Version publiée\"
  }" \
  "${base_url}/api/admin/songs/${smoke_id}" >/dev/null

curl --fail --silent \
  --request PUT \
  --header "content-type: application/json" \
  --data '{"published":true}' \
  "${base_url}/api/admin/songs/${smoke_id}/publication" >/dev/null

admin_public_status="$(
  curl --silent --output /dev/null --write-out "%{http_code}" \
    "${base_url}/api/songs/${smoke_slug}"
)"

if [[ "${admin_public_status}" != "200" ]]; then
  echo "Échec : le chant créé puis publié répond ${admin_public_status}."
  exit 1
fi

curl --fail --silent \
  --request PUT \
  --header "content-type: application/json" \
  --data '{"published":false}' \
  "${base_url}/api/admin/songs/${smoke_id}/publication" >/dev/null

admin_draft_status="$(
  curl --silent --output /dev/null --write-out "%{http_code}" \
    "${base_url}/api/songs/${smoke_slug}"
)"

if [[ "${admin_draft_status}" != "404" ]]; then
  echo "Échec : le chant retiré du catalogue répond ${admin_draft_status}."
  exit 1
fi

delete_status="$(
  curl --silent --output /dev/null --write-out "%{http_code}" \
    --request DELETE \
    "${base_url}/api/admin/songs/${smoke_id}"
)"

if [[ "${delete_status}" != "204" ]]; then
  echo "Échec : la suppression du brouillon répond ${delete_status}."
  exit 1
fi

deleted_admin_status="$(
  curl --silent --output /dev/null --write-out "%{http_code}" \
    "${base_url}/api/admin/songs/${smoke_id}"
)"

if [[ "${deleted_admin_status}" != "404" ]]; then
  echo "Échec : le chant supprimé répond encore ${deleted_admin_status}."
  exit 1
fi

echo
echo "Smoke test réussi :"
echo "- catalogue public accessible"
echo "- recherche par numero JEM validee"
echo "- page d'accueil rendue"
echo "- page d'administration rendue"
echo "- page setlist rendue"
echo "- setlist créée, éditée, jouée puis supprimée"
echo "- brouillon admin créé, invisible et modifié"
echo "- publication puis retrait validés"
echo "- suppression du brouillon validée"
