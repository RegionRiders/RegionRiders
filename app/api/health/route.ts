import { NextResponse } from 'next/server';
import { evaluateHealthStatus } from './healthStatus';

/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Returns health status of the application and its dependencies
 * Used by load balancers, monitoring systems, and Kubernetes probes
 */
export async function GET() {
  const { report, statusCode } = await evaluateHealthStatus();

  return NextResponse.json(report, { status: statusCode });
}

/**
 * Readiness Check
 * HEAD /api/health
 *
 * Lightweight check for container orchestration readiness probes
 */
export async function HEAD() {
  const { statusCode } = await evaluateHealthStatus();

  return new NextResponse(null, { status: statusCode });
}
