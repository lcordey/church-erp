# Setup

## Purpose

This file is the operational handoff document for local development. Update it whenever the setup, commands, dependencies, or local workflow change.

## Current Project State

As of this revision:
- the repository is a fresh Next.js application
- documentation for MVP-1, architecture, future backlog, and feature scope exists
- Supabase, Drizzle, tests, and PWA tooling are planned but not yet installed in this repository

## Runtime

- Node.js: expected LTS
- Package manager: `pnpm`
- Framework: `Next.js App Router`
- Language: `TypeScript`

## Current Commands

```bash
pnpm dev
pnpm build
pnpm lint
```

## Recommended Local Environment

Primary target workflow:
- Linux local development, or
- Windows with WSL2 as the real project environment

Recommended layout:
- repository stored in Linux filesystem, for example `~/work/church-erp`
- Git, Node.js, pnpm, Supabase CLI, and Docker-facing commands run from Linux or WSL

## Planned Tooling

The following are planned but not yet set up in this repo:
- Docker
- Supabase CLI
- local Supabase stack
- Drizzle ORM
- database migrations and seed data
- Vitest
- Playwright
- PWA manifest and icons

## Product Language

- UI and business wording should be in French.
- Source code, file names, symbols, and technical architecture stay in English.
- Future localization must remain possible, even though only French is planned for now.

## Expected Next Setup Steps

1. Add `.gitattributes` if line endings are not yet enforced.
2. Install and configure local Supabase tooling.
3. Add database access libraries and migration workflow.
4. Add testing stack.
5. Add initial PWA metadata and installability assets.

## Local Phone Testing

Target outcome for MVP-1:
- run the app locally
- open it from a phone on the same network
- validate responsive admin and public screens

When this is implemented, update this section with:
- exact dev-server command
- hostname or IP strategy
- any HTTPS or manifest caveats

## Update Rules

Update this file when any of the following changes:
- required software
- install commands
- startup commands
- test commands
- local networking steps
- emulator or device testing process
- environment variables
