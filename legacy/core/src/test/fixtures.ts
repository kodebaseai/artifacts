/**
 * Test fixtures for Kodebase artifacts
 * @module @kodebase/core/test/fixtures
 * @description Test fixtures for Kodebase artifacts
 * @exports createTestMetadata
 * @exports createInitiativeYaml
 * @exports createMilestoneYaml
 * @exports createIssueYaml
 * @exports SIMPLE_YAML_SAMPLES
 * @exports INVALID_YAML_SAMPLES
 */

import { createEvent } from '../automation/events/builder';
import type {
  ArtifactMetadata,
  Initiative,
  Issue,
  Milestone,
} from '../data/types';
import { CArtifactEvent, CEventTrigger } from '../data/types/constants';

/**
 * Factory to create valid metadata for testing
 * @param overrides - Optional overrides for the metadata
 * @returns The created metadata
 */
export function createTestMetadata(
  overrides?: Partial<ArtifactMetadata>,
): ArtifactMetadata {
  return {
    title: 'Test Artifact',
    priority: 'medium',
    estimation: 'M',
    created_by: 'John Doe (john@example.com)',
    assignee: 'John Doe (john@example.com)',
    schema_version: '0.1.0',
    relationships: {
      blocks: [],
      blocked_by: [],
    },
    events: [
      createEvent({
        timestamp: '2025-01-07T10:00:00Z',
        event: CArtifactEvent.DRAFT,
        actor: 'John Doe (john@example.com)',
        trigger: CEventTrigger.ARTIFACT_CREATED,
      }),
    ],
    ...overrides,
  };
}

/**
 * Factory to create valid initiative YAML for testing
 * @param overrides - Optional overrides for the initiative
 * @returns The created initiative YAML
 */
export function createInitiativeYaml(overrides?: {
  metadata?: Partial<ArtifactMetadata>;
  content?: Partial<Initiative['content']>;
}): string {
  const metadata = createTestMetadata({
    title: 'Test Initiative',
    priority: 'critical',
    estimation: 'L',
    ...overrides?.metadata,
  });

  const content = {
    vision:
      'This is a test vision statement that is long enough to pass validation',
    scope:
      'This is a test scope statement that is long enough to pass validation',
    success_criteria: ['First success criterion', 'Second success criterion'],
    ...overrides?.content,
  };

  return `
metadata:
  title: "${metadata.title}"
  priority: ${metadata.priority}
  estimation: ${metadata.estimation}
  created_by: "${metadata.created_by}"
  assignee: "${metadata.assignee}"
  schema_version: "${metadata.schema_version}"
  relationships:
    blocks: [${metadata.relationships.blocks.join(', ')}]
    blocked_by: [${metadata.relationships.blocked_by.join(', ')}]
  events:
${metadata.events
  .map(
    (e) => `    - event: ${e.event}
      timestamp: "${e.timestamp}"
      actor: "${e.actor}"
      trigger: "${e.trigger || CEventTrigger.ARTIFACT_CREATED}"${
        e.metadata && Object.keys(e.metadata).length > 0
          ? `
      metadata: ${JSON.stringify(e.metadata, null, 8).replace(/^/gm, '        ')}`
          : ''
      }`,
  )
  .join('\n')}
content:
  vision: "${content.vision}"
  scope: "${content.scope}"
  success_criteria:
${content.success_criteria.map((sc) => `    - "${sc}"`).join('\n')}
`;
}

/**
 * Factory to create valid milestone YAML for testing
 * @param overrides - Optional overrides for the milestone
 * @returns The created milestone YAML
 */
export function createMilestoneYaml(overrides?: {
  metadata?: Partial<ArtifactMetadata>;
  content?: Partial<Milestone['content']>;
}): string {
  const metadata = createTestMetadata({
    title: 'Test Milestone',
    priority: 'high',
    estimation: 'L',
    ...overrides?.metadata,
  });

  const content = {
    summary: 'This is a test milestone summary',
    deliverables: ['First deliverable', 'Second deliverable'],
    validation: ['First validation criterion', 'Second validation criterion'],
    ...overrides?.content,
  };

  return `
metadata:
  title: "${metadata.title}"
  priority: ${metadata.priority}
  estimation: ${metadata.estimation}
  created_by: "${metadata.created_by}"
  assignee: "${metadata.assignee}"
  schema_version: "${metadata.schema_version}"
  relationships:
    blocks: [${metadata.relationships.blocks.join(', ')}]
    blocked_by: [${metadata.relationships.blocked_by.join(', ')}]
  events:
${metadata.events
  .map(
    (e) => `    - event: ${e.event}
      timestamp: "${e.timestamp}"
      actor: "${e.actor}"
      trigger: "${e.trigger || CEventTrigger.ARTIFACT_CREATED}"${
        e.metadata && Object.keys(e.metadata).length > 0
          ? `
      metadata: ${JSON.stringify(e.metadata, null, 8).replace(/^/gm, '        ')}`
          : ''
      }`,
  )
  .join('\n')}
content:
  summary: "${content.summary}"
  deliverables:
${content.deliverables.map((d) => `    - "${d}"`).join('\n')}
  validation:
${content.validation.map((v) => `    - "${v}"`).join('\n')}
`;
}

