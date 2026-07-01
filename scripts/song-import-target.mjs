const localDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:15432/postgres";
const localSupabaseUrl = "http://127.0.0.1:15431";
const localServiceRoleKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdWJhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0." +
  "EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export const importTargets = new Set(["local", "remote"]);

export function parseTargetOption(argv, options = {}) {
  const { defaultTarget = "local" } = options;
  let target = defaultTarget;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = argv[index + 1];

    if (argument === "--target" && next) {
      target = next;
      index += 1;
    }
  }

  if (!importTargets.has(target)) {
    throw new Error(`Unsupported target "${target}". Use one of: ${[...importTargets].join(", ")}.`);
  }

  return target;
}

export function stripTargetOption(argv) {
  const filtered = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--target") {
      index += 1;
      continue;
    }

    filtered.push(argument);
  }

  return filtered;
}

export function resolveTargetConfig(target) {
  if (target === "remote") {
    return {
      databaseUrl: process.env.DATABASE_URL ?? null,
      supabaseUrl: process.env.SUPABASE_URL ?? null,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? null,
    };
  }

  return {
    databaseUrl: process.env.LOCAL_DATABASE_URL ?? localDatabaseUrl,
    supabaseUrl: process.env.LOCAL_SUPABASE_URL ?? localSupabaseUrl,
    serviceRoleKey:
      process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      localServiceRoleKey,
  };
}

export function buildTargetEnv(target) {
  const config = resolveTargetConfig(target);
  const env = {
    ...process.env,
  };

  if (config.databaseUrl) {
    env.DATABASE_URL = config.databaseUrl;
  }

  if (config.supabaseUrl) {
    env.SUPABASE_URL = config.supabaseUrl;
  }

  if (config.serviceRoleKey) {
    env.SUPABASE_SERVICE_ROLE_KEY = config.serviceRoleKey;
  }

  return env;
}
