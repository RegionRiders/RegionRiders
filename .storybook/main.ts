import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { StorybookConfig } from '@storybook/nextjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig = {
  core: {
    disableWhatsNewNotifications: true,
    disableTelemetry: true,
    enableCrashReports: false,
  },
  stories: ['../components/**/*.(stories|story).@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-themes'],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },

  env: (config) => ({
    ...config,
    ...Object.keys(process.env)
      .filter((key) => key.startsWith('NEXT_PUBLIC_'))
      .reduce(
        (acc, key) => ({
          ...acc,
          [key]: process.env[key],
        }),
        {}
      ),
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:6006',
  }),

  webpackFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      stream: false,
      path: false,
      worker_threads: false,
      'node:stream': false,
      'node:worker_threads': false,
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      '@/lib/logger$': resolve(__dirname, '../lib/logger/client.ts'),
      '@/lib/logger/logger.server': resolve(__dirname, '../lib/logger/logger.client.ts'),
    };

    return config;
  },
};

export default config;
