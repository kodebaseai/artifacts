/**
 * Shared test setup utilities for @kodebase/artifacts
 *
 * This module exports all test setup helpers for convenient importing.
 *
 * @example
 * ```typescript
 * import {
 *   createTestContext,
 *   expectArtifactValid,
 * } from '../test/setup/index.js';
 * ```
 */

export {
  createTestContext,
  createTestHierarchy,
  expectArtifactType,
  expectArtifactValid,
  type TestContext,
  waitFor,
} from "./test-helpers.js";
