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
        'no-unused-vars': [
            'error', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }
        ],
        '@typescript-eslint/no-unused-vars': [
            'error', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }
        ],
        '@typescript-eslint/camelcase': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off'
    }
};
