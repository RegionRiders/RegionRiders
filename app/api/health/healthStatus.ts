import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { hasDatabaseEnv } from '@/lib/db/config/env';

export type HealthCheckState = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthStatusReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckState;
    application: HealthCheckState;
  };
}

const REQUIRED_APP_ENV_VARS = ['OAUTH_ENCRYPTION_KEY', 'OAUTH_ENCRYPTION_SALT'] as const;

function hasSessionSecret(): boolean {
  if (process.env.SESSION_SECRET) {
    return true;
  }

  return process.env.NODE_ENV !== 'production' && Boolean(process.env.SESSION_SECRET_DEV);
}

export async function evaluateHealthStatus(): Promise<{
  report: HealthStatusReport;
  statusCode: number;
}> {
  const report: HealthStatusReport = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: 'unknown',
      application: 'healthy',
    },
  };

  let statusCode = 200;

  try {
    const db = getDb();
    const startTime = Date.now();

    await db.execute(sql`SELECT 1 as health_check`);

    const responseTime = Date.now() - startTime;
    report.checks.database = responseTime > 1000 ? 'degraded' : 'healthy';

    if (responseTime > 1000) {
      report.status = 'degraded';
    }
  } catch {
    report.checks.database = 'unhealthy';
    report.status = 'unhealthy';
    statusCode = 503;
  }

  const missingEnvVars = REQUIRED_APP_ENV_VARS.filter((varName) => !process.env[varName]);

  if (!hasDatabaseEnv() || !hasSessionSecret() || missingEnvVars.length > 0) {
    report.checks.application = 'unhealthy';
    report.status = 'unhealthy';
    statusCode = 503;
  }

  return { report, statusCode };
}
