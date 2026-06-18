# Domain Model

## Purpose

This document is the reference for the initial business data model.

It defines:
- the first persistent entities
- their fields
- the enums that must exist
- the main SQL constraints
- the MVP-1 validation rules

The goal is to stabilize the model before writing migrations.

## Modeling Principles

- Business entities are modeled in English in the code and database.
- Product wording shown to users is written in French.
- A song is the core business entity.
- A song may have multiple attached sources over time.
- A source belongs to exactly one song.
- Different source types do not justify different tables at this stage.
- Binary assets must live in storage, not in PostgreSQL rows.
- Official external catalog entries can be stored locally as read-only songs
  with source URLs preserved for provenance.

## Entity: `songs`

Represents the shared identity and metadata of a song, regardless of how the song content is stored or rendered.

### Fields

- `id`
  - type: `uuid`
  - required: yes
  - notes: primary key

- `title`
  - type: `text`
  - required: yes
  - notes: main displayed title

- `slug`
  - type: `text`
  - required: yes
  - notes: stable public identifier used in URLs

- `status`
  - type: `song_status`
  - required: yes
  - notes: publication state of the song

- `author`
  - type: `text`
  - required: no
  - notes: kept simple for MVP-1, even though multiple authors may exist later

- `copyright`
  - type: `text`
  - required: no
  - notes: copyright or rights notice displayed with externally sourced songs

- `default_key`
  - type: `text`
  - required: no
  - notes: canonical musical key such as `C`, `Bb`, or `F#m`

- `collection`
  - type: `text`
  - required: no
  - notes: source collection label such as `JEM` or temporary local parish collection `LeMont`

- `collection_number`
  - type: `integer`
  - required: no
  - notes: source collection number, positive when present

- `source_page_url`
  - type: `text`
  - required: no
  - notes: official source page for provenance

- `is_editable`
  - type: `boolean`
  - required: yes
  - notes: false for official imported songs that must not be edited directly

- `created_at`
  - type: `timestamptz`
  - required: yes
  - notes: creation timestamp

- `updated_at`
  - type: `timestamptz`
  - required: yes
  - notes: last update timestamp

## Entity: `song_sources`

Represents one attached source for a song, such as a ChordPro document, a PDF file, or a future YouTube link.

### Fields

- `id`
  - type: `uuid`
  - required: yes
  - notes: primary key

- `song_id`
  - type: `uuid`
  - required: yes
  - notes: foreign key to `songs.id`

- `source_type`
  - type: `song_source_type`
  - required: yes
  - notes: identifies the source family such as `chordpro`, `pdf`, or `youtube`

- `status`
  - type: `song_source_status`
  - required: yes
  - notes: lifecycle state of the source

- `text_content`
  - type: `text`
  - required: no
  - notes: used for text-based formats such as `chordpro`

- `storage_path`
  - type: `text`
  - required: no
  - notes: object storage path for binary assets such as PDFs

- `file_name`
  - type: `text`
  - required: no
  - notes: original or displayed file name for binary assets

- `mime_type`
  - type: `text`
  - required: no
  - notes: MIME type for stored binary assets

- `file_size_bytes`
  - type: `integer`
  - required: no
  - notes: binary asset size

- `external_url`
  - type: `text`
  - required: no
  - notes: URL for an external source, including official ChordPro files

- `created_at`
  - type: `timestamptz`
  - required: yes
  - notes: creation timestamp

- `updated_at`
  - type: `timestamptz`
  - required: yes
  - notes: last update timestamp

## Enums

### `song_status`

Recommended values:
- `draft`
- `published`

Reasoning:
- `draft` supports internal work before exposure
- `published` supports the public catalog

No more states are needed in MVP-1.

### `song_source_type`

Recommended values:
- `chordpro`
- `pdf`
- `youtube`

Reasoning:
- `chordpro` is needed now
- `pdf` is already a planned near-future format
- `youtube` is already a plausible future source and costs almost nothing to reserve

Adding a new enum value later is straightforward through a migration.

### `song_source_status`

Recommended values:
- `active`
- `archived`

Reasoning:
- `active` is the default usable state
- `archived` allows future soft-retirement without deleting historical rows

MVP-1 will mostly use `active`, but this state is cheap to include now.

## Relationship Direction

The foreign key lives on `song_sources.song_id`, not on `songs`.

Reason:
- one song can have many sources
- SQL foreign keys belong on the many-side of a one-to-many relationship
- this keeps the schema normalized
- it makes joins, filtering, and cascading deletes straightforward

