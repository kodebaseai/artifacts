import { CArtifact, type TArtifactType } from "../constants.js";
import {
  type ArtifactParseError,
  type ArtifactParseIssue,
  type ArtifactParseResult,
  parseInitiative,
  parseIssue,
  parseMilestone,
  parseYaml,
} from "../parser/artifact-parser.js";
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

function mustParse<T>(
  artifactType: TArtifactType,
  parse: (value: string | Record<string, unknown>) => ArtifactParseResult<T>,
  input: unknown,
): T {
  const result = parse(input as string | Record<string, unknown>);
  if (!result.success) {
    throwValidationError(artifactType, result.error);
  }
  return result.data;
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

  const [best, second] = sorted;

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

export function validateInitiative(input: unknown): TInitiative {
  return mustParse(CArtifact.INITIATIVE, parseInitiative, input);
}

export function validateMilestone(input: unknown): TMilestone {
  return mustParse(CArtifact.MILESTONE, parseMilestone, input);
}

export function validateIssue(input: unknown): TIssue {
  return mustParse(CArtifact.ISSUE, parseIssue, input);
}

export type ArtifactValidationSuccess =
  | { type: typeof CArtifact.INITIATIVE; data: TInitiative }
  | { type: typeof CArtifact.MILESTONE; data: TMilestone }
  | { type: typeof CArtifact.ISSUE; data: TIssue };

export function validateArtifact(
  input: unknown,
  expectedType?: TArtifactType,
): ArtifactValidationSuccess {
  const type = expectedType ?? getArtifactType(input);

  switch (type) {
    case CArtifact.INITIATIVE:
      return { type, data: validateInitiative(input) };
    case CArtifact.MILESTONE:
      return { type, data: validateMilestone(input) };
    case CArtifact.ISSUE:
      return { type, data: validateIssue(input) };
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
