import { describe, expect, it, vi } from "vitest";
import { ZodError, ZodIssueCode } from "zod";

import { CArtifact, type TArtifactType } from "../constants.js";
import { parseIssue } from "../parser/artifact-parser.js";
import {
  InitiativeSchema,
  IssueSchema,
  MilestoneSchema,
} from "../schemas/schemas.js";
import {
  ArtifactValidationError,
  ArtifactValidator,
  getArtifactType,
  validateArtifact,
  validateInitiative,
  validateIssue,
} from "./artifact-validator.js";

const baseMetadata = {
  title: "Sample Artifact",
  priority: "medium",
  estimation: "S",
  created_by: "Alice Example (alice@example.com)",
  assignee: "Bob Example (bob@example.com)",
  schema_version: "0.0.1",
  relationships: { blocks: [] as string[], blocked_by: [] as string[] },
  events: [
    {
      event: "draft",
      timestamp: "2025-10-30T14:37:00Z",
      actor: "Alice Example (alice@example.com)",
      trigger: "artifact_created",
    },
  ],
};

const initiative = {
  metadata: baseMetadata,
  content: {
    vision: "Adopt registry-driven artifacts",
    scope: {
      in: ["Schema coverage"],
      out: ["Legacy adapters"],
    },
    success_criteria: ["All artifacts validated"],
  },
  impact_summary: {
    outcome: "Artifacts backed by strong schemas",
    benefits: ["Higher reliability"],
    next: "Roll into downstream repos",
  },
};

const milestone = {
  metadata: baseMetadata,
  content: {
    summary: "Deliver parser and validator",
    deliverables: ["Parser module", "Validator helpers"],
    validation: ["CI green"],
  },
  delivery_summary: {
    outcome: "Delivered parser",
    delivered: ["Parser", "Validator"],
    next: "Integrate with CLI",
  },
};

const issue = {
  metadata: baseMetadata,
  content: {
    summary: "Implement artifact validator",
    acceptance_criteria: [
      "getArtifactType detects content",
      "validateIssue throws readable errors",
    ],
  },
};

function expectValidationError(
  fn: () => unknown,
  assertion: (error: ArtifactValidationError) => void,
) {
  try {
    fn();
    throw new Error("Expected ArtifactValidationError");
  } catch (err) {
    expect(err).toBeInstanceOf(ArtifactValidationError);
    assertion(err as ArtifactValidationError);
  }
}

describe("getArtifactType", () => {
  it("detects the correct artifact type for initiative data", () => {
    expect(getArtifactType(initiative)).toBe(CArtifact.INITIATIVE);
  });

  it("detects milestone type even with missing optional sections", () => {
    const partialMilestone = {
      ...milestone,
      delivery_summary: undefined,
    };
    expect(getArtifactType(partialMilestone)).toBe(CArtifact.MILESTONE);
  });

  it("rejects artifacts without content", () => {
    expectValidationError(
      () => getArtifactType({ metadata: baseMetadata }),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.message).toMatch(/content/i);
      },
    );
  });

  it("rejects YAML strings during type detection", () => {
    expectValidationError(
      () => getArtifactType("[]"),
      (error) => {
        expect(error.kind).toBe("input");
        expect(error.message).toMatch(/must be an object/i);
      },
    );
  });
});

describe("validate specific artifact types", () => {
  it("validates an initiative and returns typed data", () => {
    const validated = validateInitiative(initiative);
    expect(validated.content.scope.in).toEqual(["Schema coverage"]);
  });

  it("throws validation errors with formatted issues for issues", () => {
    const invalidIssue = {
      metadata: baseMetadata,
      content: {
        summary: "Implement artifact validator",
      },
    };
    expectValidationError(
      () => validateIssue(invalidIssue),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.issues?.[0]?.path).toBe("content.acceptance_criteria");
      },
    );
  });

  it("allows YAML strings and relies on parser interop", () => {
    const yaml = `
metadata:
  title: "Sample Artifact"
  priority: medium
  estimation: S
  created_by: "Alice Example (alice@example.com)"
  assignee: "Bob Example (bob@example.com)"
  schema_version: "0.0.1"
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: draft
      timestamp: "2025-10-30T14:37:00Z"
      actor: "Alice Example (alice@example.com)"
      trigger: artifact_created
content:
  summary: "Implement artifact validator"
  acceptance_criteria:
    - "getArtifactType detects content"
    - "validateIssue throws readable errors"
`;
    const validated = validateIssue(yaml);
    expect(validated.content.acceptance_criteria).toHaveLength(2);
  });

  it("rejects YAML strings that do not parse into objects", () => {
    expectValidationError(
      () => validateIssue("[]"),
      (error) => {
        expect(error.kind).toBe("yaml");
        expect(error.message).toMatch(/produce an object/i);
      },
    );
  });
});

