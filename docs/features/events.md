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
- A person assigned to an event is identified by a small service icon in the
  agenda. In the event team, the connected person is identified by that icon
  and their name is emphasized.
- Event descriptions support a deliberately small, safe Markdown subset:
  emphasis, inline code, links, `#`/`##`/`###` headings and bullet lists. The editor starts
  new events with a practical template and offers a live preview.

Calendar grids, recurrence, notifications, availability, reusable service roles,
readings, and projected documents remain deferred. A future ordered agenda-item
model can extend events without changing the current setlist domain.
