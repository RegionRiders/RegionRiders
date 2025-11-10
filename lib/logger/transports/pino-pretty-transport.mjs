import pretty from 'pino-pretty';

/**
 * Pino pretty transport for Next.js
 * This needs to be an .mjs file for proper ES module handling
 * Returns a stream instead of using worker threads
 */
export default (options) => {
  return pretty({
    ...options,
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
    sync: true, // Important: synchronous to avoid worker threads
  });
};
