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
import importPlugin from 'eslint-plugin-import';

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
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name="className"] Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
          message:
            'Hardcoded hex colors are not allowed in className — add a named token in src/Index.css instead.',
        },
        {
          selector:
            'JSXAttribute[name.name="className"] TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]',
          message:
            'Hardcoded hex colors are not allowed in className — add a named token in src/Index.css instead.',
        },
        {
          selector:
            'VariableDeclarator[id.name=/[Cc]lass/] Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
          message:
            'Hardcoded hex colors are not allowed in class strings — use Tailwind colors or add a named token in src/Index.css.',
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'Use the shared API client instead of raw fetch().',
        },
      ],
    },
  },
  {
    files: [
      'src/Features/**/*.tsx',
      'src/App/**/*.tsx',
      'src/Shared/*.tsx',
      'src/Shared/Hooks/**',
      'src/Shared/Lib/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              importNames: ['forwardRef'],
              message:
                'Use plain ref props instead of forwardRef outside Shared/ui/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/Features/**/*.{ts,tsx}'],
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/Features/AccessTokens',
              from: './src/Features',
              except: ['./AccessTokens'],
            },
            {
              target: './src/Features/Admin',
              from: './src/Features',
              // Admin/SuperTokens.tsx reuses the AccessTokens feature's API + UI
              // to manage tokens from the admin panel.
              except: [
                './Admin',
                './AccessTokens/Api.ts',
                './AccessTokens/AccessTokenManager.tsx',
              ],
            },
            {
              target: './src/Features/ApiReference',
              from: './src/Features',
              except: ['./ApiReference'],
            },
            {
              target: './src/Features/Changelog',
              from: './src/Features',
              except: ['./Changelog'],
            },
            {
              target: './src/Features/Links',
              from: './src/Features',
              // Owner-transfer flows (Dashboard, CreateLinkDrawer, BulkTransferModal)
              // need the Organization type/list.
              except: [
                './Links',
                './Organizations/Api.ts',
                './Organizations/Types.ts',
              ],
            },
            {
              target: './src/Features/Organizations',
              from: './src/Features',
              // CompactLinkTable/BulkTransferModal/useLinkSelection reuse Links'
              // table + bulk-action UI; OrganizationTokensPage reuses AccessTokens.
              except: [
                './Organizations',
                './Links/Api.ts',
                './Links/BulkLinkActions.tsx',
                './Links/BulkTransferModal.tsx',
                './Links/CreateLinkDrawer.tsx',
                './Links/LinkFilterPanel.tsx',
                './Links/Types.ts',
                './Links/useLinkSelection.ts',
                './AccessTokens/Api.ts',
                './AccessTokens/AccessTokenManager.tsx',
              ],
            },
          ],
        },
      ],
    },
  },
);
