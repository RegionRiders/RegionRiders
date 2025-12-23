import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';

/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Returns health status of the application and its dependencies
 * Used by load balancers, monitoring systems, and Kubernetes probes
 */
export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: 'unknown',
      application: 'healthy',
    },
  };

  let overallStatus = 200;

  try {
    const db = getDb();
    const startTime = Date.now();

    await db.execute(sql`SELECT 1 as health_check`);

    const responseTime = Date.now() - startTime;

    checks.checks.database = 'healthy';

    // Warn if database response is slow
    if (responseTime > 1000) {
      checks.checks.database = 'degraded';
      checks.status = 'degraded';
      overallStatus = 200;
    }
  } catch (error) {
    checks.checks.database = 'unhealthy';
    checks.status = 'unhealthy';
    overallStatus = 503;
  }

  // Check if critical environment variables are set
  const requiredEnvVars = [
    'POSTGRES_HOST',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'OAUTH_ENCRYPTION_KEY',
    'STRAVA_CLIENT_ID',
    'STRAVA_CLIENT_SECRET',
  ];

  const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    checks.checks.application = 'unhealthy';
    checks.status = 'unhealthy';
    overallStatus = 503;
  }

  return NextResponse.json(checks, { status: overallStatus });
}

/**
 * Readiness Check
 * HEAD /api/health
 *
 * Lightweight check for container orchestration readiness probes
 */
export async function HEAD() {
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
