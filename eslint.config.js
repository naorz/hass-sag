import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      prettier: prettier,
      import: importPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-console': 'off',
      // Named exports only
      'import/no-default-export': 'error',
      // Avoid import * as
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportNamespaceSpecifier',
          message: 'Avoid wildcard imports (import * as). Use named imports instead.',
        },
      ],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      'import/no-useless-path-segments': [
        'error',
        {
          noUselessIndex: true,
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/index', '**/index.ts', '**/main', '**/main.ts'],
              message: 'Avoid importing from entry points (index/main). Import the specific file instead.',
            },
            {
              regex: '^\\./?$',
              message: 'Avoid importing from the directory index (.). Import the specific file instead.',
            },
            {
              group: ['**/src/utils*', '**/src/menu*', '**/src/types*'],
              message: 'Use @sag/ aliases for core modules (e.g., @sag/utils).',
            },
            {
              group: ['../utils*', '../../utils*', '../menu*', '../../menu*', '../types*', '../../types*'],
              message: 'Use @sag/ aliases for core modules instead of relative paths.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  eslintConfigPrettier,
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'eslint.config.js',
      'commitlint.config.js',
      '.husky/**',
      '.vscode/**',
      'setup/**',
    ],
  }
);
