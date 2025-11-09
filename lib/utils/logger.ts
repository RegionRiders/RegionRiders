/* eslint-disable no-console */

interface Logger {
    info: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
}

/**
 * Creates and configures a logger instance that works both server-side and client-side.
 * On the server: Uses Winston with console and file transports
 * On the client: Falls back to console methods
 *
 * @example
 * import logger from '@lib/utils/logger';
 * logger.info('This is an info message');
 * logger.error('This is an error message');
 * logger.warn('This is a warning message');
 * logger.debug('This is a debug message');
 */
let logger: Logger;

if (typeof window === 'undefined') {
    // server-side: use winston
    const { createLogger, transports, format } = require('winston');

    logger = createLogger({
        level: 'info',
        format: format.combine(
            format.timestamp(),
            format.json()
        ),
        transports: [
            new transports.Console(),
            new transports.File({ filename: 'app.log' })
        ]
    });
} else {
    // client-side: fallback to console
    logger = {
        info: (message: string, meta?: any) => {
            console.log(`[INFO] ${message}`, meta || '');
        },
        error: (message: string, meta?: any) => {
            console.error(`[ERROR] ${message}`, meta || '');
        },
        warn: (message: string, meta?: any) => {
            console.warn(`[WARN] ${message}`, meta || '');
        },
        debug: (message: string, meta?: any) => {
            console.debug(`[DEBUG] ${message}`, meta || '');
        }
    };
}

export default logger;