/**
 * Factory to create valid issue YAML for testing
 * @param overrides - Optional overrides for the issue
 * @returns The created issue YAML
 */
export function createIssueYaml(overrides?: {
  metadata?: Partial<ArtifactMetadata>;
  content?: Partial<Issue['content']>;
  development_process?: Issue['development_process'];
  completion_analysis?: Issue['completion_analysis'];
  review_details?: Issue['review_details'];
  notes?: string;
}): string {
  const metadata = createTestMetadata({
    title: 'Test Issue',
    priority: 'medium',
    estimation: 'S',
    ...overrides?.metadata,
  });

  const content = {
    summary: 'This is a test issue summary',
    acceptance_criteria: [
      'First acceptance criterion',
      'Second acceptance criterion',
    ],
    ...overrides?.content,
  };

  let yaml = `
metadata:
  title: "${metadata.title}"
  priority: ${metadata.priority}
  estimation: ${metadata.estimation}
  created_by: "${metadata.created_by}"
  assignee: "${metadata.assignee}"
  schema_version: "${metadata.schema_version}"
  relationships:
    blocks: [${metadata.relationships.blocks.join(', ')}]
    blocked_by: [${metadata.relationships.blocked_by.join(', ')}]
  events:
${metadata.events
  .map(
    (e) => `    - event: ${e.event}
      timestamp: "${e.timestamp}"
      actor: "${e.actor}"
      trigger: "${e.trigger || CEventTrigger.ARTIFACT_CREATED}"${
        e.metadata && Object.keys(e.metadata).length > 0
          ? `
      metadata: ${JSON.stringify(e.metadata, null, 8).replace(/^/gm, '        ')}`
          : ''
      }`,
  )
  .join('\n')}
content:
  summary: "${content.summary}"
  acceptance_criteria:
${content.acceptance_criteria.map((ac) => `    - "${ac}"`).join('\n')}`;

  // Add optional sections if provided
  if (overrides?.development_process) {
    yaml += '\ndevelopment_process:';
    const dp = overrides.development_process;

    if (dp.spikes_generated) {
      yaml += '\n  spikes_generated:';
      dp.spikes_generated.forEach((spike) => {
        yaml += `\n    - "${spike}"`;
      });
    }

    if (dp.alternatives_considered) {
      yaml += '\n  alternatives_considered:';
      dp.alternatives_considered.forEach((alt) => {
        yaml += `\n    - "${alt}"`;
      });
    }

    if (dp.challenges_encountered) {
      yaml += '\n  challenges_encountered:';
      dp.challenges_encountered.forEach((challenge) => {
        yaml += `\n    - challenge: "${challenge.challenge}"`;
        yaml += `\n      solution: "${challenge.solution}"`;
      });
    }
  }

  if (overrides?.completion_analysis) {
    yaml += '\ncompletion_analysis:';
    const ca = overrides.completion_analysis;

    if (ca.key_insights) {
      yaml += '\n  key_insights:';
      ca.key_insights.forEach((insight) => {
        yaml += `\n    - "${insight}"`;
      });
    }

    if (ca.implementation_approach) {
      yaml += `\n  implementation_approach: "${ca.implementation_approach}"`;
    }

    if (ca.knowledge_generated) {
      yaml += '\n  knowledge_generated:';
      ca.knowledge_generated.forEach((knowledge) => {
        yaml += `\n    - "${knowledge}"`;
      });
    }

    if (ca.manual_testing_steps) {
      yaml += '\n  manual_testing_steps:';
      ca.manual_testing_steps.forEach((step) => {
        yaml += `\n    - "${step}"`;
      });
    }
  }

  if (overrides?.notes) {
    yaml += `\nnotes: "${overrides.notes}"`;
  }

  return `${yaml}\n`;
}

/**
 * Simple YAML samples for basic parsing tests
 * @property basic - Basic YAML sample
 */
export const SIMPLE_YAML_SAMPLES = {
  basic: `
metadata:
  title: "Test Issue"
  priority: high
`,
};

/**
 * Invalid YAML samples for error testing
 * @property syntaxError - Syntax error YAML sample
 * @property empty - Empty YAML sample
 * @property missingRequired - Missing required YAML sample
 * @property invalidEventTime - Invalid event time YAML sample
 */
export const INVALID_YAML_SAMPLES = {
  syntaxError: `
metadata:
  title: "Unclosed quote
  priority: high
`,

  empty: '',

  missingRequired: `
metadata:
  title: "Test"
content:
  vision: "Too short"
`,

  invalidEventTime: `
metadata:
  title: "Test"
  priority: high
  events:
    - event: ${CArtifactEvent.DRAFT}
      timestamp: "not-a-date"
      actor: "John Doe (john@example.com)"
      trigger: "${CEventTrigger.ARTIFACT_CREATED}"
`,
};
