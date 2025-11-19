import { mkdir } from 'fs/promises';
import path from 'path';
import pino from 'pino';
import { getLoggerConfig, isProduction, LOG_DIR } from './config';

/**
 * Creates a production logger with file output and rotation
 * Logs are written to the specified directory with automatic rotation
 */
export async function createProductionLogger(): Promise<pino.Logger> {
  if (!isProduction) {
    // In non-production, return standard logger
    return pino(getLoggerConfig());
  }

  try {
    // Ensure log directory exists
    await mkdir(LOG_DIR, { recursive: true });

    const logConfig = getLoggerConfig();

    // Create streams for different log levels
    const streams: pino.StreamEntry[] = [
      {
        level: 'info',
        stream: pino.destination({
          dest: path.join(LOG_DIR, 'app.log'),
          sync: false,
          mkdir: true,
        }),
      },
      {
        level: 'error',
        stream: pino.destination({
          dest: path.join(LOG_DIR, 'error.log'),
          sync: false,
          mkdir: true,
        }),
      },
    ];

    // Create multistream logger for production
    return pino(logConfig, pino.multistream(streams));
  } catch (error) {
    // Fallback to standard logger if file logging fails
    const fallbackLogger = pino(getLoggerConfig());
    fallbackLogger.error({ error }, 'Failed to create production logger with file output');
    return fallbackLogger;
  }
}

/**
 * Production logger instance with file rotation
 * Only use this on server-side in production environment
 */
export let productionLogger: pino.Logger | null = null;

/**
 * Initialize the production logger
 * Call this once during application startup
 */
export async function initProductionLogger(): Promise<pino.Logger> {
  if (!productionLogger) {
    productionLogger = await createProductionLogger();
  }
  return productionLogger;
}
