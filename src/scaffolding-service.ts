import { execSync } from "node:child_process";
import type {
  TEstimationSize,
  TInitiative,
  TIssue,
  TMilestone,
  TPriority,
} from "@kodebase/core";
import {
  CEstimationSize,
  CPriority,
  scaffoldInitiative,
  scaffoldIssue,
  scaffoldMilestone,
} from "@kodebase/core";
import type { IdAllocationService } from "./id-allocation-service.js";
import { generateSlug } from "./template-utils.js";

/**
 * Base metadata for scaffolding any artifact type.
 *
 * Contains common fields like assignee, priority, estimation, and notes
 * that apply to all artifact types (initiatives, milestones, issues).
 */
export interface ScaffoldMetadata {
  /** Optional assignee name or email */
  assignee?: string;

  /** Priority level (low, medium, high, critical) */
  priority?: TPriority;

  /** Size estimation (XS, S, M, L, XL) */
  estimation?: TEstimationSize;

  /** Optional free-form notes */
  notes?: string;
}

/**
 * Metadata for scaffolding an initiative.
 *
 * Extends base metadata with initiative-specific fields: vision statement,
 * scope boundaries (in/out), and success criteria.
 *
 * @see {@link ScaffoldingService.scaffoldInitiative}
 */
export interface ScaffoldInitiativeMetadata extends ScaffoldMetadata {
  /** Vision statement explaining the initiative's purpose and goals */
  vision?: string;

  /** List of items explicitly included in scope */
  scopeIn?: string[];

  /** List of items explicitly excluded from scope */
  scopeOut?: string[];

  /** List of measurable success criteria */
  successCriteria?: string[];
}

/**
 * Metadata for scaffolding a milestone.
 *
 * Extends base metadata with milestone-specific fields: summary and deliverables.
 *
 * @see {@link ScaffoldingService.scaffoldMilestone}
 */
export interface ScaffoldMilestoneMetadata extends ScaffoldMetadata {
  /** Brief summary of the milestone's purpose */
  summary?: string;

  /** List of expected deliverables for this milestone */
  deliverables?: string[];
}

/**
 * Metadata for scaffolding an issue.
 *
 * Extends base metadata with issue-specific fields: summary and acceptance criteria.
 *
 * @see {@link ScaffoldingService.scaffoldIssue}
 */
export interface ScaffoldIssueMetadata extends ScaffoldMetadata {
  /** Brief summary of the issue */
  summary?: string;

  /** List of testable acceptance criteria */
  acceptanceCriteria?: string[];
}

/**
 * Result returned from scaffolding operations.
 *
 * Contains the allocated ID, populated artifact object, and generated slug.
 * This result can be passed directly to ArtifactService.createArtifact().
 *
 * @template T - The artifact type (TInitiative, TMilestone, or TIssue)
 *
 * @example
 * ```ts
 * const result: ScaffoldResult<TInitiative> = await service.scaffoldInitiative("My Initiative");
 * await artifactService.createArtifact({ id: result.id, artifact: result.artifact, slug: result.slug });
 * ```
 *
 * @see {@link ScaffoldingService.scaffoldInitiative}
 * @see {@link ScaffoldingService.scaffoldMilestone}
 * @see {@link ScaffoldingService.scaffoldIssue}
 */
export interface ScaffoldResult<T> {
  /** The allocated artifact ID (e.g., "A", "A.1", "A.1.1") */
  id: string;

  /** The populated artifact object ready for creation */
  artifact: T;

  /** The URL-friendly slug generated from the title */
  slug: string;
}

/**
 * High-level service for scaffolding artifacts with auto-allocated IDs,
 * generated slugs, and git-based actor detection.
 *
 * Orchestrates IdAllocationService, template utilities, and scaffold functions
 * to provide a unified API for creating artifacts.
 *
 * @example
 * ```ts
 * const idService = new IdAllocationService("/path/.kodebase/artifacts");
 * const service = new ScaffoldingService(idService);
 *
 * const { id, artifact, slug } = await service.scaffoldInitiative("Core Package", {
 *   vision: "Build core package",
 *   scopeIn: ["Types", "Schemas"],
 *   scopeOut: ["CLI"],
 *   successCriteria: ["Package published"]
 * });
 *
 * await artifactService.createArtifact({ id, artifact, slug });
 * ```
 *
 * @see {@link IdAllocationService} for ID allocation details
 */
