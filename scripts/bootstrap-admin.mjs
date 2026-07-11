import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

import postgres from "postgres";

const scrypt = promisify(scryptCallback);
const databaseUrl = process.env.DATABASE_URL;
const username = process.env.CHURCHERP_BOOTSTRAP_USERNAME?.trim().toLowerCase();
const displayName = process.env.CHURCHERP_BOOTSTRAP_DISPLAY_NAME?.trim();
const password = process.env.CHURCHERP_BOOTSTRAP_PASSWORD;

if (!databaseUrl || !username || !displayName || !password) {
  throw new Error(
    "DATABASE_URL, CHURCHERP_BOOTSTRAP_USERNAME, CHURCHERP_BOOTSTRAP_DISPLAY_NAME and CHURCHERP_BOOTSTRAP_PASSWORD are required.",
  );
}
if (!/^[a-z0-9._-]{3,50}$/.test(username) || password.length < 8 || password.length > 128) {
  throw new Error("The bootstrap username or password does not meet the application policy.");
}

const salt = randomBytes(16);
const derivedKey = await scrypt(password, salt, 64, {
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
});
const passwordHash = `scrypt$16384$8$1$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
  await sql.begin(async (transaction) => {
    const [user] = await transaction`
      INSERT INTO users (username, display_name, password_hash, status, must_change_password)
      VALUES (${username}, ${displayName}, ${passwordHash}, 'active', false)
      ON CONFLICT (lower(username)) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        password_hash = EXCLUDED.password_hash,
        status = 'active',
        must_change_password = false,
        failed_login_count = 0,
        locked_until = NULL,
        updated_at = now()
      RETURNING id
    `;
    await transaction`
      INSERT INTO user_group_memberships (user_id, group_code)
      VALUES (${user.id}, 'worship'), (${user.id}, 'admin')
      ON CONFLICT (user_id, group_code) DO NOTHING
    `;
    await transaction`DELETE FROM auth_sessions WHERE user_id = ${user.id}`;
  });
  console.log(`Administrator ${username} is ready.`);
} finally {
  await sql.end();
}
