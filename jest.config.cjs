const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  roots: [
    '<rootDir>/app',
    '<rootDir>/components',
    '<rootDir>/lib',
    '<rootDir>/hooks',
    '<rootDir>/test-utils',
    '<rootDir>/tools',
    '<rootDir>/types',
  ],
  setupFiles: ['<rootDir>/jest.polyfills.cjs', '<rootDir>/test-utils/setup-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  globalTeardown: '<rootDir>/jest.teardown.cjs',
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '<rootDir>/public/data/regions/tiles/',
    // Skip integration tests that require database when DB_TEST_SKIP env is set
    ...(process.env.DB_TEST_SKIP === 'true'
      ? [
          '<rootDir>/lib/db/operations/users.test.ts',
          '<rootDir>/lib/db/operations/activities.test.ts',
          '<rootDir>/lib/db/config/client.test.ts',
          '<rootDir>/lib/db/config/drizzle.test.ts',
        ]
      : []),
  ],
  modulePathIgnorePatterns: ['<rootDir>/public/data/regions/tiles/'],
  watchPathIgnorePatterns: ['<rootDir>/public/data/regions/tiles/'],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'tools/**/*.{js,jsx,ts,tsx}',
    '!**/*.test.{js,jsx,ts,tsx}',
    '!**/*.spec.{js,jsx,ts,tsx}',
    '!**/*.story.{js,jsx,ts,tsx}',
    '!**/*.stories.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
  ],
};

module.exports = createJestConfig(customJestConfig);
