# MVP-X

## Purpose

This document tracks likely future MVP phases and deferred product ideas beyond MVP-1.

It preserves product thinking without expanding the active implementation scope too early.

## Planning Rules

- MVP-1 stays intentionally narrow.
- Items here are future candidates, not active commitments.
- Priority may change once real usage clarifies the real pain points.
- A feature should move into its own feature document only when it becomes near-term work.

## MVP-2 Candidates

Priority direction:
- extend the song domain beyond the first text-based workflow
- support binary document handling
- improve internal worship-team usability

Likely features:
- richer PDF workflows such as bulk import, OCR metadata, or generated score exports
- richer source history and support for multiple active sources of the same type
- dedicated source management UI beyond the current song editor fields

## Delivered planning and identity foundation

The first event and identity slice now includes persistent accounts, fixed
Louange/Admin groups, revocable sessions, event notes, optional setlists, and
service assignments with personal filtering.

The first Web Push slice is also delivered: device opt-in and immediate alerts
for newly created event assignments. Scheduled reminders, change alerts and
per-category notification preferences remain deferred.

## MVP-3 Candidates

Priority direction:
- introduce event planning without building the whole planning domain too early

Likely features:
- calendar-oriented views beyond the delivered chronological list
- recurring events
- richer ordered event agenda items
- optional scripture readings linked to an event

## MVP-4 Candidates

Priority direction:
- enable collaboration between organizers and participants

Likely features:
- invitations to an event
- participant-facing event access
- controlled sharing of songs and documents
- invitations, recovery, and outbound account activation

## MVP-5 Candidates

Priority direction:
- extend toward broader team coordination

Likely features:
- volunteer management
- role assignments
- availability workflows
- communication and reminders
- richer authorization model

## Open Ideas

Ideas already mentioned and intentionally deferred:
- importer automatiquement l'ensemble du recueil JEM depuis les fichiers ChordPro JEMAF
- telecharger ou actualiser a la demande les sources ChordPro officielles
- dupliquer un chant officiel JEM vers une variante locale editable par l'eglise
- remplacer la convention temporaire `LeMont` par la paroisse de l'utilisateur connecte
- modeliser les paroisses, l'appartenance utilisateur-paroisse et les collections locales associees
- rechercher les chants par auteur, paroles ou index plein texte
- modeliser les contributeurs avec des roles precis plutot qu'un champ auteur brut
- remettre des champs langue ou titre original si un vrai besoin de traduction apparait
- convert ChordPro to PDF
- support additional score or document formats beyond ChordPro and PDF
- attach scripture readings to events
- share songs with invited participants
- stronger visual identity once the communication lead provides direction

## Promotion Criteria

A future idea should leave this document only when:
- the scope is stable enough to express as business rules
- it is close enough to implementation to justify deeper modeling
- its data model is concrete enough to review
