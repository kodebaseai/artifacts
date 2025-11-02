import { describe, expect, it } from "vitest";
import {
  ArtifactError,
  createUserFriendlyError,
  formatSchemaError,
  formatValidationErrors,
  formatValidationWarnings,
  type SchemaErrorIssue,
} from "./error-formatting.js";
import type {
  ValidationError,
  ValidationWarning,
} from "./validation-service.js";

describe("ArtifactError", () => {
  it("should create error with all fields", () => {
    const error = new ArtifactError({
      code: "TEST_ERROR",
      message: "Test error message",
      artifactId: "A.1.1",
      field: "metadata.title",
      suggestion: "Fix the title",
    });

    expect(error.name).toBe("ArtifactError");
    expect(error.code).toBe("TEST_ERROR");
    expect(error.message).toBe("Test error message");
    expect(error.artifactId).toBe("A.1.1");
    expect(error.field).toBe("metadata.title");
    expect(error.suggestion).toBe("Fix the title");
  });

  it("should create error with minimal fields", () => {
    const error = new ArtifactError({
      code: "MINIMAL_ERROR",
      message: "Minimal error",
    });

    expect(error.code).toBe("MINIMAL_ERROR");
    expect(error.message).toBe("Minimal error");
    expect(error.artifactId).toBeUndefined();
    expect(error.field).toBeUndefined();
    expect(error.suggestion).toBeUndefined();
  });

  it("should format as string with all context", () => {
    const error = new ArtifactError({
      code: "FORMATTED_ERROR",
      message: "Error with context",
      artifactId: "A.1.1",
      field: "metadata.priority",
      suggestion: "Set priority to critical",
    });

    const formatted = error.toString();
    expect(formatted).toContain("ArtifactError: Error with context");
    expect(formatted).toContain("Artifact: A.1.1");
    expect(formatted).toContain("Field: metadata.priority");
    expect(formatted).toContain("Suggestion: Set priority to critical");
  });

  it("should format as string with minimal context", () => {
    const error = new ArtifactError({
      code: "SIMPLE_ERROR",
      message: "Simple message",
    });

    const formatted = error.toString();
    expect(formatted).toBe("ArtifactError: Simple message");
  });

  it("should capture stack trace", () => {
    const error = new ArtifactError({
      code: "STACK_ERROR",
      message: "Error with stack",
    });

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("ArtifactError");
  });

  it("should preserve cause error", () => {
    const cause = new Error("Original error");
    const error = new ArtifactError({
      code: "CAUSED_ERROR",
      message: "Wrapped error",
      cause,
    });

    expect(error.cause).toBe(cause);
  });
});

describe("formatValidationErrors", () => {
  it("should format single error with all fields", () => {
    const errors: ValidationError[] = [
      {
        code: "RELATIONSHIP_INVALID_ID",
        message: "'invalid' is not a valid artifact ID",
        field: "metadata.relationships.blocks[0]",
        suggestedFix: "Use valid artifact ID format (e.g., A, A.1, A.1.1)",
      },
    ];

    const formatted = formatValidationErrors(errors, "A.1.1");

    expect(formatted).toContain("❌ Validation failed for artifact A.1.1");
    expect(formatted).toContain(
      "RELATIONSHIP_INVALID_ID (metadata.relationships.blocks[0]):",
    );
    expect(formatted).toContain("'invalid' is not a valid artifact ID");
    expect(formatted).toContain(
      "💡 Fix: Use valid artifact ID format (e.g., A, A.1, A.1.1)",
    );
  });

  it("should format multiple errors", () => {
    const errors: ValidationError[] = [
      {
        code: "MISSING_TITLE",
        message: "Title is required",
        field: "metadata.title",
        suggestedFix: "Add required field title",
      },
      {
        code: "CIRCULAR_DEPENDENCY",
        message: "Circular dependency detected: A.1.1 → A.1.2 → A.1.1",
        field: "metadata.relationships.blocked_by",
        suggestedFix: "Break the circular dependency chain",
      },
    ];

    const formatted = formatValidationErrors(errors, "A.1.1");

    expect(formatted).toContain("MISSING_TITLE");
    expect(formatted).toContain("CIRCULAR_DEPENDENCY");
    expect(formatted).toContain("Title is required");
    expect(formatted).toContain("Circular dependency detected");
  });

  it("should format error without field", () => {
    const errors: ValidationError[] = [
      {
        code: "GENERAL_ERROR",
        message: "Something went wrong",
      },
    ];

    const formatted = formatValidationErrors(errors);

    expect(formatted).toContain("GENERAL_ERROR:");
    expect(formatted).toContain("Something went wrong");
    expect(formatted).not.toContain("💡 Fix:");
  });

  it("should format error without suggestedFix", () => {
    const errors: ValidationError[] = [
      {
        code: "NO_FIX_ERROR",
        message: "Error without fix",
        field: "metadata.unknown",
      },
    ];

    const formatted = formatValidationErrors(errors);

    expect(formatted).toContain("NO_FIX_ERROR (metadata.unknown):");
    expect(formatted).toContain("Error without fix");
    expect(formatted).not.toContain("💡 Fix:");
  });

  it("should return empty string for empty errors array", () => {
    const formatted = formatValidationErrors([]);
    expect(formatted).toBe("");
  });

  it("should format without artifact ID", () => {
    const errors: ValidationError[] = [
      {
        code: "TEST_ERROR",
        message: "Test message",
      },
    ];

    const formatted = formatValidationErrors(errors);

    expect(formatted).toContain("❌ Validation failed");
    expect(formatted).not.toContain("for artifact");
  });

  it("should use custom indent", () => {
    const errors: ValidationError[] = [
      {
        code: "INDENT_TEST",
        message: "Test indent",
      },
    ];

    const formatted = formatValidationErrors(errors, undefined, {
      indent: "    ",
    });

    expect(formatted).toContain("    INDENT_TEST:");
    expect(formatted).toContain("        Test indent");
  });
});

