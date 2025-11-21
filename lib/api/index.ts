export { handle404Error, handle500Error, handleApiError } from './errorHandler';
export type { ApiErrorResponse } from './errorHandler';

// Note: Error handler functions are server-only
// Import directly in API routes: import { handle500Error } from '@/lib/api';
