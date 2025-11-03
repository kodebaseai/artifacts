import { execSync } from "node:child_process";
import type {
  TEstimationSize,
  TInitiative,
  TIssue,
  TMilestone,
  TPriority,
} from "@kodebase/core";
import {
  scaffoldInitiative,
  scaffoldIssue,
  scaffoldMilestone,
} from "@kodebase/core";
import type { IdAllocationService } from "./id-allocation-service.js";
import { generateSlug } from "./template-utils.js";

export interface ScaffoldMetadata {
  assignee?: string;
  priority?: TPriority;
  estimation?: TEstimationSize;
  notes?: string;
}

export interface ScaffoldInitiativeMetadata extends ScaffoldMetadata {
  vision?: string;
  scopeIn?: string[];
  scopeOut?: string[];
  successCriteria?: string[];
}

export interface ScaffoldMilestoneMetadata extends ScaffoldMetadata {
  summary?: string;
  deliverables?: string[];
}

export interface ScaffoldIssueMetadata extends ScaffoldMetadata {
  summary?: string;
  acceptanceCriteria?: string[];
}

export interface ScaffoldResult<T> {
  id: string;
  artifact: T;
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
 * const service = new ScaffoldingService(idAllocationService, "/path/.kodebase/artifacts");
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
 */
export class ScaffoldingService {
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
   * @param title - Initiative title
   * @param metadata - Optional metadata (vision, scope, success criteria, etc.)
   * @returns Scaffold result with ID, artifact object, and slug
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
      priority: metadata?.priority ?? "medium",
      estimation: metadata?.estimation ?? "M",
      notes: metadata?.notes,
    });

    return { id, artifact, slug };
  }

  /**
   * Scaffold a new milestone with auto-allocated ID and generated slug.
   *
   * @param parentId - Parent initiative ID (e.g., "A")
   * @param title - Milestone title
   * @param metadata - Optional metadata (summary, deliverables, etc.)
   * @returns Scaffold result with ID, artifact object, and slug
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
      priority: metadata?.priority ?? "medium",
      estimation: metadata?.estimation ?? "M",
      notes: metadata?.notes,
    });

    return { id, artifact, slug };
  }

  /**
   * Scaffold a new issue with auto-allocated ID and generated slug.
   *
   * @param parentId - Parent milestone ID (e.g., "A.1")
   * @param title - Issue title
   * @param metadata - Optional metadata (summary, acceptance criteria, etc.)
   * @returns Scaffold result with ID, artifact object, and slug
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
      priority: metadata?.priority ?? "medium",
      estimation: metadata?.estimation ?? "M",
      notes: metadata?.notes,
    });

    return { id, artifact, slug };
  }

  /**
   * Get git actor information in the format "Name (email@example.com)".
   *
   * Falls back to "Unknown User (unknown@example.com)" if git is not configured.
   *
   * @returns Actor string matching HUMAN_ACTOR_REGEX
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
