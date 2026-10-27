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
    files: ['src/core/**/*.ts', 'src/meta/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['phaser', 'phaser/*'] }],
      'no-restricted-globals': ['error', 'window', 'document'],
    },
  },
);
