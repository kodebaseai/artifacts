import fs from "node:fs/promises";
import path from "node:path";

import { getArtifactIdFromPath } from "@kodebase/core";

import { ArtifactError } from "./error-formatting.js";
import { NotInKodebaseProjectError } from "./errors.js";

const ARTIFACTS_DIR = ".kodebase/artifacts";
const KODEBASE_DIR = ".kodebase";

/**
 * Context information for the current working environment.
 */
export interface ContextInfo {
  /** Context level: root, initiative, milestone, or issue */
  level: "root" | "initiative" | "milestone" | "issue";
  /** Current artifact ID (if in artifact context) */
  currentId?: string;
  /** Parent artifact ID */
  parentId?: string;
  /** Full path to root (e.g., ['A', 'A.1', 'A.1.3']) */
  ancestorIds: string[];
  /** Git branch name (if detected) */
  branchName?: string;
}

/**
 * Service for detecting and managing artifact context.
 * Provides methods to detect context from directory paths, git branches,
 * and validate Kodebase project structure.
 */
export class ContextService {
  private readonly baseDir: string;

  constructor(baseDir: string = process.cwd()) {
    this.baseDir = baseDir;
  }

  /**
   * Detects artifact context from the current or target directory path.
   * Traverses up from the target path to find artifact context.
   *
   * @param targetPath - Path to detect context from (defaults to current directory)
   * @returns Context information
   * @throws NotInKodebaseProjectError if not in a Kodebase project
   *
   * @example
   * // In .kodebase/artifacts/A.core/
   * const ctx = await service.detectContext()
   * // { level: 'initiative', currentId: 'A', parentId: undefined, ancestorIds: ['A'] }
   *
   * // In .kodebase/artifacts/A.core/A.1.types/
   * const ctx = await service.detectContext()
   * // { level: 'milestone', currentId: 'A.1', parentId: 'A', ancestorIds: ['A', 'A.1'] }
   */
  async detectContext(targetPath?: string): Promise<ContextInfo> {
    const startPath = targetPath
      ? path.resolve(this.baseDir, targetPath)
      : this.baseDir;

    // Ensure we're in a Kodebase project
    if (!(await this.isKodebaseProject())) {
      throw new NotInKodebaseProjectError(this.baseDir);
    }

    const artifactsRoot = path.join(this.baseDir, ARTIFACTS_DIR);

    // Check if we're at or above the artifacts root
    const relativePath = path.relative(artifactsRoot, startPath);
    if (relativePath.startsWith("..")) {
      return {
        level: "root",
        ancestorIds: [],
      };
    }

    // We're inside the artifacts directory - detect context from path
    return this.detectFromPath(startPath);
  }

  /**
   * Detects artifact context from a git branch name.
   * Parses Kodebase branch naming conventions.
   *
   * Supported patterns:
   * - `add/A.1.3` → context for A.1.3
   * - `A.1.3` → context for A.1.3 (implementation branch)
   * - `complete/A.1` → context for A.1
   *
   * @param branchName - Git branch name to parse
   * @returns Context information
   * @throws ArtifactError if branch name doesn't match Kodebase conventions
   *
   * @example
   * const ctx = await service.detectFromBranch('add/A.1.3')
   * // { level: 'issue', currentId: 'A.1.3', parentId: 'A.1', ancestorIds: ['A', 'A.1', 'A.1.3'], branchName: 'add/A.1.3' }
   */
  async detectFromBranch(branchName: string): Promise<ContextInfo> {
    // Parse branch name patterns: add/*, complete/*, or direct artifact ID
    const addMatch = branchName.match(/^add\/(.+)$/);
    const completeMatch = branchName.match(/^complete\/(.+)$/);

    let artifactId: string;
    if (addMatch) {
      artifactId = addMatch[1] ?? "";
    } else if (completeMatch) {
      artifactId = completeMatch[1] ?? "";
    } else {
      // Assume direct artifact ID (implementation branch)
      artifactId = branchName;
    }

    // Validate artifact ID format
    const idPattern = /^[A-Z]+(?:\.\d+)*$/;
    if (!idPattern.test(artifactId)) {
      throw new ArtifactError({
        code: "INVALID_BRANCH_NAME",
        message: `Branch name "${branchName}" does not match Kodebase conventions. Expected patterns: add/A.1.3, A.1.3, or complete/A.1`,
      });
    }

    // Determine level and build context
    const segments = artifactId.split(".");
    const ancestorIds = segments.map((_, index) =>
      segments.slice(0, index + 1).join("."),
    );

    let level: "initiative" | "milestone" | "issue";
    let parentId: string | undefined;

    if (segments.length === 1) {
      level = "initiative";
      parentId = undefined;
    } else if (segments.length === 2) {
      level = "milestone";
      parentId = segments[0];
    } else {
      level = "issue";
      parentId = segments.slice(0, 2).join(".");
    }

    return {
      level,
      currentId: artifactId,
      parentId,
      ancestorIds,
      branchName,
    };
  }

