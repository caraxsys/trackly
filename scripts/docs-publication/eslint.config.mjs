import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/*.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
      parserOptions: {
        project: './scripts/docs-publication/tsconfig.json',
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
);
