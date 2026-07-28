import { describe, expect, it } from "vitest";

import {
  validateChangePasswordInput,
  validateTemporaryPasswordInput,
} from "./identity-input";

describe("password confirmation validation", () => {
  it("accepts a personal password change only when both new values match", () => {
    expect(validateChangePasswordInput({
      currentPassword: "ancien-secret",
      newPassword: "nouveau-secret-long",
      confirmNewPassword: "nouveau-secret-long",
    })).toEqual({
      success: true,
      data: {
        currentPassword: "ancien-secret",
        newPassword: "nouveau-secret-long",
      },
    });

    const mismatch = validateChangePasswordInput({
      currentPassword: "ancien-secret",
      newPassword: "nouveau-secret-long",
      confirmNewPassword: "autre-secret",
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.errors.confirmNewPassword).toContain("ne correspondent pas");
    }
  });

  it("rejects an admin reset when the temporary values differ", () => {
    const mismatch = validateTemporaryPasswordInput({
      temporaryPassword: "temporaire-solide-123",
      confirmTemporaryPassword: "temporaire-solide-456",
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.errors.confirmTemporaryPassword).toContain("ne correspondent pas");
    }

    expect(validateTemporaryPasswordInput({
      temporaryPassword: "temporaire-solide-123",
      confirmTemporaryPassword: "temporaire-solide-123",
    })).toEqual({
      success: true,
      data: { temporaryPassword: "temporaire-solide-123" },
    });
  });

  it("rejects short and common single-factor passwords", () => {
    expect(validateTemporaryPasswordInput({
      temporaryPassword: "trop-court",
      confirmTemporaryPassword: "trop-court",
    }).success).toBe(false);
    expect(validateTemporaryPasswordInput({
      temporaryPassword: "motdepasse123456",
      confirmTemporaryPassword: "motdepasse123456",
    }).success).toBe(false);
  });
});
