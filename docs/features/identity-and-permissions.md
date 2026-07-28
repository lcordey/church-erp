# Identity and permissions

## Product rules

- Anonymous visitors keep the existing public song, setlist, and event read experience.
- Accounts use a case-insensitive login identifier and a separate display name.
- Every account belongs to at least one fixed system group.
- `worship` can read scores and manage songs, setlists, and events.
- `admin` can manage accounts and song taxonomies.
- Permissions from several groups are cumulative; Admin does not imply Louange.
- Administrators cannot disable themselves, remove their own Admin membership, or remove the last active administrator.

## Authentication

Passwords are hashed with scrypt. New hashes use `N=32768`, `r=8`, `p=3`, and
older work factors are upgraded after a successful login. Opaque 256-bit
session tokens are stored only as SHA-256 hashes and expire after 30 days. Five
consecutive failures lock the account for 15 minutes; the counter is incremented
atomically. Disabled accounts and password resets revoke sessions.

Temporary passwords must be replaced before the account can use protected
features. New and changed single-factor passwords contain 15 to 128 Unicode
code points and reject a small set of common values. An existing password that
does not meet this policy triggers the password-change flow after its next
successful login. Password errors never reveal whether an identifier exists.

Unsafe cross-site API mutations are rejected before route handling. Pages use
a nonce-based Content Security Policy and standard browser security headers.
The API is private by default: only the public song metadata, setlist, event,
push-configuration reads, and authentication entry points can reach a route
without a session cookie. This early boundary does not replace the
authoritative session and permission checks in module services.

Local resets seed `louange / louange` and `admin / CDatalm`; both are temporary.
They are not inserted by production migrations.

## Administration

`/admin/comptes` supports account creation, identity and group updates,
activation, deactivation, and temporary-password resets. There is no email,
self-service recovery, custom group, or custom permission management yet.

The operational baseline and remaining authentication decisions are documented
in `docs/security.md`.
