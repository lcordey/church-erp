# Setup

## Purpose

This file is the operational handoff document for local development. Update it whenever the setup, commands, dependencies, or local workflow change.

## Current Project State

As of this revision:
- the repository contains a working Next.js modular monolith
- documentation for MVP-1, architecture, future backlog, and feature scope exists
- Supabase CLI and the local Supabase configuration are installed
- Drizzle ORM and the PostgreSQL driver are installed
- the songs migrations and demo seed data exist
- `pnpm db:reset` loads a generated offline snapshot of the public JEMAF catalog plus 5 editable local songs in `LeMont`
- the public songs catalog and song administration workflow are implemented
- the private `song-pdfs` Supabase Storage bucket is configured for optional PDF scores
- MusicXML score rendering uses `opensheetmusicdisplay` in the browser
- responsive desktop and phone access has been validated locally
- local HTTPS and WSL2-to-Windows port forwarding scripts are available
- Vitest covers the current business rules and API contracts
- Playwright is still planned, but the first PWA installability slice is now in place

## Runtime

- Node.js: expected LTS
- Package manager: `pnpm`
- Framework: `Next.js App Router`
- Language: `TypeScript`

## Current Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm check
pnpm local:setup
pnpm https:setup
pnpm phone:network
pnpm dev:phone
pnpm test:smoke
pnpm songs:sync-jemaf
pnpm songs:render-seed
pnpm songs:import-pdfs
pnpm songs:import-jem-pdfs
pnpm songs:import-glorious-musicxml
pnpm db:start
pnpm db:status
pnpm db:reset
pnpm db:stop
```

## Recommended Local Environment

Primary target workflow:
- Linux local development, or
- Windows with WSL2 as the real project environment

Recommended layout:
- repository stored in Linux filesystem, for example `~/work/church-erp`
- Git, Node.js, pnpm, Supabase CLI, and Docker-facing commands run from Linux or WSL

For Codex runs on this machine:
- the default sandbox shell may not expose `node`, `npm`, or `pnpm` on `PATH`
- when that happens, use the real WSL login shell instead of assuming the repo is misconfigured
- the reliable pattern is:

```bash
wsl.exe bash -lc "cd /home/lcordey/work/church-erp && if [ -f ~/.nvm/nvm.sh ]; then . ~/.nvm/nvm.sh; fi && pnpm build"
wsl.exe bash -lc "cd /home/lcordey/work/church-erp && if [ -f ~/.nvm/nvm.sh ]; then . ~/.nvm/nvm.sh; fi && pnpm test"
wsl.exe bash -lc "cd /home/lcordey/work/church-erp && if [ -f ~/.nvm/nvm.sh ]; then . ~/.nvm/nvm.sh; fi && pnpm lint && pnpm typecheck"
```

Avoid Windows `npm` wrappers against the Linux checkout. They can fall back to
`cmd.exe`, produce `UNC paths are not supported`, and fail before Next.js or
Vitest actually starts.

## Local Infrastructure Runtime

- Supabase local runs through Docker containers.
- Docker is required before running any `db:*` command.
- On Windows, Docker Desktop should be installed and connected to WSL2.
- Supabase CLI is expected to orchestrate the local Supabase services through Docker.
- The Docker daemon must be running and accessible to the current Linux or WSL user.

The project uses non-default ports to reduce conflicts with other local Supabase projects:

| Service | Local address |
| --- | --- |
| Supabase API | `http://127.0.0.1:15431` |
| PostgreSQL | `postgresql://postgres:postgres@127.0.0.1:15432/postgres` |
| Supabase Studio | `http://127.0.0.1:15433` |
| Mailpit | `http://127.0.0.1:15434` |

Server-side PDF storage access uses:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Temporary MVP login uses:
- `CHURCHERP_LOGIN_PASSWORD`
- `AUTH_SESSION_SECRET`

Every authenticated MVP-1 user is treated as an administrator. Anonymous users
can read song chords but cannot access PDF or MusicXML score routes.

Local scripts such as `pnpm dev:phone` and `pnpm test:smoke` load `.env.local`
explicitly so that an exported shell `DATABASE_URL` for a remote Supabase
project does not accidentally override the local database.

Use `pnpm db:status` after `pnpm db:start` to read the local `Secret`
authentication key and place it in `.env.local` as
`SUPABASE_SERVICE_ROLE_KEY`. This key must stay server-side only.

Import or refresh the local JEM PDF score files manually when needed:

```bash
pnpm songs:import-pdfs
```

