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

- `language`
  - type: `text`
  - required: yes
  - notes: one language only for MVP-1, for example `fr`

- `status`
  - type: `song_status`
  - required: yes
  - notes: publication state of the song

- `original_title`
  - type: `text`
  - required: no
  - notes: useful when the displayed title is a translated or adapted version

- `author`
  - type: `text`
  - required: no
  - notes: kept simple for MVP-1, even though multiple authors may exist later

- `default_key`
  - type: `text`
  - required: no
  - notes: musical key kept for future usage

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
  - notes: reserved for future external sources such as YouTube

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
- `language` must not be empty
- `status` must use the `song_status` enum

Recommended indexes:
- unique index on `slug`
- index on `status`
- optional index on `language`

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

## MVP-1 Validation Rules

### Song rules

- `title` is required
- `slug` is required and unique
- `language` is required
- `status` defaults to `draft`

### Song source rules

- every source belongs to one song
- MVP-1 only creates `chordpro` sources
- `text_content` is required for `chordpro`
- only one active `chordpro` source should exist per song in MVP-1
- updating the current ChordPro source should overwrite the active source instead of creating version history

## Deferred Decisions

The following are intentionally postponed:
- multiple authors through a dedicated table
- tags or themes
- revision history
- generated-source lineage such as ChordPro to PDF
- translation tables for song content
- event, calendar, and setlist relations

## Recommendation For First Migration

The first schema migration should only create:
- the enums
- `songs`
- `song_sources`
- the required constraints and indexes

It should not include PDF-specific storage setup yet unless MVP-1 starts implementing PDF support, which is currently out of scope.
