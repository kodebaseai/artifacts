/**
 * Validation utilities for Kodebase
 *
 * This module provides validation utilities for the cascade system:
 * - State transition validation
 * - Dependency validation
 * - Event ordering validation
 * - Artifact-based state transition helpers
 */

// Export dependency validation
export * from './dependencies';

// Export artifact-based state helpers (primary API)
export * from './state-helpers';

// Export core state machine functions with renamed exports to avoid conflicts
export {
  canTransition as canTransitionCore,
  getCurrentState,
  getValidTransitions as getValidTransitionsCore,
  isTerminalState,
  StateTransitionError,
  validateEventOrder,
} from './state-machine';
