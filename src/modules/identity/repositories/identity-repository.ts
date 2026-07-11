import { and, asc, count, eq, gt, ne, sql } from "drizzle-orm";

import { getDatabase } from "@/src/infrastructure/database/client";
import {
  authSessions,
  userGroupMemberships,
  users,
} from "@/src/infrastructure/database/schema";

import type {
  AdminUserSummary,
  AssignableUser,
  CreateUserInput,
  GroupCode,
  UpdateUserInput,
} from "../types/identity";

export type AuthenticationUser = AdminUserSummary & {
  passwordHash: string;
  failedLoginCount: number;
};

function validGroupCodes(values: Array<string | null>): GroupCode[] {
  return Array.from(
    new Set(values.filter((value): value is GroupCode => value === "worship" || value === "admin")),
  );
}

type UserRow = typeof users.$inferSelect;

function toSummary(row: UserRow, codes: GroupCode[]): AdminUserSummary {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    status: row.status,
    mustChangePassword: row.mustChangePassword,
    groupCodes: codes,
    lockedUntil: row.lockedUntil,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface IdentityRepository {
  findAuthenticationUser(username: string): Promise<AuthenticationUser | null>;
  findUserById(id: string): Promise<AuthenticationUser | null>;
  findActorBySessionTokenHash(tokenHash: string, now: Date): Promise<AuthenticationUser | null>;
  createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteSessionsForUser(userId: string): Promise<void>;
  recordLoginFailure(userId: string, failedLoginCount: number, lockedUntil: Date | null): Promise<void>;
  clearLoginFailures(userId: string): Promise<void>;
  listUsers(): Promise<AdminUserSummary[]>;
  listAssignableUsers(): Promise<AssignableUser[]>;
  createUser(input: CreateUserInput, passwordHash: string): Promise<AdminUserSummary>;
  updateUser(id: string, input: UpdateUserInput): Promise<AdminUserSummary | null>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  markPasswordChangeRequired(userId: string): Promise<void>;
  countActiveAdmins(excludingUserId?: string): Promise<number>;
}

export function createIdentityRepository(): IdentityRepository {
  const database = getDatabase();

  async function loadUserByRows(rows: Array<{ user: UserRow; groupCode: string | null }>) {
    const row = rows[0]?.user;
    if (!row) return null;
    return {
      ...toSummary(row, validGroupCodes(rows.map((item) => item.groupCode))),
      passwordHash: row.passwordHash,
      failedLoginCount: row.failedLoginCount,
    };
  }

  async function findUserByCondition(condition: ReturnType<typeof eq>) {
    const rows = await database
      .select({ user: users, groupCode: userGroupMemberships.groupCode })
      .from(users)
      .leftJoin(userGroupMemberships, eq(userGroupMemberships.userId, users.id))
      .where(condition);
    return loadUserByRows(rows);
  }

  async function findUserById(id: string) {
    return findUserByCondition(eq(users.id, id));
  }

  return {
    async findAuthenticationUser(username) {
      return findUserByCondition(eq(sql`lower(${users.username})`, username.toLowerCase()));
    },

    findUserById,

    async findActorBySessionTokenHash(tokenHash, now) {
      const sessionRows = await database
        .select({ userId: authSessions.userId })
        .from(authSessions)
        .innerJoin(users, eq(authSessions.userId, users.id))
        .where(
          and(
            eq(authSessions.tokenHash, tokenHash),
            gt(authSessions.expiresAt, now),
            eq(users.status, "active"),
          ),
        )
        .limit(1);
      return sessionRows[0] ? findUserById(sessionRows[0].userId) : null;
    },

    async createSession(userId, tokenHash, expiresAt) {
      await database.insert(authSessions).values({ userId, tokenHash, expiresAt });
    },

    async deleteSession(tokenHash) {
      await database.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
    },

    async deleteSessionsForUser(userId) {
      await database.delete(authSessions).where(eq(authSessions.userId, userId));
    },

    async recordLoginFailure(userId, failedLoginCount, lockedUntil) {
      await database
        .update(users)
        .set({ failedLoginCount, lockedUntil, updatedAt: new Date() })
        .where(eq(users.id, userId));
    },

    async clearLoginFailures(userId) {
      await database
        .update(users)
        .set({ failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
        .where(eq(users.id, userId));
    },

    async listUsers() {
      const rows = await database
        .select({ user: users, groupCode: userGroupMemberships.groupCode })
        .from(users)
        .leftJoin(userGroupMemberships, eq(userGroupMemberships.userId, users.id))
        .orderBy(asc(users.displayName), asc(users.username));
      const grouped = new Map<string, { user: UserRow; codes: Array<string | null> }>();
      for (const row of rows) {
        const current = grouped.get(row.user.id) ?? { user: row.user, codes: [] };
        current.codes.push(row.groupCode);
        grouped.set(row.user.id, current);
      }
      return Array.from(grouped.values()).map(({ user, codes }) =>
        toSummary(user, validGroupCodes(codes)),
      );
    },

    async listAssignableUsers() {
      return database
        .select({ id: users.id, displayName: users.displayName, username: users.username })
        .from(users)
        .where(eq(users.status, "active"))
        .orderBy(asc(users.displayName), asc(users.username));
    },

    async createUser(input, passwordHash) {
      const id = await database.transaction(async (transaction) => {
        const [created] = await transaction
          .insert(users)
          .values({
            username: input.username,
            displayName: input.displayName,
            passwordHash,
            mustChangePassword: true,
          })
          .returning({ id: users.id });
        await transaction.insert(userGroupMemberships).values(
          input.groupCodes.map((groupCode) => ({ userId: created.id, groupCode })),
        );
        return created.id;
      });
      const created = await findUserById(id);
      if (!created) throw new Error("Created user could not be reloaded.");
      return created;
    },

    async updateUser(id, input) {
      const updated = await database.transaction(async (transaction) => {
        const [row] = await transaction
          .update(users)
          .set({
            username: input.username,
            displayName: input.displayName,
            status: input.status,
            updatedAt: new Date(),
          })
          .where(eq(users.id, id))
          .returning({ id: users.id });
        if (!row) return false;
        await transaction
          .delete(userGroupMemberships)
          .where(eq(userGroupMemberships.userId, id));
        await transaction.insert(userGroupMemberships).values(
          input.groupCodes.map((groupCode) => ({ userId: id, groupCode })),
        );
        return true;
      });
      return updated ? findUserById(id) : null;
    },

    async updatePassword(userId, passwordHash) {
      await database
        .update(users)
        .set({
          passwordHash,
          mustChangePassword: false,
          failedLoginCount: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    },

    async markPasswordChangeRequired(userId) {
      await database
        .update(users)
        .set({ mustChangePassword: true, updatedAt: new Date() })
        .where(eq(users.id, userId));
    },

    async countActiveAdmins(excludingUserId) {
      const conditions = [
        eq(users.status, "active"),
        eq(userGroupMemberships.groupCode, "admin"),
      ];
      if (excludingUserId) conditions.push(ne(users.id, excludingUserId));
      const [row] = await database
        .select({ value: count(users.id) })
        .from(users)
        .innerJoin(userGroupMemberships, eq(userGroupMemberships.userId, users.id))
        .where(and(...conditions));
      return row?.value ?? 0;
    },
  };
}
