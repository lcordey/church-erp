# Architecture

## Goal

This project is a church management application that starts with a narrow worship-team MVP. The first phase optimizes for fast local iteration, clean vertical slices, and a codebase that can later grow into stricter authorization, more content formats, translation support, and broader ministry workflows without being rewritten.

## Architectural Style

The application is a modular monolith built in a single Next.js repository.

Why this shape:
- one deployable application
- one frontend and backend codebase
- one local developer workflow
- simple vertical slices from UI to database
- fewer moving parts during MVP-1

## Core Principles

- The browser never talks to PostgreSQL directly.
- UI code renders data and submits user intent.
- Route handlers enforce the main write boundary of the application.
- Server components may read data through services for server-rendered views.
- Server actions may be introduced later, but they are not the default write path for MVP-1.
- Module services contain business rules.
- Repositories encapsulate database access.
- Infrastructure code handles technical concerns such as database connections, auth integration, storage, and email.
- Shared utilities stay generic and must not accumulate business logic.
- Product copy is written in French, while code remains in English.
- UI text should be organized so future localization stays straightforward.

## Request Flow

Preferred write flow:

`UI -> route handler -> module service -> repository -> database`

Preferred read flow for non-trivial business rules:

`UI -> route handler or server component -> module service -> repository -> database`

Simple direct server-side reads can stay concise, but business decisions still belong in services.

## Target Repository Structure

```text
app/
  api/
  (public)/
  (admin)/

src/
  modules/
    songs/
    celebrations/
    volunteers/
    identity/
    communication/
  infrastructure/
    database/
    auth/
    storage/
    pwa/
    i18n/
  shared/
    types/
    validation/
    utils/
  components/
    ui/
```

Notes:
- `app/` owns routes, layouts, and page composition.
- `src/modules/*` owns domain logic.
- Module-specific UI should live inside the owning module when it is not broadly reusable.
- `src/infrastructure/*` owns technical adapters.
- `src/shared/*` owns reusable primitives with no module ownership.
- `src/components/ui/*` holds generic presentational building blocks that stay thin.
- Future modules should be created only when implementation starts, not pre-created just because they are listed here.

## Module Boundaries

### songs
Owns song data and workflows:
- song metadata
- publication status
- song source formats
- search and filtering
- future source conversion workflows

Recommended internal structure once implemented:
- `components/`
- `services/`
- `repositories/`
- `validation/`
- `types/`

### celebrations
Reserved for later phases. Owns worship events:
- celebration date
- title
- context
- lifecycle of a service or worship gathering

### volunteers
Reserved for later phases:
- team members
- roles
- assignments
- availability

### identity
Reserved for later phases:
- users
- groups
- roles
- permissions
- sessions

For MVP-1, the architecture keeps room for identity but does not require real user management yet.

### communication
Reserved for later phases:
- templates
- reminders
- outbound delivery history

## Authorization Strategy

MVP-1 starts in a permissive operating mode:
- there is no full user/group model yet
- all actual users are effectively admins

But the architecture must preserve future enforcement:
- admin-only actions must be separated from public reads in API design and service naming
- authorization checks should be funneled through explicit server-side helpers
- future restrictions must be introducible without moving business logic out of modules

## Data Strategy

- PostgreSQL is the source of truth for structured business data and metadata.
- Supabase Storage is the source of truth for binary assets such as PDFs.
- Supabase local will provide the development database and supporting local services.
- Schema changes are versioned through SQL migrations.
- Application access to PostgreSQL should go through Drizzle-backed repositories.
- Structured records should reference stored assets by path and metadata instead of embedding binaries in tables.
- Seed data should support local demos, tests, and mobile validation.

## Song Content Model Direction

The song domain must support multiple source formats attached to the same song over time.

Implications:
- `source type` is not a single exclusive field on the song
- a song may have one or more attached sources
- text-based sources and binary sources should not be forced into the same storage shape
- future conversion workflows, such as ChordPro to PDF, must remain possible

Recommended conceptual shape:
- `songs` for shared song metadata
- `song_sources` for format-specific attachments

Likely responsibilities:
- `songs` stores shared metadata such as title, slug, language, and publication status
- `song_sources` stores per-format metadata such as `source_type`, lifecycle state, and storage reference
- text payloads can live in structured columns for text-based formats
- binary payloads should live in object storage with metadata stored in PostgreSQL

## Frontend Strategy

- The initial experience must work well on desktop and phone.
- Admin surfaces can exist from day one even if every current user has access to them.
- Public and admin navigation should already be conceptually separated.
- UI components should remain replaceable and not contain hidden business rules.
- The visual language should stay neat, calm, and intentionally neutral.
- Avoid strong branding choices that would conflict with a future communication-led design direction.
- Favor a component and token structure that can later be aligned with Figma without changing business boundaries.
- Prefer module-local feature components over a large shared domain-components directory.
- Reserve `src/components/ui` for generic UI primitives.

## PWA Direction

PWA compatibility is part of the architecture from the start, but MVP-1 keeps the scope narrow:
- responsive layouts
- installable-ready structure
- manifest and icons when implementation begins
- local phone testing on the same network

Deferred beyond MVP-1 unless explicitly requested:
- advanced offline cache
- background sync
- push notifications

## Delivery Strategy

The preferred implementation style is a small vertical slice:
- migration
- repository
- service
- backend endpoint
- UI page or screen
- tests

This keeps the architecture honest by forcing every layer to work in local development before the next feature expands the system.

## Current Recommendation Adjustments

Based on the current project direction:
- keep `app/` at the repository root for now instead of moving to `src/app`
- use route handlers as the default write interface
- keep future modules documented, but only create them in code when work starts
- place business-specific components inside their module instead of under a global `components/domain`
