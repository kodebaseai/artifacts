import {
  CArtifact,
  INITIATIVE_ID_REGEX,
  ISSUE_ID_REGEX,
  MILESTONE_ID_REGEX,
  type TArtifactType,
} from "../constants.js";
import {
  type ArtifactParseError,
  type ArtifactParseIssue,
  type ArtifactParseResult,
  parseInitiative,
  parseIssue,
  parseMilestone,
  parseYaml,
} from "../parser/artifact-parser.js";
import type { TArtifactMetadata } from "../schemas/registries/metadata-registry.js";
import {
  InitiativeSchema,
  IssueSchema,
  MilestoneSchema,
  type TInitiative,
  type TIssue,
  type TMilestone,
} from "../schemas/schemas.js";

export type ArtifactValidationIssue = ArtifactParseIssue;
export type ArtifactValidationErrorKind = ArtifactParseError["kind"];

export class ArtifactValidationError extends Error {
  readonly kind: ArtifactValidationErrorKind;
  readonly artifactType?: TArtifactType;
  readonly issues?: ArtifactValidationIssue[];

  constructor(
    message: string,
    details: {
      kind: ArtifactValidationErrorKind;
      artifactType?: TArtifactType;
      issues?: ArtifactValidationIssue[];
    },
  ) {
    super(message);
    this.name = "ArtifactValidationError";
    this.kind = details.kind;
    this.artifactType = details.artifactType;
    this.issues = details.issues;
  }
}

export type ValidateArtifactOptions = {
  artifactId?: string;
};

type CandidateResult =
  | {
      type: TArtifactType;
      success: true;
    }
  | {
      type: TArtifactType;
      success: false;
      issues: number;
    };

const candidateSchemas = [
  { type: CArtifact.INITIATIVE, schema: InitiativeSchema },
  { type: CArtifact.MILESTONE, schema: MilestoneSchema },
  { type: CArtifact.ISSUE, schema: IssueSchema },
] as const;

type InitiativeIdParts = {
  id: string;
  type: typeof CArtifact.INITIATIVE;
  initiative: string;
};

type MilestoneIdParts = {
  id: string;
  type: typeof CArtifact.MILESTONE;
  initiative: string;
  milestoneNumber: string;
};

type IssueIdParts = {
  id: string;
  type: typeof CArtifact.ISSUE;
  initiative: string;
  milestoneNumber: string;
  issueNumber: string;
};

type ArtifactIdParts = InitiativeIdParts | MilestoneIdParts | IssueIdParts;

function parseArtifactIdParts(id: string): ArtifactIdParts | null {
  if (ISSUE_ID_REGEX.test(id)) {
    const [initiative, milestoneNumber, issueNumber] = id.split(".") as [
      string,
      string,
      string,
    ];
    return {
      id,
      type: CArtifact.ISSUE,
      initiative,
      milestoneNumber,
      issueNumber,
    };
  }

  if (MILESTONE_ID_REGEX.test(id)) {
    const [initiative, milestoneNumber] = id.split(".") as [string, string];
    return {
      id,
      type: CArtifact.MILESTONE,
      initiative,
      milestoneNumber,
    };
  }

  if (INITIATIVE_ID_REGEX.test(id)) {
    return { id, type: CArtifact.INITIATIVE, initiative: id };
  }

  return null;
}

function relationshipsHaveEntries(
  relationships: TArtifactMetadata["relationships"],
): boolean {
  return relationships.blocks.length > 0 || relationships.blocked_by.length > 0;
}

