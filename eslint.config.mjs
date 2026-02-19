import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

import globals from 'globals';

export default tseslint.config(
    {
        ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**', '**/coverage/**', '**/.next/**', 'dist/', '**/dist/', '**/public/**'],
    },
    {
        files: ['apps/web/**', 'apps/website/**', 'packages/ui/**', 'packages/elements/**'],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },
    {
        files: [
            'apps/bot/**',
            'scripts/**',
            '**/*.config.mjs',
            '**/*.config.js',
            '**/*.config.cjs',
        ],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        files: ['scripts/**/*.js', '**/*.config.js', '**/*.config.cjs', '**/*.config.mjs'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
    {
        rules: {
            //'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    },
);
