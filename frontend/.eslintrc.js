// eslint-disable-next-line no-undef
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        'quotes': ['error', 'single'],
        'jsx-quotes': ['error', 'prefer-single'],
        'curly': ['error', 'all'],
        'comma-dangle': ['error', 'always-multiline'],
        'no-unused-vars': [
            'error', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' },
        ],
        '@typescript-eslint/no-unused-vars': [
            'error', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' },
        ],
        '@typescript-eslint/camelcase': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
    },
};
