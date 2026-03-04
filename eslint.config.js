import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

/** Shared no-unused-vars config — allows _-prefixed names in all positions. */
const unusedVarsRule = [
  'error',
  {
    argsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
    destructuredArrayIgnorePattern: '^_',
  },
];

export default [
  // Ignore build artifacts and dependencies
  {
    ignores: [
      '**/node_modules/**',
      '**/.meteor/**',
      '**/build/**',
      '**/_build/**',
      '**/public/build-chunks/**',
    ],
  },

  // Base config for all JS files
  js.configs.recommended,

  // Meteor package files (server-only, uses Meteor globals)
  {
    files: ['packages/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        Meteor: 'readonly',
        Package: 'readonly',
        Npm: 'readonly',
        Tinytest: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': unusedVarsRule,
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // React / JSX files in the test app
  {
    files: ['apps/**/*.jsx'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        Meteor: 'readonly',
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': unusedVarsRule,
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Server-side app files
  {
    files: ['apps/**/server/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        Meteor: 'readonly',
        Npm: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': unusedVarsRule,
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Test client (Node.js ESM)
  {
    files: ['test-client/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': unusedVarsRule,
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Config files (CJS) — excludes eslint.config.js which is ESM
  {
    files: ['apps/**/*.config.{js,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': unusedVarsRule,
    },
  },

  // Prettier must be last to disable conflicting rules
  prettierConfig,
];
