import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:15432/postgres";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/database/schema.ts",
  out: "./supabase/migrations",
  dbCredentials: {
    url: databaseUrl,
  },
  migrations: {
    prefix: "supabase",
  },
  strict: true,
  verbose: true,
});
