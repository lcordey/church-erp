export type AdminActor = {
  accessMode: "mvp-admin";
};

export function requireAdminAccess(): AdminActor {
  // MVP-1 treats every real user as an administrator.
  return { accessMode: "mvp-admin" };
}
