/**
 * Test utilities for @kodebase/artifacts
 *
 * This module exports all test utilities for convenient importing.
 *
 * @example
 * ```typescript
 * import {
 *   setupMockFs,
 *   createTestArtifact,
 *   createTempDir,
 * } from '../test/utils/index.js';
 * ```
 */

export {
  createMockDirectory,
  DEFAULT_TEST_BASE_DIR,
  getMockFsStructure,
  listMockDirectory,
  mockFileExists,
  readMockFile,
  resetMockFs,
  setupMockFs,
  writeMockFile,
} from "./filesystem-mock.js";

export {
  createTestArtifact,
  FIXTURES,
  loadArtifactFixture,
  loadArtifactFixtures,
  loadArtifactTree,
  loadFixtureFile,
} from "./fixture-loader.js";

export {
  cleanupAllTempDirs,
  cleanupTempDir,
  createTempDir,
  createTempStructure,
  getActiveTempDirs,
  withTempDir,
  withTempDirSync,
} from "./temp-directory.js";
