/**
 * @jest-environment <rootDir>/jest-environment-node-with-polyfills.cjs
 */

import { readFile } from 'fs/promises';
import { logger } from '@/lib/logger';
import { GET } from './route';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

const createParams = (overrides?: Partial<{ version: string; z: string; x: string; y: string }>) =>
  Promise.resolve({
    version: 'v1',
    z: '11',
    x: '1130',
    y: '654',
    ...overrides,
  });

describe('app/api/regions/tiles/[version]/[z]/[x]/[y]/route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('serves tile bytes with MVT content type', async () => {
    (readFile as jest.Mock).mockResolvedValue(Buffer.from([0x00, 0x11, 0x22]));

    const response = await GET(
      new Request('http://localhost:3000/api/regions/tiles/v1/11/1130/654.pbf'),
      {
        params: createParams(),
      }
    );

    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/vnd.mapbox-vector-tile');
    expect(response.headers.get('content-encoding')).toBeNull();
    expect(response.headers.get('vary')).toBe('Accept-Encoding');
    expect(Array.from(bytes)).toEqual([0x00, 0x11, 0x22]);
  });

  it('accepts y param with .pbf extension from route matcher', async () => {
    (readFile as jest.Mock).mockResolvedValue(Buffer.from([0x00, 0x11]));

    const response = await GET(
      new Request('http://localhost:3000/api/regions/tiles/v1/11/1130/654.pbf'),
      {
        params: createParams({ y: '654.pbf' }),
      }
    );

    expect(response.status).toBe(200);
  });

  it('sets gzip content-encoding when payload is gzipped', async () => {
    (readFile as jest.Mock).mockResolvedValue(Buffer.from([0x1f, 0x8b, 0x08, 0x00]));

    const response = await GET(
      new Request('http://localhost:3000/api/regions/tiles/v1/11/1130/654.pbf'),
      {
        params: createParams(),
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-encoding')).toBe('gzip');
  });

  it('returns empty 204 fallback for missing tile', async () => {
    const missing = new Error('Not found') as NodeJS.ErrnoException;
    missing.code = 'ENOENT';

    (readFile as jest.Mock).mockRejectedValue(missing);

    const response = await GET(
      new Request('http://localhost:3000/api/regions/tiles/v1/11/1131/653.pbf'),
      {
        params: createParams({ x: '1131', y: '653' }),
      }
    );

    const body = await response.text();

    expect(response.status).toBe(204);
    expect(response.headers.get('content-type')).toBe('application/vnd.mapbox-vector-tile');
    expect(body).toBe('');
  });

  it('rejects path traversal attempts', async () => {
    const response = await GET(
      new Request('http://localhost:3000/api/regions/tiles/v1/11/1130/654.pbf'),
      {
        params: createParams({ version: '../v1' }),
      }
    );

    expect(response.status).toBe(400);
  });

  it('rejects path traversal attempts in x and y segments', async () => {
    const xTraversalResponse = await GET(
      new Request('http://localhost:3000/api/regions/tiles/v1/11/1130/654.pbf'),
      {
        params: createParams({ x: '../1130' }),
      }
    );

    const yTraversalResponse = await GET(
      new Request('http://localhost:3000/api/regions/tiles/v1/11/1130/654.pbf'),
      {
        params: createParams({ y: '..\\654' }),
      }
    );

    expect(xTraversalResponse.status).toBe(400);
    expect(yTraversalResponse.status).toBe(400);
  });

  it('returns 500 and logs unexpected tile read errors', async () => {
    (readFile as jest.Mock).mockRejectedValue(new Error('disk failure'));

    const response = await GET(
      new Request('http://localhost:3000/api/regions/tiles/v1/11/1130/654.pbf'),
      {
        params: createParams(),
      }
    );

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Failed to read tile');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to serve region tile v1/11/1130/654')
    );
  });
});