  /**
   * Detects artifact context from a specific file or directory path.
   * Analyzes the path structure to determine artifact level.
   *
   * @param filePath - File or directory path to analyze
   * @returns Context information
   * @throws NotInKodebaseProjectError if path is not within artifacts directory
   *
   * @example
   * const ctx = await service.detectFromPath('.kodebase/artifacts/A.core/A.1.types/A.1.1.schema.yml')
   * // { level: 'issue', currentId: 'A.1.1', parentId: 'A.1', ancestorIds: ['A', 'A.1', 'A.1.1'] }
   */
  async detectFromPath(filePath: string): Promise<ContextInfo> {
    const absolutePath = path.resolve(this.baseDir, filePath);
    const artifactsRoot = path.join(this.baseDir, ARTIFACTS_DIR);

    // Ensure path is within artifacts directory
    const relativePath = path.relative(artifactsRoot, absolutePath);
    if (relativePath.startsWith("..")) {
      throw new NotInKodebaseProjectError(this.baseDir);
    }

    // Check if path is a file and extract artifact ID from filename
    let stats: Awaited<ReturnType<typeof fs.stat>> | null;
    try {
      stats = await fs.stat(absolutePath);
    } catch {
      // Path doesn't exist, treat as directory
      stats = null;
    }

    if (stats?.isFile()) {
      const artifactId = getArtifactIdFromPath(absolutePath);
      if (artifactId) {
        return this.buildContextFromId(artifactId);
      }
    }

    // Parse directory structure
    // Examples:
    // A.core/ → initiative
    // A.core/A.1.types/ → milestone
    // A.core/A.1.types/ (with A.1.1.*.yml files) → could be milestone or issue context

    const pathSegments = relativePath.split(path.sep).filter(Boolean);

    // Root artifacts directory
    if (pathSegments.length === 0) {
      return {
        level: "root",
        ancestorIds: [],
      };
    }

    // Extract artifact IDs from directory names
    // Format: A.slug, A.1.slug, etc.
    const dirIds: string[] = [];
    for (const segment of pathSegments) {
      const idMatch = segment.match(/^([A-Z]+(?:\.\d+)*)\./);
      if (idMatch) {
        dirIds.push(idMatch[1] ?? "");
      }
    }

    if (dirIds.length === 0) {
      // No artifact IDs found in path
      return {
        level: "root",
        ancestorIds: [],
      };
    }

    // Use the deepest artifact ID found
    const currentId = dirIds[dirIds.length - 1] ?? "";
    return this.buildContextFromId(currentId);
  }

  /**
   * Checks if the target path is within a valid Kodebase context.
   *
   * @param targetPath - Path to validate (defaults to current directory)
   * @returns True if path is within .kodebase/artifacts/
   */
  async isValidContext(targetPath?: string): Promise<boolean> {
    try {
      const startPath = targetPath
        ? path.resolve(this.baseDir, targetPath)
        : this.baseDir;

      if (!(await this.isKodebaseProject())) {
        return false;
      }

      const artifactsRoot = path.join(this.baseDir, ARTIFACTS_DIR);
      const relativePath = path.relative(artifactsRoot, startPath);

      // Valid if path is within artifacts directory
      return !relativePath.startsWith("..");
    } catch {
      return false;
    }
  }

  /**
   * Requires a minimum context level. Throws if current context is insufficient.
   *
   * @param level - Required minimum level
   * @returns Context information if requirement met
   * @throws ArtifactError if context level is insufficient
   *
   * @example
   * // Ensure we're in at least a milestone context
   * const ctx = await service.requireContext('milestone')
   * // Throws if in root or initiative-only context
   */
  async requireContext(
    level: "initiative" | "milestone" | "issue",
  ): Promise<ContextInfo> {
    const context = await this.detectContext();

    const levelHierarchy = ["root", "initiative", "milestone", "issue"];
    const requiredIndex = levelHierarchy.indexOf(level);
    const currentIndex = levelHierarchy.indexOf(context.level);

    if (currentIndex < requiredIndex) {
      throw new ArtifactError({
        code: "INSUFFICIENT_CONTEXT",
        message: `Insufficient context. Required: ${level}, but currently in: ${context.level}`,
      });
    }

    return context;
  }

  /**
   * Ensures the .kodebase/artifacts/ directory structure exists.
   * Creates directories if missing (idempotent).
   *
   * @example
   * await service.ensureLayout()
   * // Creates .kodebase/artifacts/ if it doesn't exist
   */
  async ensureLayout(): Promise<void> {
    const artifactsPath = path.join(this.baseDir, ARTIFACTS_DIR);
    await fs.mkdir(artifactsPath, { recursive: true });
  }

  /**
   * Checks if the base directory is a Kodebase project.
   * A Kodebase project must have a .kodebase/ directory.
   *
   * @returns True if .kodebase/ directory exists
   *
   * @example
   * if (await service.isKodebaseProject()) {
   *   // Safe to perform Kodebase operations
   * }
   */
  async isKodebaseProject(): Promise<boolean> {
    const kodebasePath = path.join(this.baseDir, KODEBASE_DIR);
    try {
      const stats = await fs.stat(kodebasePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Builds context information from an artifact ID.
   * Helper method for constructing ContextInfo from parsed ID.
   */
  private buildContextFromId(artifactId: string): ContextInfo {
    const segments = artifactId.split(".");
    const ancestorIds = segments.map((_, index) =>
      segments.slice(0, index + 1).join("."),
    );

    let level: "initiative" | "milestone" | "issue";
    let parentId: string | undefined;

    if (segments.length === 1) {
      level = "initiative";
      parentId = undefined;
    } else if (segments.length === 2) {
      level = "milestone";
      parentId = segments[0];
    } else {
      level = "issue";
      parentId = segments.slice(0, 2).join(".");
    }

    return {
      level,
      currentId: artifactId,
      parentId,
      ancestorIds,
    };
  }
}
