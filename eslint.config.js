import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'backend/pb_data', 'backend/pb_public', 'backend/pb_migrations'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // src/core must stay engine-free and deterministic.
      'no-restricted-imports': 'off',
    },
  },
  {
    // PocketBase JS hooks: run in PocketBase's own JS VM, which provides these globals and
    // shares code between handlers only through require().
    files: ['backend/pb_hooks/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        routerAdd: 'readonly',
        $app: 'readonly',
        $os: 'readonly',
        $http: 'readonly',
        Record: 'readonly',
        require: 'readonly',
        module: 'writable',
        __hooks: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      // The JS VM may not support catch clauses without a binding; keep `catch (err)`.
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
  {
    files: ['tests/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly' } },
  },
  {
    files: ['src/core/**/*.ts', 'src/meta/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['phaser', 'phaser/*'] }],
      'no-restricted-globals': ['error', 'window', 'document'],
    },
  },
);
