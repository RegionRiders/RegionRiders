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

function isExplicitSslMode(value: string): boolean {
  return ['allow', 'prefer', 'require', 'verify-ca', 'verify-full'].includes(value);
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

function resolveDatabaseSsl(host: string, env: NodeJS.ProcessEnv, sslMode?: string): boolean {
  if (typeof env.POSTGRES_SSL !== 'undefined') {
    return isTruthyEnvValue(env.POSTGRES_SSL);
  }

  if (typeof env.DATABASE_SSL !== 'undefined') {
    return isTruthyEnvValue(env.DATABASE_SSL);
  }

  const configuredSslMode = sslMode || env.PGSSLMODE;
  if (typeof configuredSslMode !== 'undefined') {
    const normalizedSslMode = configuredSslMode.toLowerCase();

    if (normalizedSslMode === 'disable') {
      return false;
    }

    if (isExplicitSslMode(normalizedSslMode)) {
      return true;
    }
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

  if (!/^\d+$/.test(value)) {
    return Number.NaN;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? fallback : parsed;
}

function assertValidPort(port: number, source: 'DATABASE_URL' | 'POSTGRES_PORT'): void {
  if (Number.isNaN(port)) {
    throw new Error(`Invalid ${source}: port must be a numeric value.`);
  }
}

function assertValidDatabaseUrl(parsed: URL): void {
  if (
    !parsed.hostname ||
    !parsed.username ||
    !parsed.password ||
    !parsed.pathname.replace(/^\//, '')
  ) {
    throw new Error(
      'Invalid DATABASE_URL: expected host, username, password, and database name to be present.'
    );
  }
}

function resolveDatabaseUrlEnv(databaseUrl: string, env: NodeJS.ProcessEnv): ResolvedDatabaseEnv {
  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('Invalid DATABASE_URL: expected a valid absolute PostgreSQL connection URL.');
  }

  assertValidDatabaseUrl(parsed);
  const host = parsed.hostname;
  const port = parsePort(parsed.port, 5432);

  assertValidPort(port, 'DATABASE_URL');

  return {
    host,
    port,
    database: parsed.pathname.replace(/^\//, ''),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    ssl: resolveDatabaseSsl(host, env, parsed.searchParams.get('sslmode') ?? undefined),
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

  const port = parsePort(env.POSTGRES_PORT, 5432);

  assertValidPort(port, 'POSTGRES_PORT');

  return {
    host: env.POSTGRES_HOST!,
    port,
    database: env.POSTGRES_DB!,
    user: env.POSTGRES_USER!,
    password: env.POSTGRES_PASSWORD!,
    ssl: resolveDatabaseSsl(env.POSTGRES_HOST!, env),
    hasDatabaseConfig: true,
    source: 'postgres_env',
  };
}

export function hasDatabaseEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  try {
    resolveDatabaseEnv(env);
    return true;
  } catch {
    return false;
  }
}

export function resolveDatabaseEnv(env: NodeJS.ProcessEnv = process.env): ResolvedDatabaseEnv {
  if (env.DATABASE_URL) {
    return resolveDatabaseUrlEnv(env.DATABASE_URL, env);
  }

  return resolvePostgresEnv(env);
}
