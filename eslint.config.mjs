import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**', '**/coverage/**'],
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