function collectRelationshipIssues(
  current: ArtifactIdParts,
  relationships: TArtifactMetadata["relationships"],
): ArtifactParseIssue[] {
  const issues: ArtifactParseIssue[] = [];

  const checkSibling = (relationshipId: string, path: string) => {
    const candidate = parseArtifactIdParts(relationshipId);
    if (!candidate) {
      issues.push({ path, message: "Invalid artifact ID format" });
      return;
    }

    switch (current.type) {
      case CArtifact.INITIATIVE: {
        if (candidate.type !== CArtifact.INITIATIVE) {
          issues.push({
            path,
            message:
              "Initiatives may only relate to other initiative IDs (e.g. A, B).",
          });
        }
        break;
      }

      case CArtifact.MILESTONE: {
        if (candidate.type !== CArtifact.MILESTONE) {
          issues.push({
            path,
            message:
              "Milestones may only relate to other milestone IDs (e.g. A.1).",
          });
          break;
        }
        if (candidate.initiative !== current.initiative) {
          issues.push({
            path,
            message: `'${relationshipId}' belongs to initiative ${candidate.initiative}; expected initiative ${current.initiative}.`,
          });
        }
        break;
      }

      case CArtifact.ISSUE: {
        if (candidate.type !== CArtifact.ISSUE) {
          issues.push({
            path,
            message:
              "Issues may only relate to other issue IDs (e.g. A.1.1, A.1.2).",
          });
          break;
        }
        if (candidate.initiative !== current.initiative) {
          issues.push({
            path,
            message: `'${relationshipId}' belongs to initiative ${candidate.initiative}; expected initiative ${current.initiative}.`,
          });
          break;
        }
        if (candidate.milestoneNumber !== current.milestoneNumber) {
          issues.push({
            path,
            message: `'${relationshipId}' belongs to milestone ${candidate.initiative}.${candidate.milestoneNumber}; expected milestone ${current.initiative}.${current.milestoneNumber}.`,
          });
        }
        break;
      }
    }
  };

  relationships.blocks.forEach((id, index) => {
    checkSibling(id, `metadata.relationships.blocks[${index}]`);
  });
  relationships.blocked_by.forEach((id, index) => {
    checkSibling(id, `metadata.relationships.blocked_by[${index}]`);
  });

  return issues;
}

function throwRelationshipValidationError(
  artifactType: TArtifactType,
  issues: ArtifactParseIssue[],
): never {
  const count = issues.length;
  const description = count === 1 ? "issue" : "issues";
  throw new ArtifactValidationError(
    `Relationships validation failed (${count} ${description})`,
    {
      kind: "schema",
      artifactType,
      issues,
    },
  );
}

