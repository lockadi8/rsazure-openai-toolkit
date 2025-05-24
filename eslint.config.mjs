import globals from "globals";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

// mimic CommonJS variables -- needed for FlatCompat
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname, // Recommended to correctly resolve plugins and configs
    resolvePluginsRelativeTo: __dirname, // Correctly resolve plugins
});

export default [
    // Base configurations
    {
        ignores: [
            "**/node_modules/",
            "**/dist/",
            "**/build/",
            "**/coverage/",
            ".eslintrc.js.old", // Ignore the old config file if renamed
        ],
    },
    js.configs.recommended,
    ...compat.extends("eslint-config-airbnb-base"), // This might apply globally or to specific files based on its own definition

    // Custom global settings, applied to all relevant JS files
    {
        files: ["**/*.js", "**/*.mjs", "**/*.cjs"], // Apply these rules and settings broadly
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "module", // 'module' is default for .js in flat config, but good to be explicit
            globals: {
                ...globals.commonjs,
                ...globals.es6, // es6 includes Atomics and SharedArrayBuffer by default
                ...globals.node,
                // Atomics: 'readonly', // Already in globals.es6
                // SharedArrayBuffer: 'readonly', // Already in globals.es6
            },
        },
        rules: {
            'no-console': 'warn',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-underscore-dangle': ['error', { allow: ['_id', '__dirname', '__filename'] }],
            'consistent-return': 'off',
            'no-param-reassign': ['error', { props: false }],
            'max-len': ['error', { code: 120, ignoreComments: true }],
            
            'import/no-extraneous-dependencies': ['error', { devDependencies: true }], // Already handled by airbnb potentially
            'import/prefer-default-export': 'off', // Already handled by airbnb potentially
            
            'func-names': 'off',
            'prefer-arrow-callback': 'off',
            'object-shorthand': 'off',
            'prefer-template': 'off',
            'prefer-const': 'error',
            'no-var': 'error',
            'no-await-in-loop': 'off',
            'class-methods-use-this': 'off',
            'no-throw-literal': 'error',
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-loop-func': 'error',
            'comma-dangle': ['error', 'always-multiline'],
            'semi': ['error', 'always'],
            'quotes': ['error', 'single'],
            'indent': ['error', 2],
            'linebreak-style': ['error', 'unix'],
            'space-before-function-paren': ['error', {
              anonymous: 'always',
              named: 'never',
              asyncArrow: 'always',
            }],
            'object-curly-spacing': ['error', 'always'],
            'array-bracket-spacing': ['error', 'never'],
            'spaced-comment': ['error', 'always'],
            'complexity': ['warn', 10],
            'max-depth': ['warn', 4],
            'max-nested-callbacks': ['warn', 3],
            'max-params': ['warn', 5],
            'max-statements': ['warn', 20],
            'eqeqeq': ['error', 'always'],
            'no-magic-numbers': ['warn', { 
              ignore: [-1, 0, 1, 2, 10, 100, 1000],
              ignoreArrayIndexes: true,
              enforceConst: true,
            }],
            'no-duplicate-imports': 'error',
            'prefer-destructuring': ['error', {
              array: false,
              object: true,
            }],
        },
    },

    // Overrides for test files
    {
        files: ["**/*.test.js", "**/*.spec.js", "tests/**/*.js"], // Adjusted glob
        languageOptions: {
            globals: {
                ...globals.jest,
            },
        },
        rules: {
            'no-magic-numbers': 'off',
            'max-statements': 'off',
        },
    },

    // Overrides for scripts
    {
        files: ["scripts/**/*.js"],
        rules: {
            'no-console': 'off',
        },
    },

    // Overrides for config files
    {
        files: ["config/**/*.js"], // Original: ['config/**/*.js']
        rules: {
            'no-magic-numbers': 'off',
        },
    }
];
