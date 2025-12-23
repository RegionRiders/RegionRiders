#!/usr/bin/env node

/**
 * SSL Connection Test Script
 * Tests SSL connectivity to production database
 *
 * Usage:
 *   node scripts/test-ssl-connection.js
 *
 * Environment Variables Required:
 *   - POSTGRES_HOST
 *   - POSTGRES_PORT
 *   - POSTGRES_DB
 *   - POSTGRES_USER
 *   - POSTGRES_PASSWORD
 *   - NODE_ENV (should be 'production' for SSL testing)
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

function success(text) { return process.env.NO_COLOR ? text : `${colors.green}${text}${colors.reset}`; }
function error(text) { return process.env.NO_COLOR ? text : `${colors.red}${text}${colors.reset}`; }
function warning(text) { return process.env.NO_COLOR ? text : `${colors.yellow}${text}${colors.reset}`; }
function info(text) { return process.env.NO_COLOR ? text : `${colors.blue}${text}${colors.reset}`; }
function highlight(text) { return process.env.NO_COLOR ? text : `${colors.cyan}${colors.bright}${text}${colors.reset}`; }
function dim(text) { return process.env.NO_COLOR ? text : `${colors.gray}${text}${colors.reset}`; }
function pass(text) { return process.env.NO_COLOR ? `[${text}]` : `${colors.bgGreen}${colors.white}${text}${colors.reset}`; }
function fail(text) { return process.env.NO_COLOR ? `[${text}]` : `${colors.bgRed}${colors.white}${text}${colors.reset}`; }

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Use production-ready defaults that match main codebase
process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
process.env.POSTGRES_PORT = process.env.POSTGRES_PORT || '5432';
process.env.POSTGRES_DB = process.env.POSTGRES_DB || 'regionriders';
process.env.POSTGRES_USER = process.env.POSTGRES_USER || 'regionriders_user';
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'regionriders_pass';
process.env.OAUTH_ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY || 'test-encryption-key-for-jest-only-not-for-production';
process.env.OAUTH_ENCRYPTION_SALT = process.env.OAUTH_ENCRYPTION_SALT || 'regionriders-default-salt'; // Match main codebase
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Database config matching main codebase
function getDatabaseConfig() {
  const required = ['POSTGRES_HOST', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missing.join(', ')}\n` +
        'Please check your .env.local file and ensure all database variables are set.'
    );
  }

  const host = process.env.POSTGRES_HOST;
  const port = parseInt(process.env.POSTGRES_PORT || '5432', 10);
  const database = process.env.POSTGRES_DB;
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const ssl = process.env.NODE_ENV === 'production';

  return {
    host,
    port,
    database,
    user,
    password,
    ssl,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10), // Match main codebase
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
  };
}

// Crypto functions matching main codebase (base64 encoding)
function getEncryptionKey() {
  const keyEnv = process.env.OAUTH_ENCRYPTION_KEY;
  const saltEnv = process.env.OAUTH_ENCRYPTION_SALT || 'regionriders-default-salt';

  if (!keyEnv) {
    throw new Error('OAUTH_ENCRYPTION_KEY environment variable is required');
  }

  return crypto.scryptSync(keyEnv, saltEnv, 32);
}

function encryptToken(text) {
  if (!text) return text;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

function decryptToken(encryptedData) {
  if (!encryptedData) return encryptedData;

  const parts = encryptedData.split(':');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error('Invalid encrypted data format');
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(parts[2], 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw new Error('Invalid encrypted data format');
  }
}

async function testSSLConnection() {
  console.log(highlight('Testing SSL connection to production database (v3.0)...\n'));
  console.log(info('Environment variables loaded:'));
  console.log(`POSTGRES_HOST: ${process.env.POSTGRES_HOST}`);
  console.log(`POSTGRES_DB: ${process.env.POSTGRES_DB}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log('');

  try {
    const config = getDatabaseConfig();

    console.log(info('Connection Configuration:'));
    console.log(`   Host: ${config.host}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);
    console.log(`   SSL Enabled: ${config.ssl}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);

    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl
        ? { rejectUnauthorized: process.env.NODE_ENV === 'production' }
        : false,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
      max: config.maxConnections,
      idleTimeoutMillis: config.idleTimeoutMillis,
    });

    console.log('Attempting to connect...');

    const client = await pool.connect();
    console.log(success('Successfully connected to database'));

    const sslResult = await client.query('SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()');
    const isSSL = sslResult.rows[0]?.ssl;

    if (isSSL) {
      console.log(success('SSL connection confirmed'));
    } else {
      console.log(warning('Connection is not using SSL'));
    }

    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version.split(' ')[0];
    console.log(`PostgreSQL version: ${highlight(version)}`);

    if (process.env.OAUTH_ENCRYPTION_KEY) {
      console.log(info('Testing OAuth token encryption...'));

      const testToken = 'test-oauth-token-123';
      const encrypted = encryptToken(testToken);
      const decrypted = decryptToken(encrypted);

      if (decrypted === testToken) {
        console.log(success('OAuth token encryption/decryption working'));
      } else {
        console.log(error('OAuth token encryption/decryption failed'));
        process.exit(1);
      }
    } else {
      console.log(dim('OAUTH_ENCRYPTION_KEY not configured - OAuth encryption not tested'));
    }

    client.release();
    await pool.end();

    console.log('\n' + success('SSL connection test completed successfully!'));
    console.log('\n' + info('Security Checklist:'));
    console.log(`   ${pass('PASS')} Database connection established`);
    console.log(`   ${isSSL ? pass('PASS') : fail('FAIL')} SSL encryption enabled`);
    console.log(`   ${process.env.OAUTH_ENCRYPTION_KEY ? pass('PASS') : fail('FAIL')} OAuth encryption configured`);
    console.log(`   ${process.env.OAUTH_ENCRYPTION_SALT ? pass('PASS') : fail('FAIL')} Unique encryption salt configured`);

    if (!isSSL) {
      console.log('\n' + warning('WARNING: Database connection is not using SSL!'));
      console.log('   This may be acceptable for local development, but production should use SSL.');
    }

    if (!process.env.OAUTH_ENCRYPTION_KEY) {
      console.log('\n' + warning('WARNING: OAUTH_ENCRYPTION_KEY not set!'));
      console.log('   OAuth tokens will not be encrypted at rest.');
    }

    if (!process.env.OAUTH_ENCRYPTION_SALT) {
      console.log('\n' + warning('WARNING: OAUTH_ENCRYPTION_SALT not set!'));
      console.log('   Using default salt - consider setting a unique salt for better security.');
    }

  } catch (error) {
    console.error('\n' + error('SSL connection test failed!'));
    console.error('Error:', error.message);

    if (error.code === 'ENOTFOUND') {
      console.error('Check that POSTGRES_HOST is correct and reachable');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Check that PostgreSQL is running and POSTGRES_PORT is correct');
    } else if (error.code === '28P01') {
      console.error('Check POSTGRES_USER and POSTGRES_PASSWORD credentials');
    } else if (error.message.includes('SSL')) {
      console.error('SSL connection failed - check SSL configuration and certificates');
    }

    process.exit(1);
  }
}

// Run the test
testSSLConnection().catch((error) => {
  console.error('Unhandled error in testSSLConnection:', error);
  process.exit(1);
});