export class ScaffoldingService {
  /**
   * Creates a new scaffolding service.
   *
   * @param idAllocationService - Service used for allocating artifact IDs
   */
  constructor(
    private readonly idAllocationService: IdAllocationService,
    // private readonly baseDir: string = path.join(
    //   process.cwd(),
    //   ".kodebase",
    //   "artifacts",
    // ),
  ) {}

  /**
   * Scaffold a new initiative with auto-allocated ID and generated slug.
   *
   * Automatically allocates the next available initiative ID, generates a URL-friendly
   * slug from the title, and detects the git actor for the createdBy field.
   * Provides sensible defaults for all required fields.
   *
   * @param title - Initiative title (e.g., "Core Package Development")
   * @param metadata - Optional metadata (vision, scope, success criteria, etc.)
   * @returns Scaffold result with ID, artifact object, and slug
   *
   * @example
   * ```ts
   * const service = new ScaffoldingService(idAllocationService);
   *
   * // Minimal usage with defaults
   * const result = await service.scaffoldInitiative("Build Core Package");
   * console.log(result.id); // "A" (or next available ID)
   * console.log(result.slug); // "build-core-package"
   *
   * // With full metadata
   * const result2 = await service.scaffoldInitiative("Improve Performance", {
   *   vision: "Reduce page load time by 50%",
   *   scopeIn: ["Code splitting", "Image optimization", "Caching"],
   *   scopeOut: ["UI redesign", "New features"],
   *   successCriteria: ["Load time < 1s", "Lighthouse score > 95"],
   *   assignee: "alice@example.com",
   *   priority: "high",
   *   estimation: "L"
   * });
   * ```
   *
   * @see {@link IdAllocationService.allocateNextInitiativeId}
   * @see {@link ScaffoldInitiativeMetadata}
   */
  async scaffoldInitiative(
    title: string,
    metadata?: ScaffoldInitiativeMetadata,
  ): Promise<ScaffoldResult<TInitiative>> {
    const id = await this.idAllocationService.allocateNextInitiativeId();
    const slug = generateSlug(title);
    const actor = this.getGitActor();

    const artifact = scaffoldInitiative({
      title,
      createdBy: actor,
      vision: metadata?.vision ?? "TODO: Add vision statement",
      scopeIn: metadata?.scopeIn ?? ["TODO: Add in-scope items"],
      scopeOut: metadata?.scopeOut ?? ["TODO: Add out-of-scope items"],
      successCriteria: metadata?.successCriteria ?? [
        "TODO: Add success criteria",
      ],
      assignee: metadata?.assignee,
      priority: metadata?.priority ?? CPriority.MEDIUM,
      estimation: metadata?.estimation ?? CEstimationSize.M,
      notes: metadata?.notes,
    });

    return { id, artifact, slug };
  }

  /**
   * Scaffold a new milestone with auto-allocated ID and generated slug.
   *
   * Automatically allocates the next available milestone ID under the specified initiative,
   * generates a URL-friendly slug from the title, and detects the git actor.
   * Provides sensible defaults for all required fields.
   *
   * @param parentId - Parent initiative ID (e.g., "A", "B", "AA")
   * @param title - Milestone title (e.g., "API Implementation")
   * @param metadata - Optional metadata (summary, deliverables, etc.)
   * @returns Scaffold result with ID, artifact object, and slug
   * @throws {Error} If parentId is not a valid initiative ID format
   *
   * @example
   * ```ts
   * const service = new ScaffoldingService(idAllocationService);
   *
   * // Minimal usage with defaults
   * const result = await service.scaffoldMilestone("A", "API Implementation");
   * console.log(result.id); // "A.1" (or next available milestone ID)
   * console.log(result.slug); // "api-implementation"
   *
   * // With full metadata
   * const result2 = await service.scaffoldMilestone("B", "Database Setup", {
   *   summary: "Set up PostgreSQL with migrations",
   *   deliverables: ["Schema design", "Migration scripts", "Connection pooling"],
   *   assignee: "bob@example.com",
   *   priority: "high",
   *   estimation: "M"
   * });
   * ```
   *
   * @see {@link IdAllocationService.allocateNextMilestoneId}
   * @see {@link ScaffoldMilestoneMetadata}
   */
  async scaffoldMilestone(
    parentId: string,
    title: string,
    metadata?: ScaffoldMilestoneMetadata,
  ): Promise<ScaffoldResult<TMilestone>> {
    const id = await this.idAllocationService.allocateNextMilestoneId(parentId);
    const slug = generateSlug(title);
    const actor = this.getGitActor();

    const artifact = scaffoldMilestone({
      title,
      createdBy: actor,
      summary: metadata?.summary ?? "TODO: Add summary",
      deliverables: metadata?.deliverables ?? ["TODO: Add deliverables"],
      assignee: metadata?.assignee,
      priority: metadata?.priority ?? CPriority.MEDIUM,
      estimation: metadata?.estimation ?? CEstimationSize.M,
      notes: metadata?.notes,
    });

    return { id, artifact, slug };
  }

