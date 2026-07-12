# Events

## Scope

Events provide the internal worship-team agenda. An event has a title, required
start time, optional end time, notes, at most one setlist, and user assignments
with an optional free-text service role.

Event reads are public. A connected actor is still used when present to compute
personal state, such as `Mes services`, and to expose extra actions. Opening the
linked setlist requires `setlist.manage`; mutations require `event.manage`.

## Behavior

- Times are stored as `timestamptz` and displayed in `Europe/Paris`.
- The end must be after the start.
- Deleting a setlist clears the event link without deleting the event.
- Deleting an event cascades only to its assignments.
- Only active users can receive new assignments.
- Historical assignments remain visible if their account is later disabled.
- The index separates upcoming and past events and offers a `Mes services` filter
  only to connected users.
- The event detail page is read-only by default. Users with `event.manage` see
  an overflow menu with `Modifier l’événement`; users without that permission do
  not see the menu.

Calendar grids, recurrence, notifications, availability, reusable service roles,
readings, and projected documents remain deferred. A future ordered agenda-item
model can extend events without changing the current setlist domain.
