/**
 * ESM Import Smoke Test
 *
 * Verifies that ../../dist/index.js can be imported in a pure ESM context
 * without bundler hacks, transpilation, or special configuration.
 *
 * This test validates:
 * - All public exports are accessible
 * - No import resolution errors
 * - No module format mismatches
 * - Tree-shaking is possible (named imports work)
 */

// Test 1: Import all major module groups
console.log("Testing parser imports...");
const { parseInitiative, parseMilestone, parseIssue, parseYaml } = await import(
  "../../dist/index.js"
);

if (typeof parseInitiative !== "function")
  throw new Error("parseInitiative is not a function");
if (typeof parseMilestone !== "function")
  throw new Error("parseMilestone is not a function");
if (typeof parseIssue !== "function")
  throw new Error("parseIssue is not a function");
if (typeof parseYaml !== "function")
  throw new Error("parseYaml is not a function");
console.log("✓ Parser functions imported successfully");

// Test 2: Validator functions
console.log("Testing validator imports...");
const {
  validateArtifact,
  validateInitiative,
  validateMilestone,
  validateIssue,
  getArtifactType,
} = await import("../../dist/index.js");

if (typeof validateArtifact !== "function")
  throw new Error("validateArtifact is not a function");
if (typeof validateInitiative !== "function")
  throw new Error("validateInitiative is not a function");
if (typeof validateMilestone !== "function")
  throw new Error("validateMilestone is not a function");
if (typeof validateIssue !== "function")
  throw new Error("validateIssue is not a function");
if (typeof getArtifactType !== "function")
  throw new Error("getArtifactType is not a function");
console.log("✓ Validator functions imported successfully");

// Test 3: Schemas and constants
console.log("Testing schemas and constants imports...");
const {
  InitiativeSchema,
  MilestoneSchema,
  IssueSchema,
  CArtifact,
  CArtifactEvent,
  CEventTrigger,
  CPriority,
  CEstimationSize,
} = await import("../../dist/index.js");

if (!InitiativeSchema) throw new Error("InitiativeSchema not imported");
if (!MilestoneSchema) throw new Error("MilestoneSchema not imported");
if (!IssueSchema) throw new Error("IssueSchema not imported");
if (!CArtifact) throw new Error("CArtifact not imported");
if (!CArtifactEvent) throw new Error("CArtifactEvent not imported");
if (!CEventTrigger) throw new Error("CEventTrigger not imported");
if (!CPriority) throw new Error("CPriority not imported");
if (!CEstimationSize) throw new Error("CEstimationSize not imported");
console.log("✓ Schemas and constants imported successfully");

// Test 4: State machine functions
console.log("Testing state machine imports...");
const {
  canTransition,
  getValidTransitions,
  assertTransition,
  getStateTransitionsMap,
} = await import("../../dist/index.js");

if (typeof canTransition !== "function")
  throw new Error("canTransition is not a function");
if (typeof getValidTransitions !== "function")
  throw new Error("getValidTransitions is not a function");
if (typeof assertTransition !== "function")
  throw new Error("assertTransition is not a function");
if (typeof getStateTransitionsMap !== "function")
  throw new Error("getStateTransitionsMap is not a function");
console.log("✓ State machine functions imported successfully");

// Test 5: Event builder functions
console.log("Testing event builder imports...");
const {
  createEvent,
  createDraftEvent,
  createReadyEvent,
  createBlockedEvent,
  createInProgressEvent,
  createInReviewEvent,
  createCompletedEvent,
  createCancelledEvent,
  createArchivedEvent,
} = await import("../../dist/index.js");

if (typeof createEvent !== "function")
  throw new Error("createEvent is not a function");
if (typeof createDraftEvent !== "function")
  throw new Error("createDraftEvent is not a function");
if (typeof createReadyEvent !== "function")
  throw new Error("createReadyEvent is not a function");
if (typeof createBlockedEvent !== "function")
  throw new Error("createBlockedEvent is not a function");
if (typeof createInProgressEvent !== "function")
  throw new Error("createInProgressEvent is not a function");
if (typeof createInReviewEvent !== "function")
  throw new Error("createInReviewEvent is not a function");
if (typeof createCompletedEvent !== "function")
  throw new Error("createCompletedEvent is not a function");
if (typeof createCancelledEvent !== "function")
  throw new Error("createCancelledEvent is not a function");
