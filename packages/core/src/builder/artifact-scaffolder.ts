import type { TInitiative, TIssue, TMilestone } from "src/schemas/schemas.ts";
import {
  CArtifactEvent,
  CEventTrigger,
  HUMAN_ACTOR_REGEX,
  SIMPLE_AGENT_REGEX,
  type TEstimationSize,
  type TPriority,
} from "../constants.js";
import { createTimestamp } from "./timestamp-utils.js";

/**
 * Shared base options for all artifact scaffolding functions.
 */
export interface ScaffoldBaseOptions {
  /** Artifact title (3-100 characters) */
  title: string;
  /** Actor who created the artifact (human or agent format) */
  createdBy: string;
  /** Actor assigned to the artifact (defaults to createdBy) */
  assignee?: string;
  /** Priority level (defaults to "medium") */
  priority?: TPriority;
  /** Estimation size (defaults to "S") */
  estimation?: TEstimationSize;
  /** Optional notes (string or array of strings) */
  notes?: string | string[];
  /** Optional ISO-8601 UTC timestamp (defaults to now) */
  timestamp?: string;
}

/**
 * Options for scaffolding an initiative.
 */
export interface ScaffoldInitiativeOptions extends ScaffoldBaseOptions {
  /** Vision statement (what we're building) */
  vision: string;
  /** In-scope items */
  scopeIn: string[];
  /** Out-of-scope items */
  scopeOut: string[];
  /** Success criteria */
  successCriteria: string[];
}

/**
 * Options for scaffolding a milestone.
 */
export interface ScaffoldMilestoneOptions extends ScaffoldBaseOptions {
  /** Summary of what the milestone delivers */
  summary: string;
  /** List of deliverables */
  deliverables: string[];
  /** Optional validation criteria */
  validation?: string[];
}

/**
 * Options for scaffolding an issue.
 */
export interface ScaffoldIssueOptions extends ScaffoldBaseOptions {
  /** Summary of what the issue addresses */
  summary: string;
  /** Acceptance criteria */
  acceptanceCriteria: string[];
}

/**
 * Validates that an actor string matches the required format.
 * Supports human format: "Name (email@domain.tld)"
 * Supports agent format: "agent.system" or "agent.cascade" or with tenant
 *
 * @param actor - Actor string to validate
 * @throws Error if actor format is invalid
 */
function validateActor(actor: string): void {
  const isHuman = HUMAN_ACTOR_REGEX.test(actor);
  const isAgent = SIMPLE_AGENT_REGEX.test(actor);

  if (!isHuman && !isAgent) {
    throw new Error(
      `Invalid actor format "${actor}". Expected human format "Name (email@domain.tld)" or agent format "agent.system[@tenant]" or "agent.cascade[@tenant]"`,
    );
  }
}

/**
 * Scaffolds a new initiative artifact with minimal content and a draft event.
 * Returns a fully valid TInitiative object ready to be written to disk.
 *
 * @param options - Initiative-specific options
 * @returns Valid TInitiative object with draft event
 *
 * @example
 * const initiative = scaffoldInitiative({
 *   title: "Strategic Platform Initiative",
 *   createdBy: "Ada Lovelace (ada@example.com)",
 *   vision: "Build a resilient platform",
 *   scopeIn: ["Core services", "API layer"],
 *   scopeOut: ["Legacy migration"],
 *   successCriteria: ["All services deployed", "95% uptime"]
 * });
 */
