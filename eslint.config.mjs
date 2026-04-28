import mantine from 'eslint-config-mantine';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// @ts-check
export default defineConfig(
  tseslint.configs.recommended,
  ...mantine,
  {
    settings: {
      react: {
        version: '19.2.4',
      },
    },
  },
  {
    ignores: [
      '**/*.{mjs,cjs,js,d.ts,d.mts}',
      '.next',
      'coverage/**',
      'public/data/regions/tiles/**',
    ],
  },
  {
    files: ['**/*.{story.tsx,ts}'],
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: process.cwd(),
        project: ['./tsconfig.json'],
      },
    },
  }
);
