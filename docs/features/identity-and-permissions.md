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

Passwords are hashed with scrypt. Opaque 256-bit session tokens are stored only
as SHA-256 hashes and expire after 30 days. Five consecutive failures lock the
account for 15 minutes. Disabled accounts and password resets revoke sessions.

Temporary passwords must be replaced before the account can use protected
features. Normal passwords contain 8 to 128 characters. Password errors never
reveal whether an identifier exists.

Local resets seed `louange / louange` and `admin / CDatalm`; both are temporary.
They are not inserted by production migrations.

## Administration

`/admin/comptes` supports account creation, identity and group updates,
activation, deactivation, and temporary-password resets. There is no email,
self-service recovery, custom group, or custom permission management yet.