By default this reads the files from `/home/lcordey/work/download_for_church_erp`.
Override that location with `SONG_PDF_DIR=/path/to/pdfs` when needed. The import
uploads the files to the private `song-pdfs` bucket and recreates active `pdf`
sources for the matching JEM songs already present in the seed.

Refresh the local JEMAF snapshot and regenerate `supabase/seed.sql`:

```bash
pnpm songs:sync-jemaf
```

This command fetches the configured public JEMAF collections,
stores the result in `supabase/generated/jemaf-catalog.json`, and rewrites
`supabase/seed.sql` so that future `pnpm db:reset` runs are fully offline.

By default the sync covers the public JEMAF collections currently supported by
the importer: `JEM`, `JEMK`, `AF`, and `ATG`.

To limit the refresh to a subset while keeping the same script:

```bash
JEMAF_COLLECTIONS=jemk,af pnpm songs:sync-jemaf
```

If a snapshot already exists and only the SQL seed needs to be rebuilt:

```bash
pnpm songs:render-seed
```

## First Local Start

Prepare the complete local environment:

```bash
pnpm local:setup
```

This command creates `.env.local` when needed, starts Supabase, recreates the
development database, applies every migration, and loads the demo seed.

`pnpm local:setup` is destructive for local business data because it runs
`pnpm db:reset`. The reset now also imports the local JEM PDFs into Supabase
Storage after the SQL seed is applied. Use it for first setup or when
intentionally returning to the seed state. For normal daily work, use
`pnpm db:start` or `pnpm dev:phone`.

Start the application for desktop-only development:

```bash
pnpm dev
```

Like `pnpm dev:phone`, this command loads `.env.local` explicitly before
starting Next.js so that an exported shell `DATABASE_URL` or `SUPABASE_URL`
cannot accidentally point the app at a different environment.

Run all local quality checks:

```bash
pnpm check
```

Run a real HTTP smoke test against Supabase:

```bash
pnpm test:smoke
```

The smoke test creates its own temporary draft, modifies it, publishes it,
unpublishes it, deletes it, and cleans it up automatically. It does not depend
on the current state of editable seed songs.

Use `pnpm db:status` to display the active local service URLs and credentials.
Use `pnpm db:stop` when the stack is no longer needed.

## Database Workflow

- `src/infrastructure/database/schema.ts` is the typed Drizzle schema used by application repositories.
- `supabase/migrations` contains the SQL migration history applied by Supabase.
- `supabase/generated/jemaf-catalog.json` stores the JEMAF snapshot used for local resets.
- `supabase/seed.sql` contains repeatable local demo data generated from the JEMAF snapshot plus the hand-written local songs in `LeMont`.
- Supabase Storage contains a private `song-pdfs` bucket for PDF score files; PostgreSQL stores only the object path and metadata.
- `drizzle.config.ts` generates Supabase-compatible timestamped migrations.
- In Vercel/serverless production, use the Supabase transaction pooler connection string for `DATABASE_URL`; the Postgres client disables prepared statements for pooler compatibility.

For a new schema change:

1. Update the Drizzle schema.
2. Run `pnpm db:generate --name=<short_change_name>`.
3. Review the generated SQL before applying it.
4. Run `pnpm db:reset` to validate the full migration history and seed.

For a JEMAF refresh:

1. Run `pnpm songs:sync-jemaf`.
2. Review the diff in `supabase/generated/jemaf-catalog.json` and `supabase/seed.sql`.
3. Run `pnpm db:reset` to validate the regenerated seed.

For JEM PDFs:

1. Place the JEM PDFs in `/home/lcordey/work/download_for_church_erp`, or set `SONG_PDF_DIR`.
2. Run `pnpm db:reset` or `pnpm songs:import-pdfs`.

For the local Glorious catalog:

1. Place the canonical ChordPro files in `/home/lcordey/work/download_for_church_erp/Glorious_ChordPro/canonical`.
2. Place the PDF files in `/home/lcordey/work/download_for_church_erp/Glorious`.
3. Place the MusicXML files in `/home/lcordey/work/download_for_church_erp/Glorious_MusicXML/musicxml`.
4. Run `pnpm songs:import-glorious`.
5. Run `pnpm songs:import-glorious-musicxml`.

These imports are idempotent and target the local database. The PDF import also
targets local Supabase Storage.

To version the Glorious song metadata and ChordPro sources in the repository
seed, generate the snapshot and re-render the seed:

```bash
pnpm songs:render-glorious
pnpm songs:render-seed
```