export function scaffoldInitiative(
  options: ScaffoldInitiativeOptions,
): TInitiative {
  const {
    title,
    createdBy,
    assignee = createdBy,
    priority = "medium",
    estimation = "S",
    notes,
    timestamp,
    vision,
    scopeIn,
    scopeOut,
    successCriteria,
  } = options;

  // Validate actors
  validateActor(createdBy);
  validateActor(assignee);

  // Validate required content arrays
  if (scopeIn.length === 0) {
    throw new Error("scopeIn must contain at least one item");
  }
  if (scopeOut.length === 0) {
    throw new Error("scopeOut must contain at least one item");
  }
  if (successCriteria.length === 0) {
    throw new Error("successCriteria must contain at least one item");
  }

  const eventTimestamp = timestamp ?? createTimestamp();

  const initiative: TInitiative = {
    metadata: {
      title,
      priority,
      estimation,
      created_by: createdBy,
      assignee,
      schema_version: "0.0.1",
      relationships: {
        blocks: [],
        blocked_by: [],
      },
      events: [
        {
          event: CArtifactEvent.DRAFT,
          timestamp: eventTimestamp,
          actor: createdBy,
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
      ],
    },
    content: {
      vision,
      scope: {
        in: scopeIn,
        out: scopeOut,
      },
      success_criteria: successCriteria,
    },
  };

  if (notes !== undefined) {
    initiative.notes = notes;
  }

  return initiative;
}

/**
 * Scaffolds a new milestone artifact with minimal content and a draft event.
 * Returns a fully valid TMilestone object ready to be written to disk.
 *
 * @param options - Milestone-specific options
 * @returns Valid TMilestone object with draft event
 *
 * @example
 * const milestone = scaffoldMilestone({
 *   title: "Parser Rollout",
 *   createdBy: "Grace Hopper (grace@example.com)",
 *   summary: "Deliver parser and validator fixtures",
 *   deliverables: ["Parser fixtures", "Validator tests"]
 * });
 */
export function scaffoldMilestone(
  options: ScaffoldMilestoneOptions,
): TMilestone {
  const {
    title,
    createdBy,
    assignee = createdBy,
    priority = "medium",
    estimation = "S",
    notes,
    timestamp,
    summary,
    deliverables,
    validation,
  } = options;

  // Validate actors
  validateActor(createdBy);
  validateActor(assignee);

  // Validate required content arrays
  if (deliverables.length === 0) {
    throw new Error("deliverables must contain at least one item");
  }

  const eventTimestamp = timestamp ?? createTimestamp();

  const milestone: TMilestone = {
    metadata: {
      title,
      priority,
      estimation,
      created_by: createdBy,
      assignee,
      schema_version: "0.0.1",
      relationships: {
        blocks: [],
        blocked_by: [],
      },
      events: [
        {
          event: CArtifactEvent.DRAFT,
          timestamp: eventTimestamp,
          actor: createdBy,
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
      ],
    },
    content: {
      summary,
      deliverables,
    },
  };

  if (validation !== undefined) {
    milestone.content.validation = validation;
  }

  if (notes !== undefined) {
    milestone.notes = notes;
  }

  return milestone;
}

/**
 * Scaffolds a new issue artifact with minimal content and a draft event.
 * Returns a fully valid TIssue object ready to be written to disk.
 *
 * @param options - Issue-specific options
 * @returns Valid TIssue object with draft event
 *
 * @example
 * const issue = scaffoldIssue({
 *   title: "Add parser fixtures",
 *   createdBy: "Ada Lovelace (ada@example.com)",
 *   summary: "Add golden fixtures for parser and validator",
 *   acceptanceCriteria: ["Fixtures load cleanly", "Invalid fixtures produce expected errors"]
 * });
 */
export function scaffoldIssue(options: ScaffoldIssueOptions): TIssue {
  const {
    title,
    createdBy,
    assignee = createdBy,
    priority = "medium",
    estimation = "S",
    notes,
    timestamp,
    summary,
    acceptanceCriteria,
  } = options;

  // Validate actors
  validateActor(createdBy);
  validateActor(assignee);

  // Validate required content arrays
  if (acceptanceCriteria.length === 0) {
    throw new Error("acceptanceCriteria must contain at least one item");
  }

  const eventTimestamp = timestamp ?? createTimestamp();

  const issue: TIssue = {
    metadata: {
      title,
      priority,
      estimation,
      created_by: createdBy,
      assignee,
      schema_version: "0.0.1",
      relationships: {
        blocks: [],
        blocked_by: [],
      },
      events: [
        {
          event: CArtifactEvent.DRAFT,
          timestamp: eventTimestamp,
          actor: createdBy,
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
      ],
    },
    content: {
      summary,
      acceptance_criteria: acceptanceCriteria,
    },
  };

  if (notes !== undefined) {
    issue.notes = notes;
  }

  return issue;
}
