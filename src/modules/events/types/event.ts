export type EventAssignment = {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  userStatus: "active" | "disabled";
  role: string | null;
};

export type EventSetlist = { id: string; title: string };
export type EventType = { id: string; name: string };

export type EventSummary = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  eventType: EventType | null;
  setlist: EventSetlist | null;
  assignmentCount: number;
  isCurrentUserAssigned: boolean;
};

export type EventDetail = EventSummary & {
  notes: string | null;
  assignments: EventAssignment[];
  createdAt: Date;
  updatedAt: Date;
};

export type EventInput = {
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  notes: string | null;
  setlistId: string | null;
  eventTypeId: string | null;
  assignments: Array<{ userId: string; role: string | null }>;
};

export type EventScope = "all" | "mine";
