/**
 * @jest-environment <rootDir>/jest-environment-node-with-polyfills.cjs
 */

import { NextRequest } from 'next/server';
import type { ApiErrorResponse } from '@/lib/api';
import { DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT } from './route';

describe('API Catch-all 404 Handler', () => {
  const createRequest = (path: string, method: string = 'GET') => {
    return new NextRequest(`http://localhost:3000${path}`, {
      method,
    });
  };

  describe('GET requests', () => {
    it('should return 404 for undefined GET endpoint', async () => {
      const request = createRequest('/api/undefined-endpoint', 'GET');
      const response = await GET(request);
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not Found');
      expect(data.statusCode).toBe(404);
      expect(data.path).toBe('/api/undefined-endpoint');
    });
  });

  describe('POST requests', () => {
    it('should return 404 for undefined POST endpoint', async () => {
      const request = createRequest('/api/undefined-endpoint', 'POST');
      const response = await POST(request);
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not Found');
      expect(data.statusCode).toBe(404);
      expect(data.path).toBe('/api/undefined-endpoint');
    });
  });

  describe('PUT requests', () => {
    it('should return 404 for undefined PUT endpoint', async () => {
      const request = createRequest('/api/undefined-endpoint', 'PUT');
      const response = await PUT(request);
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(404);
      expect(data.statusCode).toBe(404);
    });
  });

  describe('DELETE requests', () => {
    it('should return 404 for undefined DELETE endpoint', async () => {
      const request = createRequest('/api/undefined-endpoint', 'DELETE');
      const response = await DELETE(request);
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(404);
      expect(data.statusCode).toBe(404);
    });
  });

  describe('PATCH requests', () => {
    it('should return 404 for undefined PATCH endpoint', async () => {
      const request = createRequest('/api/undefined-endpoint', 'PATCH');
      const response = await PATCH(request);
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(404);
      expect(data.statusCode).toBe(404);
    });
  });

  describe('HEAD requests', () => {
    it('should return 404 for undefined HEAD endpoint', async () => {
      const request = createRequest('/api/undefined-endpoint', 'HEAD');
      const response = await HEAD(request);
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(404);
      expect(data.statusCode).toBe(404);
    });
  });

  describe('OPTIONS requests', () => {
    it('should return 404 for undefined OPTIONS endpoint', async () => {
      const request = createRequest('/api/undefined-endpoint', 'OPTIONS');
      const response = await OPTIONS(request);
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(404);
      expect(data.statusCode).toBe(404);
    });
  });

  describe('Path handling', () => {
    it('should include the correct path in response', async () => {
      const path = '/api/users/123/profile';
      const request = createRequest(path, 'GET');
      const response = await GET(request);
      const data = (await response.json()) as ApiErrorResponse;

      expect(data.path).toBe(path);
      expect(data.message).toContain(path);
    });

    it('should handle nested paths', async () => {
      const path = '/api/v1/users/settings/notifications';
      const request = createRequest(path, 'POST');
      const response = await POST(request);
      const data = (await response.json()) as ApiErrorResponse;

      expect(data.path).toBe(path);
    });
  });

  describe('Response structure', () => {
    it('should have correct response structure', async () => {
      const request = createRequest('/api/test', 'GET');
      const response = await GET(request);
      const data = (await response.json()) as ApiErrorResponse;

      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('statusCode');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('path');
    });

    it('should have valid ISO timestamp', async () => {
      const request = createRequest('/api/test', 'GET');
      const response = await GET(request);
      const data = (await response.json()) as ApiErrorResponse;

      const timestamp = new Date(data.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });
  });
});