describe("validateArtifact", () => {
  it("auto-detects type and returns the typed payload", () => {
    const result = validateArtifact(issue);
    expect(result.type).toBe(CArtifact.ISSUE);
    if (result.type !== CArtifact.ISSUE) {
      throw new Error("Expected issue validation result");
    }
    expect(result.data.content.acceptance_criteria[0]).toMatch(/detects/);
  });

  it("exposes helpers through the ArtifactValidator namespace", () => {
    const validated = ArtifactValidator.validateIssue(issue);
    expect(validated.content.acceptance_criteria).toHaveLength(2);
  });

  it("uses the supplied expected type", () => {
    const result = validateArtifact(milestone, CArtifact.MILESTONE);
    expect(result.type).toBe(CArtifact.MILESTONE);
    if (result.type !== CArtifact.MILESTONE) {
      throw new Error("Expected milestone validation result");
    }
    expect(result.data.content.deliverables).toContain("Validator helpers");
  });

  it("returns initiative data when expected type matches", () => {
    const result = validateArtifact(initiative, CArtifact.INITIATIVE);
    expect(result.type).toBe(CArtifact.INITIATIVE);
    if (result.type !== CArtifact.INITIATIVE) {
      throw new Error("Expected initiative validation result");
    }
    expect(result.data.content.scope.in).toEqual(["Schema coverage"]);
  });

  it("throws detection errors when type cannot be resolved", () => {
    const ambiguous = {
      metadata: baseMetadata,
      content: {},
    };
    expectValidationError(
      () => validateArtifact(ambiguous),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.message).toMatch(/determine artifact type/i);
      },
    );
  });

  it("works with parsed artifacts from ArtifactParser", () => {
    const parsed = parseIssue(issue);
    if (!parsed.success) {
      throw new Error("Expected parsed issue to succeed");
    }
    const result = validateArtifact(parsed.data);
    expect(result.type).toBe(CArtifact.ISSUE);
    if (result.type !== CArtifact.ISSUE) {
      throw new Error("Expected issue validation result");
    }
  });

  it("throws when detection results in a tie", () => {
    const makeFailure = (count: number) => ({
      success: false as const,
      error: new ZodError(
        Array.from({ length: count }).map((_, index) => ({
          code: ZodIssueCode.custom,
          message: `issue-${index}`,
          path: [],
          params: {},
        })),
      ),
    });

    const artifact = {
      metadata: baseMetadata,
      content: { summary: "Ambiguous content" },
    };

    const initiativeFailure = makeFailure(1) as Extract<
      ReturnType<typeof InitiativeSchema.safeParse>,
      { success: false }
    >;
    const milestoneFailure = makeFailure(1) as Extract<
      ReturnType<typeof MilestoneSchema.safeParse>,
      { success: false }
    >;
    const issueFailure = makeFailure(2) as Extract<
      ReturnType<typeof IssueSchema.safeParse>,
      { success: false }
    >;

    const spies = [
      vi
        .spyOn(InitiativeSchema, "safeParse")
        .mockReturnValue(initiativeFailure),
      vi.spyOn(MilestoneSchema, "safeParse").mockReturnValue(milestoneFailure),
      vi.spyOn(IssueSchema, "safeParse").mockReturnValue(issueFailure),
    ];

    expectValidationError(
      () => getArtifactType(artifact),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.message).toMatch(/determine artifact type/i);
      },
    );

    for (const spy of spies) {
      spy.mockRestore();
    }
  });

  it("throws when an unsupported artifact type is forced", () => {
    expectValidationError(
      () => validateArtifact(issue, "custom" as TArtifactType),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.message).toMatch(/Unsupported artifact type/i);
      },
    );
  });
});