function enforceRelationshipConstraints(
  artifactType: TArtifactType,
  metadata: TArtifactMetadata,
  options?: ValidateArtifactOptions,
) {
  const relationships = metadata.relationships;
  const hasEntries = relationshipsHaveEntries(relationships);

  if (!options?.artifactId) {
    if (hasEntries) {
      throw new ArtifactValidationError(
        "Artifact ID is required to validate relationship dependencies",
        { kind: "input", artifactType },
      );
    }
    return;
  }

  const artifactId = options.artifactId;
  const current = parseArtifactIdParts(artifactId);
  if (!current) {
    throw new ArtifactValidationError(
      `Artifact ID '${artifactId}' is not a recognised artifact identifier`,
      { kind: "input", artifactType },
    );
  }

  if (current.type !== artifactType) {
    throw new ArtifactValidationError(
      `Artifact ID '${artifactId}' does not match expected ${artifactType} artifacts`,
      { kind: "input", artifactType },
    );
  }

  if (!hasEntries) {
    return;
  }

  const issues = collectRelationshipIssues(current, relationships);
  if (issues.length > 0) {
    throwRelationshipValidationError(artifactType, issues);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function throwValidationError(
  artifactType: TArtifactType | undefined,
  error: ArtifactParseError,
): never {
  throw new ArtifactValidationError(error.message, {
    kind: error.kind,
    artifactType,
    issues: error.issues,
  });
}

function mustParse<T extends { metadata: TArtifactMetadata }>(
  artifactType: TArtifactType,
  parse: (value: string | Record<string, unknown>) => ArtifactParseResult<T>,
  input: unknown,
  options?: ValidateArtifactOptions,
): T {
  const result = parse(input as string | Record<string, unknown>);
  if (!result.success) {
    throwValidationError(artifactType, result.error);
  }
  const data = result.data;
  enforceRelationshipConstraints(artifactType, data.metadata, options);
  return data;
}

function ensureObject(input: unknown): Record<string, unknown> {
  let candidate = input;
  if (typeof candidate === "string") {
    const parsed = parseYaml(candidate);
    if (!parsed.success) {
      throwValidationError(undefined, parsed.error);
    }
    candidate = parsed.data;
  }

  if (!isPlainObject(candidate)) {
    throw new ArtifactValidationError(
      "Artifact data must be an object with metadata and content sections",
      { kind: "input" },
    );
  }

  return candidate;
}

export function getArtifactType(input: unknown): TArtifactType {
  const artifact = ensureObject(input);
  const content = artifact.content;
  if (!isPlainObject(content)) {
    throw new ArtifactValidationError(
      "Artifact content must be an object to detect its type",
      { kind: "schema" },
    );
  }

  const evaluations: CandidateResult[] = candidateSchemas.map(
    ({ type, schema }) => {
      const result = schema.safeParse(artifact);
      if (result.success) {
        return { type, success: true };
      }
      return {
        type,
        success: false,
        issues: result.error.issues.length,
      };
    },
  );

  const successful = evaluations.find((evaluation) => evaluation.success);
  if (successful) {
    return successful.type;
  }

  const sorted = evaluations
    .filter(
      (
        evaluation,
      ): evaluation is Extract<CandidateResult, { success: false }> =>
        !evaluation.success,
    )
    .sort((a, b) => a.issues - b.issues);

  const best = sorted[0];
  const second = sorted[1];

  if (!best) {
    throw new ArtifactValidationError(
      "Unable to determine artifact type from provided data",
      { kind: "schema" },
    );
  }

  if (second && best.issues === second.issues) {
    throw new ArtifactValidationError(
      "Unable to determine artifact type from provided data",
      { kind: "schema" },
    );
  }

  return best.type;
}

export function validateInitiative(
  input: unknown,
  options?: ValidateArtifactOptions,
): TInitiative {
  return mustParse(CArtifact.INITIATIVE, parseInitiative, input, options);
}

export function validateMilestone(
  input: unknown,
  options?: ValidateArtifactOptions,
): TMilestone {
  return mustParse(CArtifact.MILESTONE, parseMilestone, input, options);
}

export function validateIssue(
  input: unknown,
  options?: ValidateArtifactOptions,
): TIssue {
  return mustParse(CArtifact.ISSUE, parseIssue, input, options);
}

export type ArtifactValidationSuccess =
  | { type: typeof CArtifact.INITIATIVE; data: TInitiative }
  | { type: typeof CArtifact.MILESTONE; data: TMilestone }
  | { type: typeof CArtifact.ISSUE; data: TIssue };

export function validateArtifact(
  input: unknown,
  expectedType?: TArtifactType,
  options?: ValidateArtifactOptions,
): ArtifactValidationSuccess {
  const type = expectedType ?? getArtifactType(input);

  switch (type) {
    case CArtifact.INITIATIVE:
      return { type, data: validateInitiative(input, options) };
    case CArtifact.MILESTONE:
      return { type, data: validateMilestone(input, options) };
    case CArtifact.ISSUE:
      return { type, data: validateIssue(input, options) };
    default: {
      const exhaustive: never = type;
      throw new ArtifactValidationError(
        `Unsupported artifact type: ${String(exhaustive)}`,
        { kind: "schema" },
      );
    }
  }
}

export const ArtifactValidator = {
  getArtifactType,
  validateInitiative,
  validateMilestone,
  validateIssue,
  validateArtifact,
  ArtifactValidationError,
} as const;
