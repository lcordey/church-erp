export const groupCodes = ["worship", "admin"] as const;
export type GroupCode = (typeof groupCodes)[number];

export const permissions = [
  "score.read",
  "song.manage",
  "setlist.manage",
  "event.read",
  "event.manage",
  "taxonomy.read",
  "taxonomy.manage",
  "user.manage",
] as const;
export type Permission = (typeof permissions)[number];

export type AuthenticatedActor = {
  id: string;
  username: string;
  displayName: string;
  groupCodes: GroupCode[];
  permissions: Permission[];
  mustChangePassword: boolean;
};

export type AdminUserSummary = {
  id: string;
  username: string;
  displayName: string;
  status: "active" | "disabled";
  mustChangePassword: boolean;
  groupCodes: GroupCode[];
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AssignableUser = {
  id: string;
  displayName: string;
  username: string;
};

export type CreateUserInput = {
  username: string;
  displayName: string;
  temporaryPassword: string;
  groupCodes: GroupCode[];
};

export type UpdateUserInput = {
  username: string;
  displayName: string;
  status: "active" | "disabled";
  groupCodes: GroupCode[];
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type LoginInput = {
  username: string;
  password: string;
};
