# Security

## Scope

This document records the minimum security baseline for the worship-team MVP.
It is not a claim that the application or uploaded documents are risk-free.

## Current controls

### Accounts and sessions

- Passwords are stored as individually salted `scrypt` hashes, never as plain
  text or reversible encryption.
- New and changed single-factor passwords contain 15 to 128 Unicode code
  points and a small blocklist rejects obvious common values.
- Existing passwords that no longer meet this policy trigger the password
  change flow after the user's next successful login.
- New hashes use `scrypt` parameters `N=32768`, `r=8`, `p=3`. Older hashes are
  upgraded transparently after a successful login.
- Login errors do not reveal whether an identifier exists and unknown users
  still incur a password-hash verification cost.
- Five consecutive failures lock the account for 15 minutes. The database
  increments this counter atomically so parallel attempts cannot overwrite one
  another.
- Session tokens contain 256 random bits. Only their SHA-256 hashes are stored
  in PostgreSQL.
- Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Password changes, administrative resets, and account deactivation revoke
  existing sessions.

### Browser and request boundaries

- Unsafe cross-site requests to `/api` are rejected from `Origin` and Fetch
  Metadata before reaching route handlers.
- API access is private by default. Anonymous requests are admitted only for
  the login/logout entry points, protocol preflight, and the explicit public
  read routes listed below.
- A session cookie at the request boundary is only a fast rejection mechanism.
  Protected services still validate the session and permission server-side, so
  a forged, expired, or revoked cookie does not authorize an operation.
- Pages receive a per-request Content Security Policy nonce.
- The policy denies plugins, framing, foreign form targets, and arbitrary
  script execution.
- Responses set MIME-sniffing, referrer, framing, browser-permission, and
  production HSTS headers.
- External input is validated at route boundaries and Drizzle parameterizes
  database queries.

### API access matrix

| Access | Methods and routes |
| --- | --- |
| Public read | `GET/HEAD /api/songs`, `/api/songs/:slug` |
| Public read | `GET/HEAD /api/setlists`, `/api/setlists/:id` |
| Public read | `GET/HEAD /api/events`, `/api/events/:id` |
| Public read | `GET/HEAD /api/push/config` |
| Authentication entry point | `POST /api/auth/login`, `POST /api/auth/logout` |
| Private by default | Every other current or future `/api` request |

Anonymous event responses omit team assignments. Score files, administrative
reads, push-subscription preferences, and every write operation require a
valid session and the corresponding server-side permission.

### PDF and MusicXML

- Upload and delete operations require server-side permissions.
- PDF upload checks MIME type, extension, size, PDF header/trailer signatures,
  and rejects recognizable JavaScript, launch, rich-media, and embedded-file
  actions, including hex-escaped PDF names.
- PDF files use application-generated private storage paths. Storage requests
  reject paths and absolute URLs outside the configured bucket so the Supabase
  service key cannot be forwarded elsewhere.
- Authenticated PDF responses force `application/pdf`, disable MIME sniffing,
  disable caching, and apply a sandbox policy.
- The PDF viewer renders pages to canvas with PDF.js rather than embedding an
  interactive PDF viewer. XFA is disabled and rendering resources are bounded.
- MusicXML removes the standard external MusicXML DTD before persistence and
  rendering. Entity declarations, stylesheets, scripts, event handlers, active
  elements, and external/data resources are rejected.
- Authenticated MusicXML responses force a known MIME type, disable caching,
  and apply a sandbox policy.

## Important limits

- Removing a download button is not document protection. A user who can view a
  score has already received its bytes and can use browser tools, caches,
  screenshots, or photos. Access control and copyright rules are the relevant
  protections.
- Signature and static-content checks do not replace antivirus scanning or
  Content Disarm and Reconstruction (CDR). If document uploads are later opened
  to more users or to the public, add a quarantine workflow and a managed
  malware/CDR service before publication.
- The application currently uses passwords as one factor. Passkeys, OIDC, or
  TOTP MFA require an identity-provider and recovery decision before
  implementation.
- Account lockout limits password guessing against a known account. Hosting
  edge rate limits and alerts should additionally cover high-volume traffic
  and distributed attacks.

## Production operator checklist

- Enforce MFA on GitHub, Vercel, Supabase, the domain registrar, and the email
  account used to recover those services.
- Keep production secrets only in the hosting provider secret store. Never use
  a Supabase service-role key in a `NEXT_PUBLIC_*` variable.
- Rotate `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, VAPID private keys, and
  user sessions after any suspected disclosure.
- Keep automatic platform security updates enabled and review `pnpm audit
  --prod` before deployments.
- Restrict production deployment rights, protect `main`, and require reviewed
  changes.
- Enable database backups and test restoration.
- Configure hosting-edge rate limits for `/api/auth/login`, with a threshold
  appropriate for the small team, and alert on repeated `401`, `403`, and
  account-lock events.
- Review active accounts when someone leaves the team and disable unused
  accounts immediately.

## Next authentication decision

Prefer passkeys or a maintained OpenID Connect provider with MFA over building
a custom TOTP and recovery system. Before implementation, confirm which
identity all musicians can actually use (for example Google, Microsoft, or
another church-managed provider), who can recover a lost account, and whether
provider access must be restricted to an allowlist.
