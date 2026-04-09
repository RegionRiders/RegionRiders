/**
 * @jest-environment <rootDir>/jest-environment-node-with-polyfills.cjs
 */

import { GET, HEAD } from './route';

const mockEvaluateHealthStatus = jest.fn();

jest.mock('./healthStatus', () => ({
  evaluateHealthStatus: () => mockEvaluateHealthStatus(),
}));

describe('/api/health route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the full health report from GET', async () => {
    mockEvaluateHealthStatus.mockResolvedValue({
      report: {
        status: 'healthy',
        timestamp: '2026-04-09T12:00:00.000Z',
        version: '1.2.3',
        environment: 'test',
        checks: {
          database: 'healthy',
          application: 'healthy',
        },
      },
      statusCode: 200,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'healthy',
      timestamp: '2026-04-09T12:00:00.000Z',
      version: '1.2.3',
      environment: 'test',
      checks: {
        database: 'healthy',
        application: 'healthy',
      },
    });
  });

  it('returns matching readiness semantics from HEAD', async () => {
    mockEvaluateHealthStatus.mockResolvedValue({
      report: {
        status: 'unhealthy',
        timestamp: '2026-04-09T12:00:00.000Z',
        version: '1.2.3',
        environment: 'test',
        checks: {
          database: 'unhealthy',
          application: 'healthy',
        },
      },
      statusCode: 503,
    });

    const response = await HEAD();

    expect(response.status).toBe(503);
    expect(await response.text()).toBe('');
  });
});
