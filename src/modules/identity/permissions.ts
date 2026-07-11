import type { GroupCode, Permission } from "./types/identity";

const groupPermissions: Record<GroupCode, readonly Permission[]> = {
  worship: [
    "score.read",
    "song.manage",
    "setlist.manage",
    "event.read",
    "event.manage",
    "taxonomy.read",
  ],
  admin: ["event.read", "taxonomy.read", "taxonomy.manage", "user.manage"],
};

export function resolvePermissions(groupCodes: readonly GroupCode[]): Permission[] {
  return Array.from(
    new Set(groupCodes.flatMap((groupCode) => groupPermissions[groupCode])),
  );
}

export function hasPermission(
  permissions: readonly Permission[],
  permission: Permission,
) {
  return permissions.includes(permission);
}
