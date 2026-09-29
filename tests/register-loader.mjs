/**
 * Registers the `@/…` alias resolver for the test runner.
 *
 * Kept in its own file because `--import` evaluates the module before the
 * runner starts, and `module.register` must run in that window.
 */

import { register } from 'node:module';

register('./alias-loader.mjs', import.meta.url);
