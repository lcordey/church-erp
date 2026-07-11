import { describe, expect, it } from "vitest";

import {
  validateChangePasswordInput,
  validateTemporaryPasswordInput,
} from "./identity-input";

describe("password confirmation validation", () => {
  it("accepts a personal password change only when both new values match", () => {
    expect(validateChangePasswordInput({
      currentPassword: "ancien-secret",
      newPassword: "nouveau-secret",
      confirmNewPassword: "nouveau-secret",
    })).toEqual({
      success: true,
      data: { currentPassword: "ancien-secret", newPassword: "nouveau-secret" },
    });

    const mismatch = validateChangePasswordInput({
      currentPassword: "ancien-secret",
      newPassword: "nouveau-secret",
      confirmNewPassword: "autre-secret",
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.errors.confirmNewPassword).toContain("ne correspondent pas");
    }
  });

  it("rejects an admin reset when the temporary values differ", () => {
    const mismatch = validateTemporaryPasswordInput({
      temporaryPassword: "temporaire-123",
      confirmTemporaryPassword: "temporaire-456",
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.errors.confirmTemporaryPassword).toContain("ne correspondent pas");
    }

    expect(validateTemporaryPasswordInput({
      temporaryPassword: "temporaire-123",
      confirmTemporaryPassword: "temporaire-123",
    })).toEqual({ success: true, data: { temporaryPassword: "temporaire-123" } });
  });
});