describe("formatValidationWarnings", () => {
  it("should format single warning", () => {
    const warnings: ValidationWarning[] = [
      {
        code: "DEPRECATED_FIELD",
        message: "This field is deprecated",
        field: "metadata.old_field",
      },
    ];

    const formatted = formatValidationWarnings(warnings, "A.1.1");

    expect(formatted).toContain("⚠️  Warnings for artifact A.1.1");
    expect(formatted).toContain("DEPRECATED_FIELD (metadata.old_field):");
    expect(formatted).toContain("This field is deprecated");
  });

  it("should format multiple warnings", () => {
    const warnings: ValidationWarning[] = [
      {
        code: "WARNING_1",
        message: "First warning",
      },
      {
        code: "WARNING_2",
        message: "Second warning",
      },
    ];

    const formatted = formatValidationWarnings(warnings);

    expect(formatted).toContain("WARNING_1");
    expect(formatted).toContain("WARNING_2");
    expect(formatted).toContain("First warning");
    expect(formatted).toContain("Second warning");
  });

  it("should return empty string for empty warnings array", () => {
    const formatted = formatValidationWarnings([]);
    expect(formatted).toBe("");
  });
});

describe("formatSchemaError", () => {
  it("should format schema error with expected and received", () => {
    const issues: SchemaErrorIssue[] = [
      {
        code: "invalid_type",
        message: "Expected string, received number",
        path: ["metadata", "title"],
        expected: "string",
        received: "number",
      },
    ];

    const errors = formatSchemaError(issues, "A.1.1");

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: "INVALID_TYPE",
      message: "metadata.title: Expected string, received number",
      field: "metadata.title",
      suggestedFix: "Provide a valid string value",
    });
  });

  it("should format schema error without expected/received", () => {
    const issues: SchemaErrorIssue[] = [
      {
        code: "required",
        message: "Field is required",
        path: ["content", "summary"],
      },
    ];

    const errors = formatSchemaError(issues);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: "REQUIRED",
      message: "content.summary: Field is required",
      field: "content.summary",
      suggestedFix: "Add required field content.summary",
    });
  });

  it("should format schema error without path", () => {
    const issues: SchemaErrorIssue[] = [
      {
        code: "invalid_structure",
        message: "Invalid artifact structure",
      },
    ];

    const errors = formatSchemaError(issues);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: "INVALID_STRUCTURE",
      message: "Invalid artifact structure",
      field: undefined,
    });
  });

  it("should handle numeric path segments", () => {
    const issues: SchemaErrorIssue[] = [
      {
        code: "invalid_type",
        message: "Invalid array element",
        path: ["content", "acceptance_criteria", 0],
        expected: "string",
        received: "number",
      },
    ];

    const errors = formatSchemaError(issues);

    expect(errors[0]?.field).toBe("content.acceptance_criteria.0");
    expect(errors[0]?.message).toContain("content.acceptance_criteria.0:");
  });

  it("should suggest fix for required fields", () => {
    const issues: SchemaErrorIssue[] = [
      {
        code: "required",
        message: "Missing required field",
        path: ["metadata", "priority"],
      },
    ];

    const errors = formatSchemaError(issues);
    expect(errors[0]?.suggestedFix).toBe(
      "Add required field metadata.priority",
    );
  });

  it("should suggest fix for invalid_enum", () => {
    const issues: SchemaErrorIssue[] = [
      {
        code: "invalid_enum",
        message: "Invalid enum value",
        path: ["metadata", "priority"],
        expected: "low, medium, high, critical",
      },
    ];

    const errors = formatSchemaError(issues);
    expect(errors[0]?.suggestedFix).toBe(
      "Use one of: low, medium, high, critical",
    );
  });

  it("should suggest fix for too_small", () => {
    const issues: SchemaErrorIssue[] = [
      {
        code: "too_small",
        message: "Array too small",
        path: ["content", "acceptance_criteria"],
      },
    ];

    const errors = formatSchemaError(issues);
    expect(errors[0]?.suggestedFix).toBe(
      "Provide more items or a larger value",
    );
  });

  it("should suggest fix for too_big", () => {
    const issues: SchemaErrorIssue[] = [
      {
        code: "too_big",
        message: "String too long",
        path: ["metadata", "title"],
      },
    ];

    const errors = formatSchemaError(issues);
    expect(errors[0]?.suggestedFix).toBe(
      "Provide fewer items or a smaller value",
    );
  });

  it("should provide generic suggestion with artifact ID and field", () => {
    const issues: SchemaErrorIssue[] = [
      {
        code: "custom_error",
        message: "Custom validation failed",
        path: ["metadata", "custom_field"],
      },
    ];

    const errors = formatSchemaError(issues, "A.1.1");
    expect(errors[0]?.suggestedFix).toBe(
      "Check metadata.custom_field in artifact A.1.1",
    );
  });

  it("should handle multiple schema issues", () => {
    const issues: SchemaErrorIssue[] = [
      {
        code: "required",
        message: "Missing title",
        path: ["metadata", "title"],
      },
      {
        code: "invalid_type",
        message: "Wrong type",
        path: ["content", "summary"],
        expected: "string",
        received: "number",
      },
    ];

    const errors = formatSchemaError(issues, "A.1.1");

    expect(errors).toHaveLength(2);
    expect(errors[0]?.code).toBe("REQUIRED");
    expect(errors[1]?.code).toBe("INVALID_TYPE");
  });
});

