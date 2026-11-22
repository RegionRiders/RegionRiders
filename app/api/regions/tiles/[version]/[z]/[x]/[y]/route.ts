import { readFile } from 'fs/promises';
import { join, normalize } from 'path';
import { logger } from '@/lib/logger';

const TILE_ROOT = join(process.cwd(), 'public', 'data', 'regions', 'tiles');
const GZIP_MAGIC_BYTE_1 = 0x1f;
const GZIP_MAGIC_BYTE_2 = 0x8b;

function hasPathTraversal(value: string): boolean {
  return value.includes('..') || value.includes('/') || value.includes('\\');
}

function normalizeYSegment(value: string): string {
  return value.endsWith('.pbf') ? value.slice(0, -4) : value;
}

function buildTilePath(
  version: string,
  z: string,
  x: string,
  y: string
): { ok: true; path: string } | { ok: false } {
  const normalizedY = normalizeYSegment(y);

  if (!normalizedY || [version, z, x, normalizedY].some(hasPathTraversal)) {
    return { ok: false };
  }

  const normalized = normalize(join(TILE_ROOT, version, z, x, `${normalizedY}.pbf`));

  if (!normalized.startsWith(TILE_ROOT)) {
    return { ok: false };
  }

  return { ok: true, path: normalized };
}

function isGzipPayload(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === GZIP_MAGIC_BYTE_1 && buffer[1] === GZIP_MAGIC_BYTE_2;
}

function createTileHeaders(buffer: Buffer): Headers {
  const headers = new Headers();

  headers.set('Content-Type', 'application/vnd.mapbox-vector-tile');
  headers.set('Cache-Control', 'public, max-age=3600');
  headers.set('Vary', 'Accept-Encoding');

  if (isGzipPayload(buffer)) {
    headers.set('Content-Encoding', 'gzip');
  }

  return headers;
}

function createMissingTileResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Content-Type': 'application/vnd.mapbox-vector-tile',
      'Cache-Control': 'public, max-age=60',
      Vary: 'Accept-Encoding',
    },
  });
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ version: string; z: string; x: string; y: string }>;
  }
) {
  const { version, z, x, y } = await params;
  const tilePath = buildTilePath(version, z, x, y);

  if (!tilePath.ok) {
    return new Response('Bad tile coordinates', { status: 400 });
  }

  try {
    const tileBytes = await readFile(tilePath.path);

    return new Response(tileBytes, {
      status: 200,
      headers: createTileHeaders(tileBytes),
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return createMissingTileResponse();
    }

    logger.error(`Failed to serve region tile ${version}/${z}/${x}/${y}: ${error}`);

    return new Response('Failed to read tile', { status: 500 });
  }
}
