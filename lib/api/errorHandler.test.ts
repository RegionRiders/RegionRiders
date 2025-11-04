/**
 * @jest-environment <rootDir>/jest-environment-node-with-polyfills.cjs
 */

import {
  handle404Error,
  handle500Error,
  handleApiError,
  type ApiErrorResponse,
} from './errorHandler';

describe('API Error Handler', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handle404Error', () => {
    it('should return a 404 response with default message', async () => {
      const response = handle404Error();
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not Found');
      expect(data.message).toBe('The requested API endpoint does not exist');
      expect(data.statusCode).toBe(404);
      expect(data.timestamp).toBeDefined();
      expect(data.path).toBeUndefined();
    });

    it('should return a 404 response with path included', async () => {
      const path = '/api/nonexistent';
      const response = handle404Error(path);
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not Found');
      expect(data.message).toBe(`The API endpoint '${path}' does not exist`);
      expect(data.statusCode).toBe(404);
      expect(data.path).toBe(path);
      expect(data.timestamp).toBeDefined();
    });

    it('should include ISO timestamp', async () => {
      const response = handle404Error();
      const data = (await response.json()) as ApiErrorResponse;

      const timestamp = new Date(data.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });
  });

  describe('handle500Error', () => {
    it('should handle Error instance', async () => {
      const error = new Error('Test error message');
      const response = handle500Error(error);
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toBe('Test error message');
      expect(data.statusCode).toBe(500);
      expect(data.timestamp).toBeDefined();
    });

    it('should handle unknown error type', async () => {
      const error = 'String error';
      const response = handle500Error(error);
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toBe('An unexpected error occurred');
      expect(data.statusCode).toBe(500);
    });

    it('should include context when provided', async () => {
      const error = new Error('Test error');
      const context = 'User Authentication';
      const response = handle500Error(error, context);
      const data = (await response.json()) as ApiErrorResponse;

      expect((data as any).context).toBe(context);
    });

    it('should log the error', async () => {
      const error = new Error('Test error');
      const context = 'Test Context';

      handle500Error(error, context);

      expect(console.error).toHaveBeenCalledWith(
        '[API Error]',
        expect.objectContaining({
          context,
          error,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('handleApiError', () => {
    it('should handle custom error with statusCode', async () => {
      const error = {
        statusCode: 404,
        message: 'Resource not found',
      };
      const response = handleApiError(error);
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not Found');
      expect(data.message).toBe('Resource not found');
      expect(data.statusCode).toBe(404);
    });

    it('should handle custom error with non-404 statusCode', async () => {
      const error = {
        statusCode: 403,
        message: 'Forbidden',
      };
      const response = handleApiError(error);
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(403);
      expect(data.error).toBe('Error');
      expect(data.message).toBe('Forbidden');
      expect(data.statusCode).toBe(403);
    });

    it('should default to 500 error for unknown errors', async () => {
      const error = new Error('Unknown error');
      const response = handleApiError(error);
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.statusCode).toBe(500);
    });

    it('should include context when provided', async () => {
      const error = new Error('Test error');
      const context = 'Data Processing';
      const response = handleApiError(error, context);
      const data = (await response.json()) as ApiErrorResponse;

      expect((data as any).context).toBe(context);
    });

    it('should handle null error', async () => {
      const response = handleApiError(null);
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });

    it('should handle undefined error', async () => {
      const response = handleApiError(undefined);
      const data = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });
  });
});
