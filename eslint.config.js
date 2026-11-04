import globals from 'globals';

import eslintImport from 'eslint-plugin-import-x';
import eslintJs from '@eslint/js';
import eslintPrettier from 'eslint-config-prettier/flat';
import eslintSolidTs from 'eslint-plugin-solid/configs/typescript';
import typescriptEslint from 'typescript-eslint';

export default [
  {
    ignores: ['**/node_modules/', '**/dist/'],
  },
  eslintJs.configs.recommended,
  ...typescriptEslint.configs.recommendedTypeChecked,
  eslintImport.flatConfigs.typescript,
  eslintSolidTs,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      // node:test's describe/it/test return promises the runner tracks itself
      '@typescript-eslint/no-floating-promises': [
        'error',
        { allowForKnownSafeCalls: [{ from: 'package', package: 'node:test', name: ['describe', 'it', 'test'] }] },
      ],
      'class-methods-use-this': 'error',
      'dot-notation': 'off',
      '@typescript-eslint/dot-notation': 'error',
      '@typescript-eslint/no-unnecessary-condition': [
        'error',
        { allowConstantLoopConditions: 'only-allowed-literals' },
      ],
      eqeqeq: 'error',
      'import-x/extensions': ['error', 'ignorePackages', { ts: 'always', tsx: 'always', js: 'always', jsx: 'always' }],
      'no-console': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-nested-ternary': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForInStatement',
          message:
            'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
        },
        {
          selector: 'WithStatement',
          message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
        },
      ],
      'no-useless-rename': 'error',
      'no-warning-comments': 'error',
      'object-shorthand': ['error', 'properties'],
      'prefer-const': 'error',
      'spaced-comment': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'client/testing/**', 'core/fixtures/**'],
    rules: {
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    files: ['*.js', '*.config.ts'],
    ...typescriptEslint.configs.disableTypeChecked,
  },
  {
    // `no-unassigned-vars` can't see Solid's ref idiom
    files: ['**/*.tsx'],
    rules: {
      'no-unassigned-vars': 'off',
    },
  },
  eslintPrettier,
];
