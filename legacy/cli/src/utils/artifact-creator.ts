/**
 * Artifact Creator Utility
 *
 * Handles creation of artifacts based on the new command structure:
 * kodebase create <parent_id> "<idea to be generated>"
 */

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Artifact, ArtifactFactory } from '@kodebase/core';
import { glob } from 'glob';
import type { CreateResult } from '../types/command.js';

/**
 * Determines artifact type based on parent ID
 */
function determineArtifactType(
  parentId?: string,
): 'initiative' | 'milestone' | 'issue' {
  if (!parentId) {
    return 'initiative';
  }

  // Count dots to determine hierarchy level
  const dotCount = (parentId.match(/\./g) || []).length;

  if (dotCount === 0) {
    // Format: A, B, C = Initiative, so create Milestone
    return 'milestone';
  } else if (dotCount === 1) {
    // Format: A.1, B.2 = Milestone, so create Issue
    return 'issue';
  } else {
    throw new Error(
      `Invalid parent ID format: ${parentId}. Expected format: A, A.1`,
    );
  }
}

/**
 * Gets user info from git config
 */
function getUserInfo(): { name: string; email: string } {
  try {
    const name = execSync('git config user.name', { encoding: 'utf8' }).trim();
    const email = execSync('git config user.email', {
      encoding: 'utf8',
    }).trim();

    if (!name || !email) {
      throw new Error('Git user.name and user.email must be configured');
    }

    return { name, email };
  } catch (error) {
    throw new Error(
      `Failed to get git user info: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Loads existing artifacts from the file system
 */
function loadExistingArtifacts(): Map<string, unknown> {
  const artifactsPath = join(process.cwd(), '.kodebase', 'artifacts');
  const artifacts = new Map<string, unknown>();

  try {
    // Find all YAML files in artifacts directory
    const yamlFiles = glob.sync('**/*.yml', { cwd: artifactsPath });

    for (const file of yamlFiles) {
      const filename = file.split('/').pop();
      if (filename) {
        // Extract ID from filename based on current naming patterns:
        // - A.yml -> A (initiative)
        // - A.1.yml -> A.1 (milestone)
        // - A.1.1.title.yml -> A.1.1 (issue)

        if (filename.match(/^[A-Z]\.yml$/)) {
          // Initiative format: A.yml
          const id = filename.replace(/\.yml$/, '');
          artifacts.set(id, {});
        } else if (filename.match(/^[A-Z]\.[0-9]+\.yml$/)) {
          // Milestone format: A.1.yml (check this BEFORE alternative initiative format)
          const id = filename.replace(/\.yml$/, '');
          artifacts.set(id, {});
        } else if (filename.match(/^[A-Z]\.[^.]+\.yml$/)) {
          // Alternative initiative format: A.title.yml
          const id = filename.split('.')[0];
          if (id) {
            artifacts.set(id, {});
          }
        } else if (filename.match(/^[A-Z]\.[0-9]+\.[0-9]+\..*\.yml$/)) {
          // Issue format: A.1.1.title.yml
          const parts = filename.split('.');
          if (parts.length >= 4) {
            const id = `${parts[0]}.${parts[1]}.${parts[2]}`;
            artifacts.set(id, {});
          }
        }
      }
    }
  } catch (_error) {
    // If artifacts directory doesn't exist, return empty map
    console.warn('No existing artifacts found or error loading artifacts');
  }

  return artifacts;
}

/**
 * Generates the directory path for an artifact by finding existing directories
 */
function getArtifactDirectory(id: string): string {
  const artifactsRoot = join(process.cwd(), '.kodebase', 'artifacts');

  if (!id.includes('.')) {
    // Initiative: A -> find existing A.* directory
    const initiativeDirs = glob.sync(`${id}.*`, { cwd: artifactsRoot });
    if (initiativeDirs.length > 0) {
      const firstDir = initiativeDirs[0];
      if (firstDir) {
        return join(artifactsRoot, firstDir);
      }
    }
    return join(artifactsRoot, `${id}.new-initiative`);
  } else if ((id.match(/\./g) || []).length === 1) {
    // Milestone: A.1 -> find existing A.*/A.1.* directory
    const [initiative] = id.split('.');
    const initiativeDirs = glob.sync(`${initiative}.*`, { cwd: artifactsRoot });
    if (initiativeDirs.length > 0) {
      const firstInitiativeDir = initiativeDirs[0];
      if (firstInitiativeDir) {
        const milestoneDirs = glob.sync(`${id}.*`, {
          cwd: join(artifactsRoot, firstInitiativeDir),
        });
        if (milestoneDirs.length > 0) {
          const firstMilestoneDir = milestoneDirs[0];
          if (firstMilestoneDir) {
            return join(artifactsRoot, firstInitiativeDir, firstMilestoneDir);
          }
        }
        return join(artifactsRoot, firstInitiativeDir, `${id}.new-milestone`);
      }
    }
    return join(
      artifactsRoot,
      `${initiative || 'UNKNOWN'}.new-initiative`,
      `${id}.new-milestone`,
    );
  } else {
    // Issue: A.1.1 -> find existing A.*/A.1.* directory
    const parts = id.split('.');
    const initiative = parts[0] || 'UNKNOWN';
    const milestone = parts.slice(0, 2).join('.');

    const initiativeDirs = glob.sync(`${initiative}.*`, { cwd: artifactsRoot });
    if (initiativeDirs.length > 0) {
      const firstInitiativeDir = initiativeDirs[0];
      if (firstInitiativeDir) {
        const milestoneDirs = glob.sync(`${milestone}.*`, {
          cwd: join(artifactsRoot, firstInitiativeDir),
        });
        if (milestoneDirs.length > 0) {
          const firstMilestoneDir = milestoneDirs[0];
          if (firstMilestoneDir) {
            return join(artifactsRoot, firstInitiativeDir, firstMilestoneDir);
          }
        }
      }
    }
    return join(
      artifactsRoot,
      `${initiative}.new-initiative`,
      `${milestone}.new-milestone`,
    );
  }
}

/**
 * Creates a basic draft artifact with required fields
 */
function createBasicDraft(
  type: 'initiative' | 'milestone' | 'issue',
  idea: string,
) {
  switch (type) {
    case 'initiative':
      return {
        vision: `Vision for: ${idea}`,
        scope: `Scope to be defined for: ${idea}`,
        success_criteria: [`Success criteria for: ${idea}`],
      };
    case 'milestone':
      return {
        summary: `Summary for: ${idea}`,
        deliverables: [`Deliverables for: ${idea}`],
        validation: [`Validation criteria for: ${idea}`],
      };
    case 'issue':
      return {
        summary: `Summary for: ${idea}`,
        acceptance_criteria: [`Acceptance criteria for: ${idea}`],
      };
    default:
      throw new Error(`Unknown artifact type: ${type}`);
  }
}

/**
 * Wizard data structure for artifact creation
 */
export interface WizardArtifactData {
  type: 'initiative' | 'milestone' | 'issue';
  title: string;
  assignee: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimation: 'XS' | 'S' | 'M' | 'L' | 'XL';
  description: string;
  acceptanceCriteria: string[];
  blocks: string[];
  blockedBy: string[];
  parentId?: string;
}

/**
 * Creates a wizard branch for artifact creation
 */
async function createWizardBranch(artifactId: string): Promise<void> {
  const branchName = `add-${artifactId}`;

  try {
    // Check if branch exists
    const branches = execSync('git branch --list', { encoding: 'utf8' });
    const branchExists = branches.includes(branchName);

    if (!branchExists) {
      // Create new branch
      execSync(`git checkout -b ${branchName}`);
      console.log(`✓ Created wizard branch: ${branchName}`);
    } else {
      // Switch to existing branch
      execSync(`git checkout ${branchName}`);
      console.log(`✓ Resumed wizard branch: ${branchName}`);
    }
  } catch (error) {
    console.warn(
      `Could not create wizard branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Creates an artifact from wizard data or basic parent/idea combination
 */
export async function createArtifact(
  parentIdOrWizardData: string | undefined | WizardArtifactData,
  ideaOrTitle?: string,
  wizardData?: WizardArtifactData,
  options?: { submit?: boolean },
): Promise<CreateResult> {
  const startTime = performance.now();

  try {
    // Handle different calling patterns
    let isWizardMode = false;
    let parentId: string | undefined;
    let idea: string;
    let wizardConfig: WizardArtifactData | undefined;

    if (
      typeof parentIdOrWizardData === 'object' &&
      parentIdOrWizardData !== null
    ) {
      // Called with wizard data as first parameter
      isWizardMode = true;
      wizardConfig = parentIdOrWizardData;
      parentId = wizardConfig.parentId;
      idea = wizardConfig.title;
    } else if (wizardData) {
      // Called with wizard data as third parameter
      isWizardMode = true;
      wizardConfig = wizardData;
      parentId = parentIdOrWizardData;
      idea = ideaOrTitle || wizardConfig.title;
    } else {
      // Traditional calling pattern
      parentId = parentIdOrWizardData;
      idea = ideaOrTitle || '';
    }

    // Determine artifact type
    const type =
      isWizardMode && wizardConfig
        ? wizardConfig.type
        : determineArtifactType(parentId);

    // Get user info
    const user = getUserInfo();

    // Load existing artifacts
    const existingArtifacts = loadExistingArtifacts();

    // Create factory
    const factory = new ArtifactFactory(existingArtifacts);

    // Generate title from idea (truncated for title)
    const title = idea.length > 50 ? `${idea.substring(0, 47)}...` : idea;

    // Create content based on mode
    let basicContent:
      | { vision: string; scope: string; success_criteria: string[] }
      | { summary: string; deliverables: string[]; validation: string[] }
      | { summary: string; acceptance_criteria: string[] };
    if (isWizardMode && wizardConfig) {
      // Use wizard data for content
      if (type === 'initiative') {
        basicContent = {
          vision: wizardConfig.description,
          scope: `Scope to be defined for: ${wizardConfig.title}`,
          success_criteria:
            wizardConfig.acceptanceCriteria.length > 0
              ? wizardConfig.acceptanceCriteria
              : [`Success criteria for: ${wizardConfig.title}`],
        };
      } else if (type === 'milestone') {
        basicContent = {
          summary: wizardConfig.description,
          deliverables:
            wizardConfig.acceptanceCriteria.length > 0
              ? wizardConfig.acceptanceCriteria
              : [`Deliverables for: ${wizardConfig.title}`],
          validation: [`Validation criteria for: ${wizardConfig.title}`],
        };
      } else {
        basicContent = {
          summary: wizardConfig.description,
          acceptance_criteria:
            wizardConfig.acceptanceCriteria.length > 0
              ? wizardConfig.acceptanceCriteria
              : [`Acceptance criteria for: ${wizardConfig.title}`],
        };
      }
    } else {
      // Create basic draft content
      basicContent = createBasicDraft(type, idea);
    }

    let result: { artifact: Artifact; id: string };

    // Create artifact based on type
    const baseOptions = {
      user,
      title,
      // Override with wizard data if available
      ...(isWizardMode &&
        wizardConfig && {
          priority: wizardConfig.priority,
          estimation: wizardConfig.estimation,
          assignee: wizardConfig.assignee,
        }),
    };

    if (type === 'initiative') {
      const content = basicContent as {
        vision: string;
        scope: string;
        success_criteria: string[];
      };
      result = factory.createInitiative({
        ...baseOptions,
        vision: content.vision,
        scope: content.scope,
        success_criteria: content.success_criteria,
      });
    } else if (type === 'milestone') {
      if (!parentId) {
        throw new Error('Parent ID required for milestone creation');
      }
      const content = basicContent as {
        summary: string;
        deliverables: string[];
        validation: string[];
      };
      result = factory.createMilestone({
        ...baseOptions,
        parent_initiative_id: parentId,
        summary: content.summary,
        deliverables: content.deliverables,
        validation: content.validation,
      });
    } else {
      if (!parentId) {
        throw new Error('Parent ID required for issue creation');
      }
      const content = basicContent as {
        summary: string;
        acceptance_criteria: string[];
      };
      result = factory.createIssue({
        ...baseOptions,
        parent_milestone_id: parentId,
        summary: content.summary,
        acceptance_criteria: content.acceptance_criteria,
      });
    }

    // Determine file path
    const artifactDir = getArtifactDirectory(result.id);
    const filePath = join(artifactDir, `${result.id}.yml`);

    // Create directory if it doesn't exist
    mkdirSync(artifactDir, { recursive: true });

    // Handle relationships from wizard data
    const relationships = {
      blocks: isWizardMode && wizardConfig ? wizardConfig.blocks : [],
      blocked_by: isWizardMode && wizardConfig ? wizardConfig.blockedBy : [],
    };

    // Convert artifact to YAML and write to file
    const yamlContent = `metadata:
  title: ${result.artifact.metadata.title}
  priority: ${result.artifact.metadata.priority}
  estimation: ${result.artifact.metadata.estimation}
  created_by: ${result.artifact.metadata.created_by}
  assignee: ${result.artifact.metadata.assignee}
  schema_version: ${result.artifact.metadata.schema_version}
  relationships:
    blocks: ${relationships.blocks.length > 0 ? `[${relationships.blocks.map((id) => `"${id}"`).join(', ')}]` : '[]'}
    blocked_by: ${relationships.blocked_by.length > 0 ? `[${relationships.blocked_by.map((id) => `"${id}"`).join(', ')}]` : '[]'}
  events:
    - event: ${result.artifact.metadata.events[0]?.event}
      timestamp: ${result.artifact.metadata.events[0]?.timestamp}
      actor: ${result.artifact.metadata.events[0]?.actor}
      trigger: artifact_created

content:
${Object.entries(result.artifact.content)
  .map(([key, value]) => {
    if (Array.isArray(value)) {
      return `  ${key}:\n${value.map((item) => `    - "${item}"`).join('\n')}`;
    }
    return `  ${key}: "${value}"`;
  })
  .join('\n')}

notes:
  llm_generation_prompt: "${idea}"
  status: "Draft created from idea - requires LLM generation"
`;

    writeFileSync(filePath, yamlContent, 'utf8');

    // Create wizard branch after we have the artifact ID
    await createWizardBranch(result.id);

    // Check response time
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    if (responseTime > 100) {
      console.warn(
        `Response time exceeded 100ms: ${responseTime.toFixed(2)}ms`,
      );
    }

    // Handle --submit flag
    if (options?.submit) {
      try {
        // Import submission utility
        const { submitArtifact } = await import('./submission.js');

        // Commit the artifact first
        execSync(`git add ${filePath}`);
        execSync(
          `git commit -m "${result.id}: Add draft artifact for ${title}"`,
        );
        execSync(`git push --set-upstream origin add-${result.id}`);

        console.log('\n📋 Starting submission process...');

        // Use the submission utility
        const submissionResult = await submitArtifact({
          artifactId: result.id,
          isNewArtifact: true,
          verbose: true,
        });

        if (submissionResult.success) {
          console.log(`✅ ${submissionResult.message}`);
          if (submissionResult.prUrl) {
            console.log(`🔗 PR: ${submissionResult.prUrl}`);
          }
        } else {
          console.error(`❌ ${submissionResult.message}`);
          if (submissionResult.validationErrors) {
            console.error('Validation errors:');
            submissionResult.validationErrors.forEach((error) =>
              console.error(`  - ${error}`),
            );
          }
          if (submissionResult.error) {
            console.error(`Error: ${submissionResult.error}`);
          }
        }
      } catch (error) {
        console.error(
          `Failed to submit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return {
      type,
      filePath,
      id: result.id,
    };
  } catch (error) {
    throw new Error(
      `Failed to create artifact: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
