import { NextRequest } from 'next/server';
import { handle404Error } from '@/lib/api/errorHandler';

/**
 * Catch-all route handler for undefined API endpoints
 * This handles all HTTP methods (GET, POST, PUT, DELETE, PATCH, etc.)
 */
export async function GET(request: NextRequest) {
  const path = new URL(request.url).pathname;
  return handle404Error(path);
}

export async function POST(request: NextRequest) {
  const path = new URL(request.url).pathname;
  return handle404Error(path);
}

export async function PUT(request: NextRequest) {
  const path = new URL(request.url).pathname;
  return handle404Error(path);
}

export async function DELETE(request: NextRequest) {
  const path = new URL(request.url).pathname;
  return handle404Error(path);
}

export async function PATCH(request: NextRequest) {
  const path = new URL(request.url).pathname;
  return handle404Error(path);
}

export async function HEAD(request: NextRequest) {
  const path = new URL(request.url).pathname;
  return handle404Error(path);
}

export async function OPTIONS(request: NextRequest) {
  const path = new URL(request.url).pathname;
  return handle404Error(path);
}
