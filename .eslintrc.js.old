module.exports = {
  env: {
    browser: false,
    commonjs: true,
    es6: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'airbnb-base',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    // Disable some strict rules for development
    'no-console': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-underscore-dangle': ['error', { allow: ['_id', '__dirname', '__filename'] }],
    'consistent-return': 'off',
    'no-param-reassign': ['error', { props: false }],
    'max-len': ['error', { code: 120, ignoreComments: true }],
    
    // Import rules
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'import/prefer-default-export': 'off',
    
    // Function rules
    'func-names': 'off',
    'prefer-arrow-callback': 'off',
    
    // Object rules
    'object-shorthand': 'off',
    
    // String rules
    'prefer-template': 'off',
    
    // Variable rules
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Async rules
    'no-await-in-loop': 'off',
    
    // Class rules
    'class-methods-use-this': 'off',
    
    // Error handling
    'no-throw-literal': 'error',
    
    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    
    // Performance
    'no-loop-func': 'error',
    
    // Style
    'comma-dangle': ['error', 'always-multiline'],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    
    // Spacing
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always',
    }],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    
    // Comments
    'spaced-comment': ['error', 'always'],
    
    // Complexity
    'complexity': ['warn', 10],
    'max-depth': ['warn', 4],
    'max-nested-callbacks': ['warn', 3],
    'max-params': ['warn', 5],
    'max-statements': ['warn', 20],
    
    // Best practices
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
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-magic-numbers': 'off',
        'max-statements': 'off',
      },
    },
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['config/**/*.js'],
      rules: {
        'no-magic-numbers': 'off',
      },
    },
  ],
};
