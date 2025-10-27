/**
 * Event system utilities for Kodebase
 *
 * This module provides utilities for managing events in the cascade system:
 * - Event identity generation and validation
 * - Correlation ID tracking
 * - Event ordering and validation
 * - Event building with automatic identity fields
 */

export * from './identity';
export * from './correlation';
export * from './ordering';
export * from './builder';
