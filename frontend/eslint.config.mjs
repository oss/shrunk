import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import { defineConfig } from 'eslint/config';
import checkFile from 'eslint-plugin-check-file';

export default defineConfig(
  { ignores: ['src/ext/**', 'node_modules/**', 'dist/**', '.parcel-cache/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  reactHooksPlugin.configs['recommended-latest'],
  jsxA11yPlugin.flatConfigs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      'unused-imports': unusedImportsPlugin,
      prettier: prettierPlugin,
      'check-file': checkFile,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...prettierConfig.rules,
      'prettier/prettier': 'warn',
      'react/forbid-dom-props': [
        2,
        {
          forbid: [{ propName: 'style', message: 'Use Tailwind CSS instead.' }],
        },
      ],
      'react/require-default-props': 'off',
      'react/prop-types': 'off',
      'react/destructuring-assignment': 'off',
      'react/no-access-state-in-setstate': 'off',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-underscore-dangle': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-nested-ternary': 'off',
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/use*.{ts,tsx}': 'CAMEL_CASE',
          '**/!(ui)/!([vV]ite*|use*).{ts,tsx}': 'PASCAL_CASE',
          '**/ui/*.{ts,tsx}': 'KEBAB_CASE',
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
      'check-file/folder-naming-convention': [
        'error',
        {
          'src/**/!(ui)/': 'PASCAL_CASE',
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['src/Api/Client.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            'Use the shared API client instead of calling fetch() directly.',
        },
      ],
    },
  },
);