This updates `supabase/generated/glorious-catalog.json` and folds those songs
into `supabase/seed.sql`. PDF binaries still remain outside SQL and must be
uploaded separately through `pnpm songs:import-glorious`.

For a local folder-based collection import such as `Exo`, where songs ship as
MusicXML and optional PDFs without canonical ChordPro files:

```bash
pnpm songs:import-folder-catalog -- \
  --collection Exo \
  --namespace exo \
  --musicxml-dir /home/lcordey/work/download_for_church_erp/Exo_1_MusicXML/musicxml \
  --pdf-dir /home/lcordey/work/download_for_church_erp/Exo_1_pdf
```

This importer creates published songs in the requested collection, stores the
MusicXML payload in PostgreSQL, generates a minimal placeholder ChordPro source
so the songs appear in the catalog, and uploads matching PDFs when the target
Supabase Storage credentials are available.

Never use `drizzle-kit push` for project schema changes. Committed migrations
must remain the reproducible source of database changes.

The application connects directly to local PostgreSQL only from server-side
code through `DATABASE_URL`. Browser code must not use this credential.

## Docker Troubleshooting

- If Docker commands report that they cannot connect to the daemon, start Docker Desktop or the Linux Docker service.
- In WSL2, verify that Docker Desktop integration is enabled for the current distribution.
- If access to `/var/run/docker.sock` is denied, fix Docker group access for the current user rather than running the application as root.
- After changing Docker group membership, restart the shell or WSL session.

## Planned Tooling

The following are planned but not yet set up in this repo:
- Playwright
- PWA manifest, icons, service worker registration, and install prompt

## Product Language

- UI and business wording should be in French.
- Source code, file names, symbols, and technical architecture stay in English.
- Future localization must remain possible, even though only French is planned for now.

## Expected Next Setup Steps

1. Add Playwright for the main public and administration browser journeys.
2. Extend PWA behavior only if offline or update handling becomes a real need.
3. Prepare the next MVP module only after the worship-team workflow is validated.

## Local Phone Testing

The public catalog and administration workflow can be tested from a phone on
the same local network.

1. Connect the computer and phone to the same Wi-Fi.
2. Prepare the environment once with `pnpm local:setup`.
3. Configure local HTTPS once with `pnpm https:setup`.
4. On WSL2, run `pnpm phone:network` and accept the Windows administrator prompt.
5. Install `.certificates/church-erp-local-ca.crt` on the phone and explicitly trust it.
6. Run `pnpm dev:phone`.
7. Open the displayed network URL, for example `https://192.168.1.25:3000`, on the phone.

The terminal must remain open while testing. Stop Next.js with `Ctrl+C`.

### Trusting the local certificate

The generated CA certificate is safe to copy to the phone. Never copy either
`.key` file.

On iPhone or iPad:
1. Transfer `church-erp-local-ca.crt` to the device and open it.
2. Install the downloaded profile in Settings.
3. Open Settings > General > About > Certificate Trust Settings.
4. Enable full trust for `Church ERP Local Development CA`.

On Android:
1. Transfer `church-erp-local-ca.crt` to the device.
2. Open the security or credential settings.
3. Choose the option to install a CA certificate.
4. Select the transferred certificate.

Mobile operating system labels vary by version. Installing a user CA may show a
standard warning that network traffic can be inspected. The generated CA is
local to this project and its private key stays in `.certificates`, which is
ignored by Git.

Run `pnpm https:setup` again if the computer's Wi-Fi address changes. The local
CA remains the same, but the server certificate is regenerated with the current
address. Also update `allowedDevOrigins` in `next.config.ts` when the Windows LAN
address changes, otherwise Next.js may block development resources from the new
origin.

If the URL does not open:
- allow Node.js or port `3000` through the computer firewall
- verify that the Wi-Fi does not isolate connected devices
- on Windows with WSL2, the script displays the Windows LAN address rather than the internal WSL address
- in WSL2 NAT mode, rerun `pnpm phone:network` if the WSL address changes after a restart
- do not use `localhost` on the phone because it refers to the phone itself

`pnpm phone:network` configures a Windows TCP port proxy from port `3000` to the
current WSL address and creates a Windows Firewall rule limited to private
networks. It requests administrator approval because these are host-level
networking changes.

The HTTPS setup is for local development only. Production must use certificates
issued and renewed by the deployment platform.

## Update Rules

Update this file when any of the following changes:
- required software
- install commands
- startup commands
- test commands
- local networking steps
- emulator or device testing process
- environment variables
