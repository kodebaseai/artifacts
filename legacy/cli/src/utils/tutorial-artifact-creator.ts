/**
 * Tutorial Artifact Creator
 *
 * Creates artifacts specifically for tutorial purposes within sandbox environment.
 * Uses simplified creation logic focused on educational value rather than full features.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ArtifactFactory } from '@kodebase/core';
import type { Artifact } from '@kodebase/core';
import { getWorkingDirectory } from './sandbox.js';

export interface TutorialArtifactResult {
  success: boolean;
  artifact?: Artifact;
  filePath?: string;
  error?: string;
  commandResults?: string;
}

/**
 * Creates an initiative for tutorial purposes
 */
export async function createTutorialInitiative(
  sandboxPath: string,
  title: string,
): Promise<TutorialArtifactResult> {
  try {
    const workingDir = getWorkingDirectory(sandboxPath);

    // Create factory instance (empty for tutorial - no existing artifacts to check)
    const factory = new ArtifactFactory(new Map());

    // Create initiative artifact
    const result = factory.createInitiative({
      user: {
        name: 'Tutorial User',
        email: 'tutorial@example.com',
      },
      title,
      vision: `Learn kodebase by building: ${title}`,
      scope: 'Tutorial project to demonstrate kodebase concepts and workflows',
      success_criteria: [
        'Complete tutorial walkthrough',
        'Understand artifact hierarchy',
        'Practice CLI commands',
      ],
    });

    // Create directory structure
    const artifactsDir = join(workingDir, '.kodebase', 'artifacts');
    const initiativeDir = join(
      artifactsDir,
      `${result.id}.tutorial-initiative`,
    );

    mkdirSync(initiativeDir, { recursive: true });

    // Write artifact file (using JSON for now - will convert to YAML format later)
    const filePath = join(initiativeDir, `${result.id}.yml`);
    const yamlContent = `# Tutorial Initiative: ${result.artifact.metadata.title}
# Created during kodebase tutorial

metadata:
  title: "${result.artifact.metadata.title}"
  priority: ${result.artifact.metadata.priority}
  estimation: ${result.artifact.metadata.estimation}
  created_by: "${result.artifact.metadata.created_by}"
  assignee: "${result.artifact.metadata.assignee}"
  schema_version: "${result.artifact.metadata.schema_version}"
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: "${result.artifact.metadata.events[0]?.event}"
      timestamp: "${result.artifact.metadata.events[0]?.timestamp}"
      actor: "${result.artifact.metadata.events[0]?.actor}"
      trigger: "${result.artifact.metadata.events[0]?.trigger || 'artifact_created'}"

content:
  vision: "${result.artifact.content.vision}"
  scope: "${result.artifact.content.scope}"
  success_criteria:
${result.artifact.content.success_criteria?.map((criterion) => `    - "${criterion}"`).join('\n') || ''}

notes:
  tutorial: true
  created_by_tutorial: true
`;
    writeFileSync(filePath, yamlContent);

    return {
      success: true,
      artifact: result.artifact,
      filePath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Creates a milestone for tutorial purposes
 */
export async function createTutorialMilestone(
  sandboxPath: string,
  title: string,
  parentId: string = 'A',
): Promise<TutorialArtifactResult> {
  try {
    const workingDir = getWorkingDirectory(sandboxPath);

    // Create factory instance with existing initiative
    const existingArtifacts = new Map();
    existingArtifacts.set(parentId, {}); // Mock existing initiative
    const factory = new ArtifactFactory(existingArtifacts);

    // Create milestone artifact
    const result = factory.createMilestone({
      user: {
        name: 'Tutorial User',
        email: 'tutorial@example.com',
      },
      title,
      parent_initiative_id: parentId,
      summary: `Tutorial milestone: ${title}`,
      deliverables: [
        'Learn milestone concepts',
        'Understand parent-child relationships',
        'Practice CLI milestone commands',
      ],
      validation: [
        'Milestone created successfully',
        'Proper directory structure established',
        'YAML file validates against schema',
      ],
    });

    // Create directory structure
    const artifactsDir = join(workingDir, '.kodebase', 'artifacts');
    const initiativeDir = join(artifactsDir, `${parentId}.tutorial-initiative`);
    const milestoneDir = join(initiativeDir, `${result.id}.tutorial-milestone`);

    mkdirSync(milestoneDir, { recursive: true });

    // Write artifact file (simplified YAML for tutorial)
    const filePath = join(milestoneDir, `${result.id}.yml`);
    const yamlContent = `# Tutorial Milestone: ${result.artifact.metadata.title}

metadata:
  title: "${result.artifact.metadata.title}"
  priority: ${result.artifact.metadata.priority}
  estimation: ${result.artifact.metadata.estimation}
  created_by: "${result.artifact.metadata.created_by}"
  assignee: "${result.artifact.metadata.assignee}"
  schema_version: "${result.artifact.metadata.schema_version}"

content:
  summary: "${result.artifact.content.summary}"
  deliverables:
${result.artifact.content.deliverables?.map((item) => `    - "${item}"`).join('\n') || ''}
  validation:
${result.artifact.content.validation?.map((item) => `    - "${item}"`).join('\n') || ''}

notes:
  tutorial: true
`;
    writeFileSync(filePath, yamlContent);

    return {
      success: true,
      artifact: result.artifact,
      filePath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Creates an issue for tutorial purposes
 */
export async function createTutorialIssue(
  sandboxPath: string,
  title: string,
  parentId: string = 'A.1',
): Promise<TutorialArtifactResult> {
  try {
    const workingDir = getWorkingDirectory(sandboxPath);

    // Create factory instance with existing artifacts
    const existingArtifacts = new Map();
    existingArtifacts.set('A', {}); // Mock existing initiative
    existingArtifacts.set(parentId, {}); // Mock existing milestone
    const factory = new ArtifactFactory(existingArtifacts);

    // Create issue artifact
    const result = factory.createIssue({
      user: {
        name: 'Tutorial User',
        email: 'tutorial@example.com',
      },
      title,
      parent_milestone_id: parentId,
      summary: `Tutorial issue: ${title}`,
      acceptance_criteria: [
        'Understand issue concepts and structure',
        'Practice creating detailed work items',
        'Learn acceptance criteria definition',
        'Experience complete artifact hierarchy',
      ],
    });

    // Create directory structure
    const artifactsDir = join(workingDir, '.kodebase', 'artifacts');
    const initiativeDir = join(artifactsDir, 'A.tutorial-initiative');
    const milestoneDir = join(initiativeDir, 'A.1.tutorial-milestone');

    mkdirSync(milestoneDir, { recursive: true });

    // Write artifact file (simplified YAML for tutorial)
    const filePath = join(milestoneDir, `${result.id}.tutorial-issue.yml`);
    const yamlContent = `# Tutorial Issue: ${result.artifact.metadata.title}

metadata:
  title: "${result.artifact.metadata.title}"
  priority: ${result.artifact.metadata.priority}
  estimation: ${result.artifact.metadata.estimation}
  created_by: "${result.artifact.metadata.created_by}"
  assignee: "${result.artifact.metadata.assignee}"
  schema_version: "${result.artifact.metadata.schema_version}"

content:
  summary: "${result.artifact.content.summary}"
  acceptance_criteria:
${result.artifact.content.acceptance_criteria?.map((item) => `    - "${item}"`).join('\n') || ''}

notes:
  tutorial: true
`;
    writeFileSync(filePath, yamlContent);

    return {
      success: true,
      artifact: result.artifact,
      filePath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Demonstrates Git workflow integration within the sandbox
 */
export async function demonstrateGitWorkflow(
  sandboxPath: string,
): Promise<TutorialArtifactResult> {
  try {
    const workingDir = getWorkingDirectory(sandboxPath);

    // First, update the issue A.1.1 to "ready" status
    const issueFilePath = join(
      workingDir,
      '.kodebase',
      'artifacts',
      'A.tutorial-initiative',
      'A.1.tutorial-milestone',
      'A.1.1.tutorial-issue.yml',
    );

    // Read current issue content and update with ready status
    const { execSync } = await import('node:child_process');
    const { readFileSync } = await import('node:fs');

    // Check if issue file exists
    try {
      const currentContent = readFileSync(issueFilePath, 'utf8');

      // Add ready event to demonstrate status change
      const updatedContent = currentContent.replace(
        /notes:\s*tutorial:\s*true/,
        `events:
  - timestamp: "2025-01-15T10:30:00Z"
    event: draft
    actor: "Tutorial User (tutorial@example.com)"
  - timestamp: "${new Date().toISOString()}"
    event: ready
    actor: "Tutorial User (tutorial@example.com)"
    metadata:
      tutorial_demo: true

notes:
  tutorial: true
  git_workflow_demo: true`,
      );

      writeFileSync(issueFilePath, updatedContent);

      // Simulate Git workflow in sandbox
      const gitCommands = [
        'git status',
        'git add .',
        'git commit -m "Tutorial: Mark A.1.1 as ready"',
        'git branch A.1.1 2>/dev/null || git checkout -b A.1.1',
        'git status',
      ];

      let commandResults = '';
      for (const command of gitCommands) {
        try {
          const result = execSync(command, {
            cwd: workingDir,
            encoding: 'utf8',
            stdio: 'pipe',
          });
          commandResults += `$ ${command}\n${result}\n\n`;
        } catch (_error) {
          // Some commands might fail in sandbox, that's ok for demo
          commandResults += `$ ${command}\n[Demo command - would run in real workflow]\n\n`;
        }
      }

      return {
        success: true,
        filePath: issueFilePath,
        commandResults,
      };
    } catch (_fileError) {
      // If issue file doesn't exist, create a simple demonstration
      return {
        success: true,
        filePath: sandboxPath,
        commandResults: 'Git workflow demonstration completed (simulated)',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Lists all tutorial artifacts created in sandbox
 */
export function listTutorialArtifacts(sandboxPath: string): string[] {
  try {
    const workingDir = getWorkingDirectory(sandboxPath);
    const _artifactsDir = join(workingDir, '.kodebase', 'artifacts');

    const artifacts: string[] = [];

    // This is a simplified listing for tutorial purposes
    // In a real implementation, we'd scan the directory structure
    return artifacts;
  } catch (_error) {
    return [];
  }
}
