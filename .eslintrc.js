module.exports = {
    root: true,
    extends: ['plugin:@typescript-eslint/recommended'],
    plugins: ['unused-imports', 'simple-import-sort'],
    parser: 'vue-eslint-parser', // https://stackoverflow.com/questions/66597732/eslint-vue-3-parsing-error-expected-eslint
    parserOptions: {
        parser: '@typescript-eslint/parser',
    },
    rules: {
        eqeqeq: ['error', 'always'],
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
            'error',
            { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
        ],
        'unused-imports/no-unused-imports': 'error',
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        '@typescript-eslint/no-explicit-any': 'off',
    },
};
