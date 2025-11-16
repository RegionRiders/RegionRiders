#!/usr/bin/env node

/**
 * Database Migration Script
 * Automatically initializes and migrates the database
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { closePool, testConnection } from '@/lib/db';
import { dbLogger } from '@/lib/logger';

const execAsync = promisify(exec);

async function runMigrations() {
  dbLogger.info('Starting database migration...');

  // Step 1: Test database connection
  dbLogger.info('Testing database connection...');
  const isConnected = await testConnection();

  if (!isConnected) {
    dbLogger.error(
      'Database connection failed!\n' +
        'Please ensure:\n' +
        '  1. PostgreSQL is running (yarn db:up)\n' +
        '  2. Environment variables are set correctly'
    );
    process.exit(1);
  }

  dbLogger.info('Database connection successful');

  // Step 2: Generate migrations if schema changed
  dbLogger.info('Generating migrations from schema...');
  try {
    const { stdout: genStdout } = await execAsync('yarn db:generate');
    if (genStdout) {
      dbLogger.debug({ output: genStdout }, 'Migration generation output');
    }
    dbLogger.info('Migrations generated');
  } catch (error: any) {
    if (error.stdout?.includes('No schema changes')) {
      dbLogger.info('No schema changes detected');
    } else {
      dbLogger.error({ error: error.message }, 'Migration generation failed');
      throw error;
    }
  }

  // Step 3: Apply migrations
  dbLogger.info('Applying migrations to database...');
  try {
    const { stdout: pushStdout } = await execAsync('yarn db:push');
    if (pushStdout) {
      dbLogger.debug({ output: pushStdout }, 'Migration push output');
    }
    dbLogger.info('Migrations applied successfully');
  } catch (error: any) {
    dbLogger.error({ error: error.message }, 'Migration push failed');
    throw error;
  }

  // Step 4: Verify schema
  dbLogger.info('Verifying database schema...');
  const verification = await testConnection();

  if (verification) {
    dbLogger.info('Database schema verified');
  } else {
    dbLogger.error('Schema verification failed');
    process.exit(1);
  }

  dbLogger.info(
    'Database migration completed successfully!\n' +
      'You can now:\n' +
      '  • Start the development server: yarn dev\n' +
      '  • Open Drizzle Studio: yarn db:studio\n' +
      '  • Run tests: yarn test'
  );

  await closePool();
}

// Run migrations
runMigrations().catch((error) => {
  dbLogger.error({ error }, 'Migration failed');
  process.exit(1);
});
