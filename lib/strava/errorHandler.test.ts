/**
 * @jest-environment node
 */
import { handleStravaError } from './errorHandler';
describe('handleStravaError', () => {
  it('should handle Error instances with message', async () => {
    const error = new Error('Test error message');
    const context = 'Test Context';
    const response = handleStravaError(error, context);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({
      error: 'Test error message',
      context: 'Test Context',
    });
  });
  it('should handle unknown error types', async () => {
    const unknownError = { someProperty: 'not an Error object' };
    const context = 'Unknown Error Context';
    const response = handleStravaError(unknownError, context);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({
      error: 'An unknown error occurred',
      context: 'Unknown Error Context',
    });
  });
  it('should handle null error', async () => {
    const response = handleStravaError(null, 'Null Error');
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('An unknown error occurred');
    expect(data.context).toBe('Null Error');
  });
});
