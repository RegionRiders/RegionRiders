# Pino Logging Setup

## AI Generated Documentation

This project uses [Pino](https://github.com/pinojs/pino) for structured logging with environment-specific
configurations.

## Features

- **Structured JSON logging** in production for better log analysis
- **Pretty-printed logs** in development for human readability
- **Silent logging** in test environment
- **Automatic log file rotation** in production (app.log and error.log)
- **Sensitive data redaction** (passwords, tokens, API keys)
- **Child loggers** with context for different parts of the application
- **Browser-safe logging** for client-side code
- **Client/Server split** to prevent Node.js dependencies from bundling client-side

## Important: Server-First Architecture

This logger follows Next.js App Router best practices where **server components are the default**. The main export
provides the full server-side pino logger.

### For Server-Side Code (Default - API Routes, Server Components, Tests)

```typescript
import {logger, apiLogger, stravaLogger} from '@/lib/logger';
```

This is the default and recommended import for most use cases. It provides the full pino logger with all features.

### For Client-Side Code (Client Components, Browser)

```typescript
import {logger, createBrowserLogger} from '@/lib/logger/client';
```

Use this explicit import when you need logging in client components. It provides a browser-safe console-based logger.

### Explicit Server Import (Optional - For Clarity)

```typescript
import {logger} from '@/lib/logger';
```

This is still available if you want to be explicit that you're using the server logger, but it's not necessary since the
default is already server-side.

### Why Server-First?

1. **Next.js Philosophy**: App Router components are server components by default
2. **Most Common**: 90%+ of logging happens on the server (API routes, backend logic)
3. **Full Featured**: Server logger has all pino features (structured logging, log levels, etc.)
4. **Smaller Client Bundles**: Clients only import logger when explicitly needed
5. **Safety**: Prevents accidental Node.js dependency bundling in client code
   explicitly import from `@/lib/logger`.

## Usage

### Basic Logging

```typescript
import { logger } from '@/lib/logger';

// Log levels: trace, debug, info, warn, error, fatal
logger.info('Application started');
logger.error('Something went wrong');
logger.debug({ userId: '123' }, 'User action');
```

### Context-Specific Loggers

```typescript
import { apiLogger, authLogger, stravaLogger } from '@/lib/logger';

apiLogger.info({ method: 'GET', path: '/api/users' }, 'API request');
stravaLogger.debug({ athleteId: 123 }, 'Fetching athlete data');
authLogger.warn('Invalid token');
```

### Error Logging

```typescript
import { apiLogger, logError } from '@/lib/logger';

try {
  // Your code
} catch (error) {
  logError(apiLogger, error, 'Failed to process request');
  // or with additional context
  logError(apiLogger, error, { userId: '123', action: 'delete' });
}
```

# (Section removed: API Route Logging Middleware)

### Browser-Safe Logging

For components that may render on both server and client:

```typescript
import { createBrowserLogger } from '@/lib/logger';

const logger = createBrowserLogger();
logger.info('This works on both server and browser');
```

## Environment Configuration

### Development

Logs are pretty-printed with colors to the console:

```bash
npm run dev
# or
yarn dev
```

Example output:

```
[12:34:56] INFO: Application started
[12:34:57] INFO (api): API request
    method: "GET"
    path: "/api/users"
```

### Production

Logs are written in JSON format to files:

- `logs/app.log` - All logs (info level and above)
- `logs/error.log` - Error logs only

```bash
npm run build
npm start
```

Example log entry:

```json
{
  "level": "info",
  "time": 1699564800000,
  "name": "api",
  "msg": "API request",
  "method": "GET",
  "path": "/api/users"
}
```

### Test

Logging is silenced during tests to keep test output clean:

```bash
npm test
```

## Environment Variables

- `NODE_ENV` - Determines logging configuration (development|production|test)
- `LOG_LEVEL` - Override default log level (trace|debug|info|warn|error|fatal)
- `LOG_DIR` - Directory for production log files (default: ./logs)

Example:

```bash
LOG_LEVEL=debug npm run dev
LOG_DIR=/var/log/myapp npm start
```

## Log Levels

From most to least verbose:

1. **trace** - Very detailed debugging information
2. **debug** - Detailed debugging information
3. **info** - General information about application flow (default in production)
4. **warn** - Warning messages for potentially harmful situations
5. **error** - Error messages for failures
6. **fatal** - Critical errors that may cause application crash

## Creating Custom Child Loggers

```typescript
import { logger } from '@/lib/logger';

const paymentLogger = logger.child({ context: 'payment' });
paymentLogger.info({ amount: 100, currency: 'USD' }, 'Processing payment');
```

## Sensitive Data Redaction

The following fields are automatically redacted in production logs:

- password
- token
- authorization
- cookie
- apiKey
- secret

```typescript
// This will be redacted in production
logger.info({ password: 'secret123', username: 'user' }, 'Login attempt');
// Output: {"username":"user","msg":"Login attempt"}
```

## Testing

Tests are included to verify logging functionality:

```bash
npm run jest lib/logger
```

## Best Practices

1. **Use appropriate log levels**: info for general flow, warn for issues, error for failures
2. **Include context**: Add relevant data as the first parameter
3. **Use child loggers**: Create context-specific loggers for different modules
4. **Avoid logging sensitive data**: Passwords, tokens, personal information
5. **Structure your logs**: Use objects for data, string for messages
6. **Use the middleware**: Wrap API routes with `withLogging` for automatic request logging

## Migration from console.log

Replace:

```typescript
console.log('User logged in', userId);
console.error('Error:', error);
```

With:

```typescript
logger.info({ userId }, 'User logged in');
logError(logger, error, 'Login failed');
```

## Troubleshooting

### Logs not appearing in production

1. Check `NODE_ENV` is set to 'production'
2. Verify `LOG_DIR` exists and is writable
3. Check file permissions on log directory

### Pretty printing not working in development

1. Ensure `pino-pretty` is installed: `yarn add -D pino-pretty`
2. Verify `NODE_ENV` is not set to 'production'

### Logs appearing in tests

Set `NODE_ENV=test` or configure Jest to use test environment.
