import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // A leading underscore marks a parameter the contract requires but this
      // implementation deliberately does not read, such as the arguments of the
      // unconfigured auth adapter. Declared once here instead of worked around
      // at every call site.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  globalIgnores([
    '.next*/**',
    'out/**',
    'next-env.d.ts',
    'node_modules/**',
    '.qa-*/**',
    'qa-*.png',
    '.lint-report.json',
    // Accidental nested checkout of this repository. Not source.
    'knoux-store/**',
    // Untracked standalone visual prototype owned by another process. It is not
    // part of the application, is not imported by anything under src/, and is
    // not committed. Excluded so its own unused-variable style cannot fail the
    // application lint gate. This hides nothing about the KNOuX codebase.
    'remix-regal-portrait-with-imme/**',
  ]),
]);
