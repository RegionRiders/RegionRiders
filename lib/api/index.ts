// Export client-safe utilities
export { getApiBaseUrl, getApiUrl } from './config';

// Export only the TYPE (types don't trigger module imports)
export type { ApiErrorResponse } from './errorHandler';

// Note: Error handler functions are server-only
// Import directly in API routes: import { handle500Error } from '@/lib/api/errorHandler';
