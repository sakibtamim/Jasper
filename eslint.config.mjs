import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
    { files: ["**/*.{js,mjs,cjs,ts}"] },
    { ignores: ["**/dist/**", "**/node_modules/**", "apps/web/public/**"] },
    { languageOptions: { globals: globals.node } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            // Explicitly forbid console usage in favor of logger
            "no-console": "error"
        }
    },
    {
        files: ["src/core/logger.ts"],
        rules: {
            "no-console": "off"
        }
    },
    {
        files: ["apps/web/**/*.{js,mjs,cjs,ts,tsx}"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node // Keep node globals for config files if mixed, or remove if strictly browser
            }
        },
        rules: {
            "no-console": "warn", // Allow console in web app (warn instead of error)
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
        }
    }
];