  /**
   * Scaffold a new issue with auto-allocated ID and generated slug.
   *
   * Automatically allocates the next available issue ID under the specified milestone,
   * generates a URL-friendly slug from the title, and detects the git actor.
   * Provides sensible defaults for all required fields.
   *
   * @param parentId - Parent milestone ID (e.g., "A.1", "B.2", "AA.5")
   * @param title - Issue title (e.g., "Add authentication middleware")
   * @param metadata - Optional metadata (summary, acceptance criteria, etc.)
   * @returns Scaffold result with ID, artifact object, and slug
   * @throws {Error} If parentId is not a valid milestone ID format
   *
   * @example
   * ```ts
   * const service = new ScaffoldingService(idAllocationService);
   *
   * // Minimal usage with defaults
   * const result = await service.scaffoldIssue("A.1", "Add authentication");
   * console.log(result.id); // "A.1.1" (or next available issue ID)
   * console.log(result.slug); // "add-authentication"
   *
   * // With full metadata
   * const result2 = await service.scaffoldIssue("B.2", "Fix memory leak", {
   *   summary: "Memory leak in WebSocket connections",
   *   acceptanceCriteria: [
   *     "No memory growth after 1000 connections",
   *     "All tests pass",
   *     "Added regression test"
   *   ],
   *   assignee: "charlie@example.com",
   *   priority: "critical",
   *   estimation: "S"
   * });
   * ```
   *
   * @see {@link IdAllocationService.allocateNextIssueId}
   * @see {@link ScaffoldIssueMetadata}
   */
  async scaffoldIssue(
    parentId: string,
    title: string,
    metadata?: ScaffoldIssueMetadata,
  ): Promise<ScaffoldResult<TIssue>> {
    const id = await this.idAllocationService.allocateNextIssueId(parentId);
    const slug = generateSlug(title);
    const actor = this.getGitActor();

    const artifact = scaffoldIssue({
      title,
      createdBy: actor,
      summary: metadata?.summary ?? "TODO: Add summary",
      acceptanceCriteria: metadata?.acceptanceCriteria ?? [
        "TODO: Add acceptance criteria",
      ],
      assignee: metadata?.assignee,
      priority: metadata?.priority ?? CPriority.MEDIUM,
      estimation: metadata?.estimation ?? CEstimationSize.M,
      notes: metadata?.notes,
    });

    return { id, artifact, slug };
  }

  /**
   * Get git actor information in the format "Name (email@example.com)".
   *
   * Executes `git config` commands to retrieve user.name and user.email.
   * Falls back to "Unknown User (unknown@example.com)" if git is not configured
   * or if the commands fail.
   *
   * @returns Actor string matching HUMAN_ACTOR_REGEX pattern
   * @internal
   */
  private getGitActor(): string {
    try {
      const name = execSync("git config --get user.name", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();

      const email = execSync("git config --get user.email", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();

      if (name && email) {
        return `${name} (${email})`;
      }
    } catch {
      // Git not configured or command failed
    }

    return "Unknown User (unknown@example.com)";
  }
}
