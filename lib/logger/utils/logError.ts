import type { Logger } from 'pino';

// noinspection ES6PreferShortImport
import { isProduction } from '../config/config'; // import isProduction directly, without importing pino

/**
 * Helper function to log errors with structured data
 * @param loggerInstance - The logger instance to use
 * @param error - The error object
 * @param context - Additional context about the error
 */
export function logError(
    loggerInstance: Logger,
    error: unknown,
    context?: string | Record<string, unknown>
) {
    const errorData: Record<string, unknown> = {
        ...(typeof context === 'string' ? { context } : context),
    };

    if (error instanceof Error) {
        errorData.errorMessage = error.message;
        errorData.errorName = error.name;
        if (error.stack && !isProduction) {
            errorData.stack = error.stack;
        }
    } else {
        errorData.error = error;
    }

    loggerInstance.error(errorData);
}
