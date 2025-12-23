// Test environment setup - hardcoded credentials for testing only
// These values differ from production and are safe to commit
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_DB = 'regionriders';
process.env.POSTGRES_USER = 'regionriders_user';
process.env.POSTGRES_PASSWORD = 'regionriders_pass';
process.env.OAUTH_ENCRYPTION_KEY = 'test-encryption-key-for-jest-only-not-for-production';
process.env.OAUTH_ENCRYPTION_SALT = 'test-salt-for-jest-only';
