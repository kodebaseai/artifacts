import {
  ArtifactValidator,
  CArtifact,
  CArtifactEvent,
  type TAnyArtifact,
} from "@kodebase/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationService } from "./validation-service.js";

// Mock @kodebase/core validators
vi.mock("@kodebase/core", async () => {
  const actual =
    await vi.importActual<typeof import("@kodebase/core")>("@kodebase/core");
  return {
    ...actual,
    ArtifactValidator: {
      ...actual.ArtifactValidator,
      validateArtifact: vi.fn(),
      detectCircularDependencies: vi.fn(),
      detectCrossLevelDependencies: vi.fn(),
      validateRelationshipConsistency: vi.fn(),
      getArtifactType: vi.fn(),
    },
    assertTransition: vi.fn(),
  };
});

describe("ValidationService", () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
    vi.clearAllMocks();
  });

  describe("validateArtifact", () => {
    it("should return valid result when all validators pass", () => {
      const artifact = createMockIssue();

      // Mock successful schema validation
      vi.mocked(ArtifactValidator.validateArtifact).mockReturnValue({
        type: "issue",
        data: artifact,
      });

      const result = service.validateArtifact(artifact, {
        artifactId: "A.1.1",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.artifactId).toBe("A.1.1");
    });

    it("should collect schema validation errors", () => {
      const artifact = createMockIssue();

      // Mock schema validation error with issues
      const mockError = new (class extends Error {
        name = "ArtifactValidationError";
        kind = "schema" as const;
        issues = [
          {
            code: "ISSUE_MISSING_TITLE",
            message: "Issue must have a title",
            path: "metadata.title",
          },
        ];
      })("Schema validation failed");

      vi.mocked(ArtifactValidator.validateArtifact).mockImplementation(() => {
        throw mockError;
      });

      const result = service.validateArtifact(artifact, {
        artifactId: "A.1.1",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        code: "ISSUE_MISSING_TITLE",
        message: "Issue must have a title",
        field: "metadata.title",
        suggestedFix: "Add required field title",
      });
    });

    it("should handle schema errors without issues array", () => {
      const artifact = createMockIssue();

      const mockError = new (class extends Error {
        name = "ArtifactValidationError";
        kind = "input" as const;
      })("Invalid input");

      vi.mocked(ArtifactValidator.validateArtifact).mockImplementation(() => {
        throw mockError;
      });

      const result = service.validateArtifact(artifact, {
        artifactId: "A.1.1",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        code: "input",
        message: "Invalid input",
        suggestedFix: "Verify artifact A.1.1 structure matches expected schema",
      });
    });

    it("should validate dependencies when allArtifacts provided", () => {
      const artifact = createMockIssue();
      const allArtifacts = new Map<string, TAnyArtifact>([
        ["A.1.1", artifact],
        ["A.1.2", createMockIssue()],
      ]);

      vi.mocked(ArtifactValidator.validateArtifact).mockReturnValue({
        type: "issue",
        data: artifact,
      });

      vi.mocked(ArtifactValidator.detectCircularDependencies).mockReturnValue(
        [],
      );
      vi.mocked(ArtifactValidator.detectCrossLevelDependencies).mockReturnValue(
        [],
      );
      vi.mocked(
        ArtifactValidator.validateRelationshipConsistency,
      ).mockReturnValue([]);

      const result = service.validateArtifact(artifact, {
        artifactId: "A.1.1",
        allArtifacts,
      });

      expect(result.valid).toBe(true);
      expect(ArtifactValidator.detectCircularDependencies).toHaveBeenCalledWith(
        allArtifacts,
      );
      expect(
        ArtifactValidator.detectCrossLevelDependencies,
      ).toHaveBeenCalledWith(allArtifacts);
      expect(
        ArtifactValidator.validateRelationshipConsistency,
      ).toHaveBeenCalledWith(allArtifacts);
    });

    it("should collect circular dependency errors", () => {
      const artifact = createMockIssue();
      const allArtifacts = new Map<string, TAnyArtifact>([["A.1.1", artifact]]);

      vi.mocked(ArtifactValidator.validateArtifact).mockReturnValue({
        type: "issue",
        data: artifact,
      });

      vi.mocked(ArtifactValidator.detectCircularDependencies).mockReturnValue([
        {
          code: "CIRCULAR_DEPENDENCY",
          cycle: ["A.1.1", "A.1.2", "A.1.3", "A.1.1"],
          message:
            "Circular dependency detected: A.1.1 -> A.1.2 -> A.1.3 -> A.1.1",
        },
      ]);

      vi.mocked(ArtifactValidator.detectCrossLevelDependencies).mockReturnValue(
        [],
      );
      vi.mocked(
        ArtifactValidator.validateRelationshipConsistency,
      ).mockReturnValue([]);

      const result = service.validateArtifact(artifact, {
        artifactId: "A.1.1",
        allArtifacts,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        code: "CIRCULAR_DEPENDENCY",
        message:
          "Circular dependency detected: A.1.1 -> A.1.2 -> A.1.3 -> A.1.1",
        field: "metadata.relationships.blocked_by",
        suggestedFix:
          "Break the circular dependency chain: A.1.1 → A.1.2 → A.1.3 → A.1.1",
      });
    });

    it("should collect cross-level dependency errors", () => {
      const artifact = createMockIssue();
      const allArtifacts = new Map<string, TAnyArtifact>([["A.1.1", artifact]]);

      vi.mocked(ArtifactValidator.validateArtifact).mockReturnValue({
        type: "issue",
        data: artifact,
      });

      vi.mocked(ArtifactValidator.detectCircularDependencies).mockReturnValue(
        [],
      );
      vi.mocked(ArtifactValidator.detectCrossLevelDependencies).mockReturnValue(
        [
          {
            code: "CROSS_LEVEL_DEPENDENCY",
            sourceId: "A.1.1",
            sourceType: "issue",
            dependencyId: "B",
            dependencyType: "initiative",
            message:
              "Cross-level dependency detected: issue A.1.1 cannot depend on initiative B.",
          },
        ],
      );
      vi.mocked(
        ArtifactValidator.validateRelationshipConsistency,
      ).mockReturnValue([]);

      const result = service.validateArtifact(artifact, {
        artifactId: "A.1.1",
        allArtifacts,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        code: "CROSS_LEVEL_DEPENDENCY",
        message:
          "Cross-level dependency detected: issue A.1.1 cannot depend on initiative B.",
        field: "metadata.relationships.blocked_by",
        suggestedFix: "Only reference issue artifacts (not initiative)",
      });
    });

    it("should collect relationship consistency errors", () => {
      const artifact = createMockIssue();
      const allArtifacts = new Map<string, TAnyArtifact>([["A.1.1", artifact]]);

      vi.mocked(ArtifactValidator.validateArtifact).mockReturnValue({
        type: "issue",
        data: artifact,
      });

      vi.mocked(ArtifactValidator.detectCircularDependencies).mockReturnValue(
        [],
      );
      vi.mocked(ArtifactValidator.detectCrossLevelDependencies).mockReturnValue(
        [],
      );
      vi.mocked(
        ArtifactValidator.validateRelationshipConsistency,
      ).mockReturnValue([
        {
          code: "RELATIONSHIP_UNKNOWN_ARTIFACT",
          path: "metadata.relationships.blocks[0]",
          message: "'A.1.2' referenced by A.1.1 was not found.",
        },
        {
          code: "RELATIONSHIP_INCONSISTENT_PAIR",
          path: "metadata.relationships.blocked_by[0]",
          message:
            "'A.1.1' lists 'A.1.3' in blocked_by but the reciprocal blocks entry is missing.",
        },
      ]);

      const result = service.validateArtifact(artifact, {
        artifactId: "A.1.1",
        allArtifacts,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toMatchObject({
        code: "RELATIONSHIP_UNKNOWN_ARTIFACT",
        message: "'A.1.2' referenced by A.1.1 was not found.",
        suggestedFix: "Ensure the referenced artifact exists",
      });
      expect(result.errors[1]).toMatchObject({
        code: "RELATIONSHIP_INCONSISTENT_PAIR",
        message:
          "'A.1.1' lists 'A.1.3' in blocked_by but the reciprocal blocks entry is missing.",
        suggestedFix: "Add the reciprocal relationship entry",
      });
    });

    it("should provide suggested fixes for different schema error types", () => {
      const artifact = createMockIssue();

      const testCases = [
        {
          code: "RELATIONSHIP_INVALID_ID",
          message: "'invalid' is not a valid artifact ID",
          path: "metadata.relationships.blocks[0]",
          expectedFix: "Use valid artifact ID format (e.g., A, A.1, A.1.1)",
        },
        {
          code: "RELATIONSHIP_WRONG_TYPE",
          message: "'A.1' must reference another initiative ID",
          path: "metadata.relationships.blocks[0]",
          expectedFix: "Reference an initiative ID (e.g., A, B)",
        },
        {
          code: "RELATIONSHIP_WRONG_TYPE",
          message: "'A' must reference a milestone ID",
          path: "metadata.relationships.blocks[0]",
          expectedFix: "Reference a milestone ID (e.g., A.1, B.2)",
        },
        {
          code: "RELATIONSHIP_DIFFERENT_INITIATIVE",
          message: "'B.1' must start with 'A.' to stay within initiative A",
          path: "metadata.relationships.blocks[0]",
          expectedFix: "Only reference artifacts within the same initiative",
        },
        {
          code: "RELATIONSHIP_DIFFERENT_MILESTONE",
          message:
            "'A.2.1' must start with 'A.1.' to stay within milestone A.1",
          path: "metadata.relationships.blocks[0]",
          expectedFix: "Only reference issues within the same milestone",
        },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();

        const mockError = new (class extends Error {
          name = "ArtifactValidationError";
          kind = "schema" as const;
          issues = [
            {
              code: testCase.code,
              message: testCase.message,
              path: testCase.path,
            },
          ];
        })("Schema validation failed");

        vi.mocked(ArtifactValidator.validateArtifact).mockImplementation(() => {
          throw mockError;
        });

        const result = service.validateArtifact(artifact, {
          artifactId: "A.1.1",
        });

        expect(result.errors[0]?.suggestedFix).toBe(testCase.expectedFix);
      }
    });
  });

  describe("validateAll", () => {
    it("should validate all artifacts in batch", () => {
      const artifact1 = createMockIssue();
      const artifact2 = createMockIssue();
      const artifacts = new Map<string, TAnyArtifact>([
        ["A.1.1", artifact1],
        ["A.1.2", artifact2],
      ]);

      vi.mocked(ArtifactValidator.validateArtifact).mockReturnValue({
        type: "issue",
        data: artifact1,
      });
      vi.mocked(ArtifactValidator.detectCircularDependencies).mockReturnValue(
        [],
      );
      vi.mocked(ArtifactValidator.detectCrossLevelDependencies).mockReturnValue(
        [],
      );
      vi.mocked(
        ArtifactValidator.validateRelationshipConsistency,
      ).mockReturnValue([]);

      const results = service.validateAll({ artifacts });

      expect(results).toHaveLength(2);
      expect(results[0]?.artifactId).toBe("A.1.1");
      expect(results[0]?.valid).toBe(true);
      expect(results[1]?.artifactId).toBe("A.1.2");
      expect(results[1]?.valid).toBe(true);

      // Verify dependency validators called for each artifact
      expect(
        ArtifactValidator.detectCircularDependencies,
      ).toHaveBeenCalledTimes(2);
      expect(
        ArtifactValidator.detectCrossLevelDependencies,
      ).toHaveBeenCalledTimes(2);
      expect(
        ArtifactValidator.validateRelationshipConsistency,
      ).toHaveBeenCalledTimes(2);

      // Verify artifacts map reused (batch optimization)
      expect(ArtifactValidator.detectCircularDependencies).toHaveBeenCalledWith(
        artifacts,
      );
    });

    it("should return separate results for each artifact", () => {
      const artifact1 = createMockIssue();
      const artifact2 = createMockIssue();
      const artifacts = new Map<string, TAnyArtifact>([
        ["A.1.1", artifact1],
        ["A.1.2", artifact2],
      ]);

      // First artifact passes, second fails
      vi.mocked(ArtifactValidator.validateArtifact)
        .mockReturnValueOnce({
          type: "issue",
          data: artifact1,
        })
        .mockImplementationOnce(() => {
          throw new (class extends Error {
            name = "ArtifactValidationError";
            kind = "schema" as const;
            issues = [
              {
                code: "ISSUE_MISSING_TITLE",
                message: "Issue must have a title",
                path: "metadata.title",
              },
            ];
          })("Schema validation failed");
        });

      vi.mocked(ArtifactValidator.detectCircularDependencies).mockReturnValue(
        [],
      );
      vi.mocked(ArtifactValidator.detectCrossLevelDependencies).mockReturnValue(
        [],
      );
      vi.mocked(
        ArtifactValidator.validateRelationshipConsistency,
      ).mockReturnValue([]);

      const results = service.validateAll({ artifacts });

      expect(results).toHaveLength(2);
      expect(results[0]?.valid).toBe(true);
      expect(results[1]?.valid).toBe(false);
      expect(results[1]?.errors).toHaveLength(1);
    });
  });

  describe("state transition validation", () => {
    it("should validate state transitions when currentState and nextState provided", async () => {
      const artifact = createMockIssue();
      const { assertTransition } = await import("@kodebase/core");

      vi.mocked(ArtifactValidator.validateArtifact).mockReturnValue({
        type: "issue",
        data: artifact,
      });
      vi.mocked(ArtifactValidator.getArtifactType).mockReturnValue(
        CArtifact.ISSUE,
      );
      vi.mocked(assertTransition).mockImplementation(() => {
        // Valid transition
      });

      const result = service.validateArtifact(artifact, {
        artifactId: "A.1.1",
        currentState: CArtifactEvent.READY,
        nextState: CArtifactEvent.IN_PROGRESS,
      });

      expect(result.valid).toBe(true);
      expect(assertTransition).toHaveBeenCalledWith(
        CArtifact.ISSUE,
        CArtifactEvent.READY,
        CArtifactEvent.IN_PROGRESS,
      );
    });

    it("should collect state transition errors", async () => {
      const artifact = createMockIssue();
      const { assertTransition } = await import("@kodebase/core");

      vi.mocked(ArtifactValidator.validateArtifact).mockReturnValue({
        type: "issue",
        data: artifact,
      });
      vi.mocked(ArtifactValidator.getArtifactType).mockReturnValue(
        CArtifact.ISSUE,
      );

      const mockError = new (class extends Error {
        name = "StateTransitionError";
        artifactType = CArtifact.ISSUE;
        fromState = CArtifactEvent.COMPLETED;
        toState = CArtifactEvent.DRAFT;
        validTransitions = [] as string[];
      })(
        "Invalid state transition: completed → draft for issue. No valid transitions from current state.",
      );

      vi.mocked(assertTransition).mockImplementation(() => {
        throw mockError;
      });

      const result = service.validateArtifact(artifact, {
        artifactId: "A.1.1",
        currentState: CArtifactEvent.COMPLETED,
        nextState: CArtifactEvent.DRAFT,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        code: "INVALID_STATE_TRANSITION",
        field: "metadata.events",
        suggestedFix:
          "completed is a terminal state (no further transitions allowed)",
      });
    });

    it("should provide suggested fix with valid transitions when available", async () => {
      const artifact = createMockIssue();
      const { assertTransition } = await import("@kodebase/core");

      vi.mocked(ArtifactValidator.validateArtifact).mockReturnValue({
        type: "issue",
        data: artifact,
      });
      vi.mocked(ArtifactValidator.getArtifactType).mockReturnValue(
        CArtifact.ISSUE,
      );

      const mockError = new (class extends Error {
        name = "StateTransitionError";
        artifactType = CArtifact.ISSUE;
        fromState = CArtifactEvent.READY;
        toState = CArtifactEvent.COMPLETED;
        validTransitions = [
          CArtifactEvent.IN_PROGRESS,
          CArtifactEvent.CANCELLED,
        ];
      })("Invalid state transition");

      vi.mocked(assertTransition).mockImplementation(() => {
        throw mockError;
      });

      const result = service.validateArtifact(artifact, {
        artifactId: "A.1.1",
        currentState: CArtifactEvent.READY,
        nextState: CArtifactEvent.COMPLETED,
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.suggestedFix).toBe(
        `Valid transitions from ${CArtifactEvent.READY}: ${CArtifactEvent.IN_PROGRESS}, ${CArtifactEvent.CANCELLED}`,
      );
    });

    it("should skip state validation when currentState or nextState not provided", () => {
      const artifact = createMockIssue();

      vi.mocked(ArtifactValidator.validateArtifact).mockReturnValue({
        type: "issue",
        data: artifact,
      });

      // Only currentState provided
      const result1 = service.validateArtifact(artifact, {
        artifactId: "A.1.1",
        currentState: CArtifactEvent.READY,
      });

      expect(result1.valid).toBe(true);

      // Only nextState provided
      const result2 = service.validateArtifact(artifact, {
        artifactId: "A.1.1",
        nextState: CArtifactEvent.IN_PROGRESS,
      });

      expect(result2.valid).toBe(true);

      // Neither provided
      const result3 = service.validateArtifact(artifact, {
        artifactId: "A.1.1",
      });

      expect(result3.valid).toBe(true);
    });
  });

  describe("error handling edge cases", () => {
    it("should rethrow non-validation errors from schema validator", () => {
      const artifact = createMockIssue();

      vi.mocked(ArtifactValidator.validateArtifact).mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      expect(() => {
        service.validateArtifact(artifact, { artifactId: "A.1.1" });
      }).toThrow("Unexpected error");
    });

    it("should rethrow non-state-transition errors", async () => {
      const artifact = createMockIssue();
      const { assertTransition } = await import("@kodebase/core");

      vi.mocked(ArtifactValidator.validateArtifact).mockReturnValue({
        type: "issue",
        data: artifact,
      });
      vi.mocked(ArtifactValidator.getArtifactType).mockReturnValue(
        CArtifact.ISSUE,
      );
      vi.mocked(assertTransition).mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      expect(() => {
        service.validateArtifact(artifact, {
          artifactId: "A.1.1",
          currentState: CArtifactEvent.READY,
          nextState: CArtifactEvent.IN_PROGRESS,
        });
      }).toThrow("Unexpected error");
    });

    it("should handle schema errors with undefined code and path", () => {
      const artifact = createMockIssue();

      const mockError = new (class extends Error {
        name = "ArtifactValidationError";
        kind = "schema" as const;
        issues = [
          {
            code: undefined,
            message: "Unknown error",
            path: undefined,
          },
        ];
      })("Schema validation failed");

      vi.mocked(ArtifactValidator.validateArtifact).mockImplementation(() => {
        throw mockError;
      });

      const result = service.validateArtifact(artifact, {
        artifactId: "A.1.1",
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatchObject({
        code: "SCHEMA_ERROR",
        message: "Unknown error",
        field: undefined,
      });
    });

    it("should handle issue codes with no matching suggested fix", () => {
      const artifact = createMockIssue();

      const mockError = new (class extends Error {
        name = "ArtifactValidationError";
        kind = "schema" as const;
        issues = [
          {
            code: "UNKNOWN_ERROR_CODE",
            message: "Unknown validation error",
            path: "metadata.unknown",
          },
        ];
      })("Schema validation failed");

      vi.mocked(ArtifactValidator.validateArtifact).mockImplementation(() => {
        throw mockError;
      });

      const result = service.validateArtifact(artifact, {
        artifactId: "A.1.1",
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.suggestedFix).toBeUndefined();
    });
  });
});

// Helper functions

function createMockIssue(): TAnyArtifact {
  return {
    metadata: {
      title: "Test Issue",
      priority: "medium",
      estimation: "M",
      created_by: "test@example.com",
      assignee: "test@example.com",
      schema_version: "0.0.1",
      relationships: {
        blocks: [],
        blocked_by: [],
      },
      events: [
        {
          event: "draft",
          timestamp: "2025-01-01T00:00:00Z",
          actor: "test@example.com",
          trigger: "artifact_created",
        },
      ],
    },
    content: {
      summary: "Test summary",
      acceptance_criteria: ["AC1"],
    },
  } as TAnyArtifact;
}