describe("createUserFriendlyError", () => {
  it("should wrap Error instance", () => {
    const original = new Error("Original error message");
    const wrapped = createUserFriendlyError(original, {
      code: "WRAPPED_ERROR",
      artifactId: "A.1.1",
      suggestion: "Try again",
    });

    expect(wrapped).toBeInstanceOf(ArtifactError);
    expect(wrapped.code).toBe("WRAPPED_ERROR");
    expect(wrapped.message).toBe("Original error message");
    expect(wrapped.artifactId).toBe("A.1.1");
    expect(wrapped.suggestion).toBe("Try again");
    expect(wrapped.cause).toBe(original);
  });

  it("should wrap string error", () => {
    const wrapped = createUserFriendlyError("String error", {
      code: "STRING_ERROR",
    });

    expect(wrapped.message).toBe("String error");
    expect(wrapped.code).toBe("STRING_ERROR");
    expect(wrapped.cause).toBeUndefined();
  });

  it("should wrap object with message property", () => {
    const errorObj = { message: "Object error message", extra: "data" };
    const wrapped = createUserFriendlyError(errorObj, {
      code: "OBJECT_ERROR",
    });

    expect(wrapped.message).toBe("Object error message");
    expect(wrapped.code).toBe("OBJECT_ERROR");
  });

  it("should wrap object without message property", () => {
    const errorObj = { code: 500, status: "error" };
    const wrapped = createUserFriendlyError(errorObj, {
      code: "UNKNOWN_OBJECT",
    });

    expect(wrapped.message).toContain('{"code":500,"status":"error"}');
    expect(wrapped.code).toBe("UNKNOWN_OBJECT");
  });

  it("should handle null/undefined errors", () => {
    const wrapped1 = createUserFriendlyError(null, {
      code: "NULL_ERROR",
    });
    const wrapped2 = createUserFriendlyError(undefined, {
      code: "UNDEFINED_ERROR",
    });

    expect(wrapped1.message).toBe("An unexpected error occurred");
    expect(wrapped2.message).toBe("An unexpected error occurred");
  });

  it("should use default code if not provided", () => {
    const wrapped = createUserFriendlyError(new Error("Test"));

    expect(wrapped.code).toBe("UNKNOWN_ERROR");
  });

  it("should include all optional fields", () => {
    const wrapped = createUserFriendlyError("Test error", {
      code: "FULL_ERROR",
      artifactId: "A.1.1",
      field: "metadata.title",
      suggestion: "Fix the title field",
    });

    expect(wrapped.code).toBe("FULL_ERROR");
    expect(wrapped.artifactId).toBe("A.1.1");
    expect(wrapped.field).toBe("metadata.title");
    expect(wrapped.suggestion).toBe("Fix the title field");
  });

  it("should preserve ArtifactError instances", () => {
    const original = new ArtifactError({
      code: "ORIGINAL",
      message: "Original message",
      artifactId: "A.1.1",
    });

    const wrapped = createUserFriendlyError(original, {
      code: "WRAPPED",
      suggestion: "New suggestion",
    });

    expect(wrapped.message).toBe("Original message");
    expect(wrapped.cause).toBe(original);
  });
});
