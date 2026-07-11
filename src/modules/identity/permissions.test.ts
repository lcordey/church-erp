import { describe, expect, it } from "vitest";

import { resolvePermissions } from "./permissions";

describe("group permissions", () => {
  it("keeps administration and worship permissions independent and cumulative", () => {
    expect(resolvePermissions(["admin"])).toContain("user.manage");
    expect(resolvePermissions(["admin"])).not.toContain("song.manage");
    expect(resolvePermissions(["worship", "admin"])).toEqual(
      expect.arrayContaining(["song.manage", "event.manage", "user.manage", "taxonomy.manage"]),
    );
  });
});
