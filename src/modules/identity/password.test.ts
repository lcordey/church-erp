import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password security", () => {
  it("hashes and verifies a password without storing it", async () => {
    const hash = await hashPassword("mot-de-passe-solide");
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(hash).not.toContain("mot-de-passe-solide");
    await expect(verifyPassword("mot-de-passe-solide", hash)).resolves.toBe(true);
    await expect(verifyPassword("mauvais", hash)).resolves.toBe(false);
  });

  it("accepts the two local seed credentials", async () => {
    await expect(
      verifyPassword(
        "louange",
        "scrypt$16384$8$1$UseNzejLzSi7aK70Nbqntw$B3QatI3q4J9cf0jC2zFqysWZud_0i1sGyA0Jqt9vabhlpGnyUxJEguWIxQ_WatdcqyH5sXLfSZS6WBhN2XAIHg",
      ),
    ).resolves.toBe(true);
    await expect(
      verifyPassword(
        "CDatalm",
        "scrypt$16384$8$1$a_Dj8uLg9qjtQYqxpBp0lg$cTToNCUQ1C9Yt6b6RtxadolxO7loz1wVbO_QlIGWQ2SIAjw4DxlRWMFjZI649w-cnczQFMO4n4Md3sznrdbWGw",
      ),
    ).resolves.toBe(true);
  });
});
