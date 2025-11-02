import type { Artifact, TArtifactEvent } from '@kodebase/core';
import { getCurrentState } from '@kodebase/core';

export type ArtifactCategory = 'initiative' | 'milestone' | 'issue';

export interface DependencyImpact {
  id: string;
  title: string;
  priority: string;
  status: TArtifactEvent;
  artifactType: ArtifactCategory;
}

export interface ValidationCheck {
  id: string;
  label: string;
  status: 'pass' | 'fail';
  durationMs?: number;
  details?: string;
}

export interface ArtifactTemplateContext {
  artifactId: string;
  artifactType: ArtifactCategory;
  changeType: 'add' | 'update';
  artifact: Artifact;
  validationChecks: ValidationCheck[];
  stateMachineEventCount: number;
  stateMachineArtifactType: string;
  dependencies: {
    blocks: DependencyImpact[];
    blockedBy: DependencyImpact[];
  };
}

export interface PRTemplateInput {
  contexts: ArtifactTemplateContext[];
  generatedAt?: string;
}

export function buildPrTitle(contexts: ArtifactTemplateContext[]): string {
  const primary = contexts[0];
  if (!primary) {
    return 'Update Kodebase artifacts';
  }

  const verb = primary.changeType === 'add' ? 'Add' : 'Update';
  const typeLabel = formatArtifactType(primary.artifactType);
  return `${verb} ${typeLabel} ${primary.artifactId}: ${primary.artifact.metadata.title}`;
}

export function buildPrBody(input: PRTemplateInput): string {
  const { contexts, generatedAt } = input;
  const lines: string[] = [];

  lines.push('## Automation Summary');
  lines.push('');
  lines.push(`- Validation completed: ${generatedAt ?? 'N/A'}`);
  lines.push(`- Artifacts processed: ${contexts.length}`);
  lines.push(
    `- Sections generated: Artifact summaries, validation results, impact analysis, and reviewer checklists`,
  );
  lines.push('');

  lines.push('---');
  lines.push('');

  for (const context of contexts) {
    lines.push(...buildArtifactSection(context));
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(
    '*Automated by the Kodebase PR workflow. Content updates on each validation run.*',
  );

  return lines.join('\n');
}

function buildArtifactSection(context: ArtifactTemplateContext): string[] {
  const lines: string[] = [];
  const typeLabel = formatArtifactType(context.artifactType);
  const currentState = getCurrentState(context.artifact.metadata.events);
  const priority = context.artifact.metadata.priority;

  lines.push(`### ${context.artifactId} — ${typeLabel}`);
  lines.push('');
  lines.push(`**Title:** ${context.artifact.metadata.title}`);
  lines.push(`**Priority:** ${priority}`);
  lines.push(`**Current State:** ${currentState}`);
  lines.push(
    `**Change Type:** ${context.changeType === 'add' ? 'New artifact' : 'Updated artifact'}`,
  );
  lines.push('');

  lines.push('#### Validation Results');
  for (const check of context.validationChecks) {
    const statusIcon = check.status === 'pass' ? '✅' : '❌';
    const duration = check.durationMs ? ` (${check.durationMs}ms)` : '';
    const details = check.details ? ` — ${check.details}` : '';
    lines.push(`- ${statusIcon} ${check.label}${duration}${details}`);
  }

  lines.push('');
  lines.push('#### Impact Analysis');
  lines.push(...formatDependencySection('Blocks', context.dependencies.blocks));
  lines.push(
    ...formatDependencySection('Blocked by', context.dependencies.blockedBy),
  );
  lines.push(
    `- Potential cascades: ${context.dependencies.blocks.length > 0 ? 'Downstream artifacts may require follow-up once this PR merges.' : 'None detected.'}`,
  );
  lines.push('');

  lines.push('#### Reviewer Checklist');
  const checklist = getChecklistForType(context.artifactType);
  for (const item of checklist) {
    lines.push(`- [ ] ${item}`);
  }

  return lines;
}

function formatDependencySection(
  label: string,
  dependencies: DependencyImpact[],
): string[] {
  if (dependencies.length === 0) {
    return [`- ${label}: None`];
  }

  const lines: string[] = [`- ${label}:`];
  for (const dependency of dependencies) {
    const typeLabel = formatArtifactType(dependency.artifactType);
    lines.push(
      `  - ${dependency.id} (${typeLabel}) — ${dependency.title} [priority: ${dependency.priority}, state: ${dependency.status}]`,
    );
  }
  return lines;
}

function formatArtifactType(type: ArtifactCategory): string {
  switch (type) {
    case 'initiative':
      return 'Initiative';
    case 'milestone':
      return 'Milestone';
    case 'issue':
      return 'Issue';
    default:
      return type;
  }
}

function getChecklistForType(type: ArtifactCategory): string[] {
  switch (type) {
    case 'initiative':
      return [
        'Confirm strategic alignment and success metrics are documented',
        'Validate milestone relationships accurately reflect execution plan',
        'Ensure downstream teams have acknowledged initiative scope',
      ];
    case 'milestone':
      return [
        'Verify deliverables map to initiative goals',
        'Confirm blocking dependencies are either resolved or tracked',
        'Check success criteria and metrics are measurable',
      ];
    case 'issue':
    default:
      return [
        'Validate implementation covers all acceptance criteria',
        'Review test coverage and automated validation results',
        'Assess impact to dependent artifacts and update documentation if needed',
      ];
  }
}

export function createValidationChecks(options: {
  cliSuccess: boolean;
  durationMs?: number;
  stateMachineEventCount: number;
  stateMachineArtifactType: string;
}): ValidationCheck[] {
  const checks: ValidationCheck[] = [
    {
      id: 'schema-readiness',
      label: 'Schema & readiness validation',
      status: options.cliSuccess ? 'pass' : 'fail',
      durationMs: options.durationMs,
    },
    {
      id: 'state-machine',
      label: 'State machine transitions',
      status: 'pass',
      details: `${options.stateMachineEventCount} events validated for ${options.stateMachineArtifactType}`,
    },
  ];

  return checks;
}

export function deriveArtifactCategory(artifactId: string): ArtifactCategory {
  const dotCount = (artifactId.match(/\./g) || []).length;
  if (dotCount === 0) {
    return 'initiative';
  }
  if (dotCount === 1) {
    return 'milestone';
  }
  return 'issue';
}
