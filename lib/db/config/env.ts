export interface ResolvedDatabaseEnv {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  hasDatabaseConfig: boolean;
  source: 'database_url' | 'postgres_env';
}

function isTruthyEnvValue(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value || '').toLowerCase());
}

function isInternalDokkuHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('dokku-postgres-') ||
    host === 'postgres' ||
    host.endsWith('.internal')
  );
}

function resolveDatabaseSsl(host: string, env: NodeJS.ProcessEnv): boolean {
  if (typeof env.POSTGRES_SSL !== 'undefined') {
    return isTruthyEnvValue(env.POSTGRES_SSL);
  }

  if (typeof env.DATABASE_SSL !== 'undefined') {
    return isTruthyEnvValue(env.DATABASE_SSL);
  }

  if (typeof env.PGSSLMODE !== 'undefined') {
    return !['disable', 'allow', 'prefer'].includes(env.PGSSLMODE.toLowerCase());
  }

  if (env.NODE_ENV !== 'production') {
    return false;
  }

  return !isInternalDokkuHost(host);
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

function resolveDatabaseUrlEnv(databaseUrl: string, env: NodeJS.ProcessEnv): ResolvedDatabaseEnv {
  const parsed = new URL(databaseUrl);
  const host = parsed.hostname;

  return {
    host,
    port: parsePort(parsed.port, 5432),
    database: parsed.pathname.replace(/^\//, ''),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    ssl: resolveDatabaseSsl(host, env),
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
    ssl: resolveDatabaseSsl(env.POSTGRES_HOST!, env),
    hasDatabaseConfig: true,
    source: 'postgres_env',
  };
}

export function hasDatabaseEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.DATABASE_URL) || getMissingPostgresEnvKeys(env).length === 0;
}

export function resolveDatabaseEnv(env: NodeJS.ProcessEnv = process.env): ResolvedDatabaseEnv {
  if (env.DATABASE_URL) {
    return resolveDatabaseUrlEnv(env.DATABASE_URL, env);
  }

  return resolvePostgresEnv(env);
}
