import { describe, expect, it } from 'vitest';
import type { Artifact } from '@kodebase/core';
import {
  buildPrBody,
  buildPrTitle,
  createValidationChecks,
  deriveArtifactCategory,
  type ArtifactTemplateContext,
} from '../pr-template';

function createMockArtifact(): Artifact {
  return {
    metadata: {
      title: 'Example Artifact',
      priority: 'high',
      estimation: 'S',
      created_by: 'Miguel Carvalho (m@kodebase.ai)',
      assignee: 'Miguel Carvalho (m@kodebase.ai)',
      schema_version: '0.1.0',
      relationships: { blocks: [], blocked_by: [] },
      events: [
        {
          event: 'draft',
          timestamp: '2025-01-01T00:00:00Z',
          actor: 'Miguel Carvalho (m@kodebase.ai)',
          trigger: 'artifact_created',
        },
        {
          event: 'ready',
          timestamp: '2025-01-02T00:00:00Z',
          actor: 'Miguel Carvalho (m@kodebase.ai)',
          trigger: 'dependencies_met',
        },
        {
          event: 'in_progress',
          timestamp: '2025-01-03T00:00:00Z',
          actor: 'Miguel Carvalho (m@kodebase.ai)',
          trigger: 'branch_created',
        },
      ],
    },
    content: {
      summary: 'Implements automation for testing.',
      acceptance_criteria: ['Generate automation summary'],
    },
  } as Artifact;
}

describe('PR template generation', () => {
  it('builds a structured PR title and body for a single artifact', () => {
    const artifact = createMockArtifact();
    const artifactId = 'I.2.2';
    const artifactType = deriveArtifactCategory(artifactId);

    const context: ArtifactTemplateContext = {
      artifactId,
      artifactType,
      changeType: 'update',
      artifact,
      validationChecks: createValidationChecks({
        cliSuccess: true,
        durationMs: 1200,
        stateMachineEventCount: 3,
        stateMachineArtifactType: 'issue',
      }),
      stateMachineEventCount: 3,
      stateMachineArtifactType: 'issue',
      dependencies: {
        blocks: [],
        blockedBy: [],
      },
    };

    const title = buildPrTitle([context]);
    const body = buildPrBody({
      contexts: [context],
      generatedAt: '2025-09-19T19:15:00Z',
    });

    expect(title).toBe('Update Issue I.2.2: Example Artifact');
    expect(body).toContain('## Automation Summary');
    expect(body).toContain('Validation completed: 2025-09-19T19:15:00Z');
    expect(body).toContain('### I.2.2 — Issue');
    expect(body).toContain('#### Validation Results');
    expect(body).toContain('Schema & readiness validation');
    expect(body).toContain('#### Impact Analysis');
    expect(body).toContain('#### Reviewer Checklist');
  });
});
