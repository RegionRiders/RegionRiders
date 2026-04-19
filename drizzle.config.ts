import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { resolveDatabaseEnv } from './lib/db/config/env';

// Load environment variables
dotenv.config({ path: '.env.local' });

const resolvedDatabaseEnv = resolveDatabaseEnv();

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    host: resolvedDatabaseEnv.host,
    port: resolvedDatabaseEnv.port,
    user: resolvedDatabaseEnv.user,
    password: resolvedDatabaseEnv.password,
    database: resolvedDatabaseEnv.database,
    ssl: resolvedDatabaseEnv.ssl
      ? { rejectUnauthorized: process.env.NODE_ENV === 'production' }
      : false,
  },
  verbose: true,
  strict: true,
});
