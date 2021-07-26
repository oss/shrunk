// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: ['airbnb-typescript', 'prettier'],
  rules: {
    'no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-underscore-dangle': 'off',
    // 'react/no-access-state-in-setstate': 'off',
    'react/prop-types': 'off',
    'react/destructuring-assignment': 'off',
    'prettier/prettier': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-nested-ternary': 'off',
    'no-plusplus': [
      "error", 
      { "allowForLoopAfterthoughts": true }
    ],
    'react/no-access-state-in-setstate': 'off',
  },
};
