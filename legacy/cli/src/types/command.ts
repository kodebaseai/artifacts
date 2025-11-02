/**
 * Command Types for CLI Components
 */

import type { ArtifactType } from '@kodebase/core';

export interface CreateCommandProps {
  /** Optional parent ID - determines artifact type */
  parentId?: string;
  /** Idea to be generated - will be used for LLM generation in the future */
  idea?: string;
  /** Enable verbose output and error details */
  verbose?: boolean;
  /** Launch interactive wizard mode */
  wizard?: boolean;
  /** Submit the artifact for validation and create a draft PR */
  submit?: boolean;
}

export interface CreateResult {
  /** Type of artifact created */
  type: ArtifactType;
  /** Path to the created file */
  filePath: string;
  /** Generated artifact ID */
  id: string;
}

export interface StatusCommandProps {
  /** Artifact ID to display status for */
  artifactId: string;
  /** Output format - default is formatted, --json outputs JSON */
  format?: 'formatted' | 'json';
  /** Enable verbose output and error details */
  verbose?: boolean;
  /** Check parent blocking status and show warnings */
  checkParent?: boolean;
  /** Enable experimental features (deps, cascade preview) */
  experimental?: boolean;
}

export interface ListCommandProps {
  /** Filtering and display options */
  options?: {
    type?: string;
    status?: string;
    assignee?: string;
    parent?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
  };
}

export interface StartCommandProps {
  /** Artifact ID to start work on (e.g., 'A.1.5') */
  artifactId: string;
  /** Enable verbose output and error details */
  verbose?: boolean;
}

export interface ReadyCommandProps {
  /** Artifact ID to transition to ready status (e.g., 'A.1.5') */
  artifactId: string;
  /** Enable verbose output and error details */
  verbose?: boolean;
}

export interface TutorialCommandProps {
  /** Enable verbose output and error details */
  verbose?: boolean;
}