if (typeof createArchivedEvent !== "function")
  throw new Error("createArchivedEvent is not a function");
console.log("✓ Event builder functions imported successfully");

// Test 6: Loading utilities
console.log("Testing loading utilities imports...");
const {
  readArtifact,
  writeArtifact,
  loadAllArtifactPaths,
  loadArtifactsByType,
  getArtifactIdFromPath,
} = await import("../../dist/index.js");

if (typeof readArtifact !== "function")
  throw new Error("readArtifact is not a function");
if (typeof writeArtifact !== "function")
  throw new Error("writeArtifact is not a function");
if (typeof loadAllArtifactPaths !== "function")
  throw new Error("loadAllArtifactPaths is not a function");
if (typeof loadArtifactsByType !== "function")
  throw new Error("loadArtifactsByType is not a function");
if (typeof getArtifactIdFromPath !== "function")
  throw new Error("getArtifactIdFromPath is not a function");
console.log("✓ Loading utilities imported successfully");

// Test 7: Cascade engine
console.log("Testing cascade engine imports...");
const { CascadeEngine } = await import("../../dist/index.js");

if (typeof CascadeEngine !== "function")
  throw new Error("CascadeEngine is not a function");
console.log("✓ Cascade engine imported successfully");

// Test 8: Wizard helpers
console.log("Testing wizard helpers imports...");
const {
  ensureArtifactsLayout,
  resolveArtifactPaths,
  detectContextLevel,
  allocateNextId,
  isAncestorBlockedOrCancelled,
} = await import("../../dist/index.js");

if (typeof ensureArtifactsLayout !== "function")
  throw new Error("ensureArtifactsLayout is not a function");
if (typeof resolveArtifactPaths !== "function")
  throw new Error("resolveArtifactPaths is not a function");
if (typeof detectContextLevel !== "function")
  throw new Error("detectContextLevel is not a function");
if (typeof allocateNextId !== "function")
  throw new Error("allocateNextId is not a function");
if (typeof isAncestorBlockedOrCancelled !== "function")
  throw new Error("isAncestorBlockedOrCancelled is not a function");
console.log("✓ Wizard helpers imported successfully");

// Test 9: Builder/scaffolder
console.log("Testing builder/scaffolder imports...");
const { scaffoldInitiative, scaffoldMilestone, scaffoldIssue } = await import(
  "../../dist/index.js"
);

if (typeof scaffoldInitiative !== "function")
  throw new Error("scaffoldInitiative is not a function");
if (typeof scaffoldMilestone !== "function")
  throw new Error("scaffoldMilestone is not a function");
if (typeof scaffoldIssue !== "function")
  throw new Error("scaffoldIssue is not a function");
console.log("✓ Builder/scaffolder functions imported successfully");

// Test 10: Error formatter
console.log("Testing error formatter imports...");
const {
  formatZodIssue,
  formatZodError,
  formatParseIssues,
  formatIssuesSummary,
} = await import("../../dist/index.js");

if (typeof formatZodIssue !== "function")
  throw new Error("formatZodIssue is not a function");
if (typeof formatZodError !== "function")
  throw new Error("formatZodError is not a function");
if (typeof formatParseIssues !== "function")
  throw new Error("formatParseIssues is not a function");
if (typeof formatIssuesSummary !== "function")
  throw new Error("formatIssuesSummary is not a function");
console.log("✓ Error formatter functions imported successfully");

// Test 11: Dependency validator
console.log("Testing dependency validator imports...");
const {
  detectCircularDependencies,
  detectCrossLevelDependencies,
  validateRelationshipConsistency,
} = await import("../../dist/index.js");

if (typeof detectCircularDependencies !== "function")
  throw new Error("detectCircularDependencies is not a function");
if (typeof detectCrossLevelDependencies !== "function")
  throw new Error("detectCrossLevelDependencies is not a function");
if (typeof validateRelationshipConsistency !== "function")
  throw new Error("validateRelationshipConsistency is not a function");
console.log("✓ Dependency validator functions imported successfully");

// Test 12: No default export (ESM best practice)
console.log("Testing no default export...");
const coreModule = await import("../../dist/index.js");
if ("default" in coreModule && coreModule.default !== undefined) {
  throw new Error("Package should not have a default export");
}
console.log("✓ No default export (ESM best practice confirmed)");

console.log("\n✅ All ESM import tests passed!");
