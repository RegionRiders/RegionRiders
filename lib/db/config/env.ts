export interface ResolvedDatabaseEnv {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  hasDatabaseConfig: boolean;
  source: 'database_url' | 'postgres_env';
}

const POSTGRES_ENV_KEYS = [
  'POSTGRES_HOST',
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
] as const;

function getMissingPostgresEnvKeys(env: NodeJS.ProcessEnv): string[] {
  return POSTGRES_ENV_KEYS.filter((key) => !env[key]);
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? fallback : parsed;
}

function resolveDatabaseUrlEnv(databaseUrl: string): ResolvedDatabaseEnv {
  const parsed = new URL(databaseUrl);

  return {
    host: parsed.hostname,
    port: parsePort(parsed.port, 5432),
    database: parsed.pathname.replace(/^\//, ''),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    hasDatabaseConfig: true,
    source: 'database_url',
  };
}

function resolvePostgresEnv(env: NodeJS.ProcessEnv): ResolvedDatabaseEnv {
  const missingKeys = getMissingPostgresEnvKeys(env);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missingKeys.join(', ')}\n` +
        'Configure DATABASE_URL or provide the required POSTGRES_* variables.'
    );
  }

  return {
    host: env.POSTGRES_HOST!,
    port: parsePort(env.POSTGRES_PORT, 5432),
    database: env.POSTGRES_DB!,
    user: env.POSTGRES_USER!,
    password: env.POSTGRES_PASSWORD!,
    hasDatabaseConfig: true,
    source: 'postgres_env',
  };
}

export function hasDatabaseEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.DATABASE_URL) || getMissingPostgresEnvKeys(env).length === 0;
}

export function resolveDatabaseEnv(env: NodeJS.ProcessEnv = process.env): ResolvedDatabaseEnv {
  if (env.DATABASE_URL) {
    return resolveDatabaseUrlEnv(env.DATABASE_URL);
  }

  return resolvePostgresEnv(env);
}
