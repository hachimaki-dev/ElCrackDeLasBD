module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  rules: {
    // Sin 'any' salvo justificación explícita (ENGINEERING_STANDARDS.md §4)
    '@typescript-eslint/no-explicit-any': 'error',

    // Nombres descriptivos — desalentar variables de una letra excepto en lambdas
    'id-length': ['warn', { min: 2, exceptions: ['_', 'i', 'j', 'k', 'x', 'y'] }],

    // Funciones explícitas sobre tipo de retorno
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      },
    ],

    // No unused vars (pero permitir _ como prefijo para vars ignoradas intencionalmente)
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],

    // Preferir const sobre let
    'prefer-const': 'error',

    // No var
    'no-var': 'error',

    // No console.log sueltos en producción (usar el logger de VS Code)
    'no-console': 'warn',
  },
  ignorePatterns: ['out/', 'node_modules/', '*.js'],
};