This is the correct relational shape for the current need.

## SQL Constraints

### `songs`

Recommended constraints:
- primary key on `id`
- unique constraint on `slug`
- `title` must not be empty
- `status` must use the `song_status` enum
- `collection_number` must be positive when present
- `(collection, collection_number)` must be unique when both are present

Recommended indexes:
- unique index on `slug`
- index on `status`
- optional index on `collection`

### `song_sources`

Recommended constraints:
- primary key on `id`
- foreign key on `song_id` referencing `songs(id)`
- `on delete cascade` from `songs` to `song_sources`
- `source_type` must use the `song_source_type` enum
- `status` must use the `song_source_status` enum

Recommended conditional checks:
- if `source_type = 'chordpro'`, then `text_content` is required
- if `source_type = 'pdf'`, then `storage_path` is required
- if `source_type = 'youtube'`, then `external_url` is required

Recommended indexes:
- index on `song_id`
- index on `source_type`
- optional composite index on `(song_id, source_type, status)`
- unique partial index on `(song_id, source_type)` where `status = 'active'`

## MVP-1 Validation Rules

### Song rules

- `title` is required
- `slug` is required and unique
- `status` defaults to `draft`
- `default_key`, when present, must use the supported canonical key list
- supported keys currently cover 12 major and 12 minor display choices
- English or French notation is a browser display preference, not persisted song data
- temporary transposition changes rendered chords only and does not update `default_key` or ChordPro content
- official JEM songs are imported with `is_editable = false`
- manually created MVP-1 songs are assigned to collection `LeMont`
- read-only songs cannot be edited or deleted directly through admin services
- search in MVP-1 covers title and collection number
- the public catalog can be filtered by collection through fixed checkbox options

### Song source rules

- every source belongs to one song
- MVP-1 supports active `chordpro` and `pdf` sources
- `text_content` is required for `chordpro`
- `storage_path` is required for `pdf`
- only one active source per type should exist per song in MVP-1
- updating the current ChordPro source should overwrite the active source instead of creating version history
- replacing a PDF archives the active PDF source and creates a new active PDF source
- deleting a draft song cascades to its attached sources
- published songs must be returned to `draft` before deletion
- PDF files live in Supabase Storage, not PostgreSQL rows

## Deferred Decisions

The following are intentionally postponed:
- multiple authors through a dedicated table
- tags or themes
- revision history
- generated-source lineage such as ChordPro to PDF
- translation tables for song content
- original title and per-song language fields
- advanced JEM import automation
- replacing the temporary `LeMont` collection convention with the authenticated user's parish
- searching by author, lyrics, theme, or full-text index
- duplicating an official song into a local editable variant
- event and calendar relations

## Implemented First Migration

The first schema migration creates:
- the enums
- `songs`
- `song_sources`
- the required constraints and indexes

PDF-specific storage setup is added in a later migration so the initial
schema stays focused on structured song data.

## Implemented PDF Storage Migration

The PDF storage migration adds:
- a private Supabase Storage bucket named `song-pdfs`
- a 20 MiB PDF-only file limit
- one active source per `(song_id, source_type)`

The application serves PDFs through backend routes so browser clients do not
receive raw storage paths or service credentials.

## Entity: `setlists`

Represents an ordered worship-team sequence of published songs.

### Fields

- `id`
  - type: `uuid`
  - required: yes
  - notes: primary key

- `title`
  - type: `text`
  - required: yes
  - notes: displayed setlist title

- `created_at`
  - type: `timestamptz`
  - required: yes

- `updated_at`
  - type: `timestamptz`
  - required: yes

## Entity: `setlist_items`

Represents one song entry inside a setlist.

### Fields

- `id`
  - type: `uuid`
  - required: yes
  - notes: primary key

- `setlist_id`
  - type: `uuid`
  - required: yes
  - notes: foreign key to `setlists.id`

- `song_id`
  - type: `uuid`
  - required: yes
  - notes: foreign key to `songs.id`

- `position`
  - type: `integer`
  - required: yes
  - notes: zero-based order inside the setlist

- `created_at`
  - type: `timestamptz`
  - required: yes

## Implemented Setlist Migration

The setlist migration adds:
- `setlists`
- `setlist_items`
- ordered items through a unique `(setlist_id, position)` index
- cascade deletion from setlist to items
- restricted deletion for songs referenced by setlists

MVP setlists may only reference published songs. That rule is enforced in the
application service layer so future authentication and authorization can refine
who is allowed to create or edit setlists.
