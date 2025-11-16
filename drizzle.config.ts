import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load environment variables
dotenv.config({ path: '.env.local' });

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'regionriders_user',
    password: process.env.POSTGRES_PASSWORD || 'regionriders_pass',
    database: process.env.POSTGRES_DB || 'regionriders',
    ssl: false,
  },
  verbose: true,
  strict: true,
});
