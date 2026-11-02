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
  ...typescriptEslint.configs.recommended,
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
      },
    },
    rules: {
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'class-methods-use-this': 'error',
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
    // `no-unassigned-vars` can't see Solid's ref idiom
    files: ['**/*.tsx'],
    rules: {
      'no-unassigned-vars': 'off',
    },
  },
  eslintPrettier,
];
