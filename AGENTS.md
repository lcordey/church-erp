# Project Rules

## Product Context
- This project starts with a worship-team-only MVP.
- In MVP-1, every real user is treated as an administrator.
- The product experience is written in French.
- The codebase, identifiers, and implementation remain in English.
- The codebase must preserve a future path toward restricted permissions and future translation.
- Do not introduce real user, group, or role management unless the task explicitly requires it.

## Architecture
- This application is a modular monolith built with Next.js App Router.
- The browser must never access PostgreSQL directly.
- All writes must go through backend route handlers or server-side actions explicitly designed for that purpose.
- Route handlers and server actions coordinate requests but do not contain business logic.
- Business logic belongs in module services.
- Database access belongs in repositories.
- Shared infrastructure belongs in `src/infrastructure`.
- Cross-cutting helpers and types belong in `src/shared`.
- Modules must not import another module's repository or infrastructure directly.
- Prefer vertical slices that cross UI, backend, service, repository, and database in one focused feature.
- UI copy must not be hardcoded in ways that block later localization.

## Security
- Hiding a button is not authorization.
- Server-side authorization must remain possible even if MVP-1 temporarily allows all actions.
- Never expose database credentials or service keys to client code.
- Validate external input at the server boundary.
- Treat public reads and admin writes as different access modes, even before real authentication exists.

## Database
- PostgreSQL is the source of truth for structured business data and metadata.
- Binary assets must live in object storage, not in PostgreSQL rows.
- Schema changes require a migration.
- Never edit an already-committed migration.
- Add seed data when a feature needs reference or demo data.
- Keep SQL readable and explicit.

## Quality
- Keep diffs focused on the requested task.
- Do not modify unrelated files without a clear reason.
- Do not introduce a new dependency without explaining why it is needed.
- Prefer simple implementations over speculative abstractions.
- Avoid `any`, `@ts-ignore`, broad `eslint-disable`, and build-error bypasses.
- Run relevant validation before finishing: lint, typecheck, and tests when available.

## Design
- The interface should be clean, calm, and sober.
- Avoid locking the product into a strong brand direction before the communication lead defines it.
- Prefer component structures that can later map cleanly to Figma designs or be exported back into Figma.
- Keep visual tokens and component naming stable so future design work can be integrated without rewriting product logic.

## Documentation
- Update `docs/setup.md` whenever setup steps, dependencies, or local workflow expectations change.
- Update the relevant file in `docs/features/` when feature scope or rules change.
- Keep `docs/MVP-1.md` aligned with the actual delivery plan.
- Keep `docs/MVP-X.md` aligned with deferred ideas and likely future priorities.
