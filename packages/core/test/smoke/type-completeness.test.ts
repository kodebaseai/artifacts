/**
 * Type Completeness Smoke Test
 *
 * Verifies that @kodebase/core type declarations:
 * - Include all public API types
 * - Have no implicit 'any' types
 * - Properly export TypeScript interfaces and types
 * - Allow proper type inference
 *
 * This file should type-check successfully with strict mode enabled.
 */

import type {
  TArtifactEvent,
  TArtifactMetadata,
  // Type aliases
  TArtifactType,
  TEstimationSize,
  TEvent,
  // Types from schemas
  TInitiative,
  TIssue,
  TMilestone,
  TPriority,
} from "../../dist/index.js";

import {
  // Constants
  CArtifact,
  CArtifactEvent,
  CEstimationSize,
  CPriority,
  // State machine
  canTransition,
  getValidTransitions,
  // Schemas
  InitiativeSchema,
  IssueSchema,
  MilestoneSchema,
  // Parser functions
  parseInitiative,
  parseIssue,
  // Validator functions
  validateArtifact,
} from "../../dist/index.js";

// Test 1: Type inference works correctly
function testTypeInference() {
  const yamlString = "metadata:\n  title: Test";

  // Should infer return type without explicit annotation
  const result = parseInitiative(yamlString);

  // TypeScript should know result shape
  if (result.success) {
    const _typeCheck: TInitiative = result.data;
    return _typeCheck;
  }
  const _error = result.error;
  return null;
}

// Test 2: Schema types are exported and usable
function testSchemaTypes() {
  // These should be valid Zod schema types
  type InitType = typeof InitiativeSchema;
  type MileType = typeof MilestoneSchema;
  type IssueType = typeof IssueSchema;

  // Verify they're not 'any' by attempting operations
  const _initOps: InitType = InitiativeSchema;
  const _mileOps: MileType = MilestoneSchema;
  const _issueOps: IssueType = IssueSchema;

  return { _initOps, _mileOps, _issueOps };
}

// Test 3: Enum types are properly exported
function testEnumTypes() {
  const artifactType: TArtifactType = CArtifact.INITIATIVE;
  const event: TArtifactEvent = CArtifactEvent.DRAFT;
  const priority: TPriority = CPriority.HIGH;
  const size: TEstimationSize = CEstimationSize.M;

  // These should type-check with literal types
  const _checks: [TArtifactType, TArtifactEvent, TPriority, TEstimationSize] = [
    artifactType,
    event,
    priority,
    size,
  ];

  return _checks;
}

// Test 4: Complex types are not simplified to 'any'
function testComplexTypes() {
  const metadata: TArtifactMetadata = {
    title: "Test",
    priority: CPriority.HIGH,
    estimation: CEstimationSize.M,
    created_by: "Test User (test@example.com)",
    assignee: "Test User (test@example.com)",
    schema_version: "0.0.1",
    relationships: {
      blocks: [],
      blocked_by: [],
    },
    events: [],
  };

  // Should have proper type completion
  const _title: string = metadata.title;
  const _priority: string = metadata.priority; // priority is validated as string
  const _events: TEvent[] = metadata.events;

  return { metadata, _title, _priority, _events };
}

// Test 5: Function signatures preserve types
function testFunctionTypes() {
  const yamlString = `
metadata:
  title: Test
  priority: high
  estimation: M
  created_by: "Test (test@example.com)"
  assignee: "Test (test@example.com)"
  schema_version: "0.0.1"
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: draft
      timestamp: "2025-01-01T00:00:00Z"
      actor: "Test (test@example.com)"
      trigger: artifact_created
content:
  summary: Test
  acceptanceCriteria: ["Test"]
`;

  const parsed = parseIssue(yamlString);

  if (parsed.success) {
    // Validator should return typed result
    const validationResult = validateArtifact(parsed.data);

    // Result should be typed
    const _type: string = validationResult.type;
    const _data: TInitiative | TMilestone | TIssue = validationResult.data;

    return { _type, _data };
  }

  return null;
}

// Test 6: State machine preserves types
function testStateMachineTypes() {
  const canTransitionResult: boolean = canTransition(
    CArtifact.ISSUE,
    CArtifactEvent.READY,
    CArtifactEvent.IN_PROGRESS,
  );

  const validTransitions: TArtifactEvent[] = getValidTransitions(
    CArtifact.MILESTONE,
    CArtifactEvent.DRAFT,
  );

  return { canTransitionResult, validTransitions };
}

// Test 7: No implicit any in deep property access
function testNoImplicitAny() {
  const yamlString = `
metadata:
  title: Test Initiative
  priority: high
  estimation: XL
  created_by: "Test (test@example.com)"
  assignee: "Test (test@example.com)"
  schema_version: "0.0.1"
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: draft
      timestamp: "2025-01-01T00:00:00Z"
      actor: "Test (test@example.com)"
      trigger: artifact_created
content:
  vision: Test vision
  scope:
    in: ["API", "Database"]
    out: ["UI redesign"]
  success_criteria: ["99.9% uptime"]
`;

  const parsed = parseInitiative(yamlString);

  if (parsed.success) {
    // Deep property access should be typed
    const _title: string = parsed.data.metadata.title;
    const _priority: string = parsed.data.metadata.priority; // priority is validated as string
    const _events: TEvent[] = parsed.data.metadata.events;
    const _vision: string = parsed.data.content.vision;
    const _scopeIn: string[] = parsed.data.content.scope.in;

    return { _title, _priority, _events, _vision, _scopeIn };
  }

  return null;
}

// Test 8: Type guards work correctly
function testTypeGuards() {
  const yamlString = `
metadata:
  title: Test
  priority: high
  estimation: M
  created_by: "Test (test@example.com)"
  assignee: "Test (test@example.com)"
  schema_version: "0.0.1"
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: draft
      timestamp: "2025-01-01T00:00:00Z"
      actor: "Test (test@example.com)"
      trigger: artifact_created
content:
  vision: Test vision
  scope:
    in: ["API"]
    out: []
  success_criteria: ["Works"]
`;

  const parsed = parseInitiative(yamlString);

  if (parsed.success) {
    // validateArtifact returns { type, data }
    const result = validateArtifact(parsed.data);
    const _type: string = result.type;

    if (result.type === "initiative") {
      // Should narrow to TInitiative
      const _data: TInitiative = result.data;
      return _data;
    }
  }

  return null;
}

// Run all tests
console.log("Running type completeness checks...");
testTypeInference();
testSchemaTypes();
testEnumTypes();
testComplexTypes();
testFunctionTypes();
testStateMachineTypes();
testNoImplicitAny();
testTypeGuards();
console.log("✅ Type completeness checks passed compilation!");
