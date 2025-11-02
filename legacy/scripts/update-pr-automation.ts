import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import { execSync } from 'node:child_process';
import {
  ArtifactLoader,
  buildPrBody,
  buildPrTitle,
  createValidationChecks,
  deriveArtifactCategory,
  assignReviewers,
  loadReviewerRules,
  type ArtifactTemplateContext,
  type ArtifactCategory,
  type DependencyImpact,
} from '@kodebase/git-ops';
import type { Artifact } from '@kodebase/core';
import { getCurrentState } from '@kodebase/core';
import { Octokit } from '@octokit/rest';

interface ValidationReportEntry {
  relativePath: string;
  cli: {
    summary: {
      success: boolean;
      duration: number;
    };
  };
  stateMachine: {
    eventCount: number;
    artifactType: string;
  };
}

interface ValidationReportFile {
  generatedAt?: string;
  reports: ValidationReportEntry[];
}

async function main() {
  const prNumberValue = process.env.PR_NUMBER;
  const token = process.env.GITHUB_TOKEN;
  const changedArtifactsRaw = process.env.CHANGED_ARTIFACTS;
  const changedFilesRaw = process.env.CHANGED_FILES;
  const reportPath =
    process.env.VALIDATION_REPORT_PATH ?? 'validation-report.json';
  const baseSha = process.env.GITHUB_BASE_SHA;
  const repoSlug = process.env.GITHUB_REPOSITORY;

  if (!prNumberValue) {
    throw new Error('PR_NUMBER is required to update pull request metadata.');
  }

  if (!token) {
    throw new Error('GITHUB_TOKEN is required for PR updates.');
  }

  if (!repoSlug) {
    throw new Error('GITHUB_REPOSITORY is not defined.');
  }

  const [owner, repo] = repoSlug.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid repository slug: ${repoSlug}`);
  }

  const prNumber = Number.parseInt(prNumberValue, 10);
  if (Number.isNaN(prNumber)) {
    throw new Error(`PR_NUMBER must be numeric. Received: ${prNumberValue}`);
  }

  const artifactPaths: string[] = parseJsonArray(changedArtifactsRaw);
  if (artifactPaths.length === 0) {
    console.log(
      'No changed artifact files detected. Skipping PR automation update.',
    );
    return;
  }

  const changedFiles: string[] = parseJsonArray(changedFilesRaw);

  const validationData = await loadValidationReport(reportPath);
  const loader = new ArtifactLoader();
  const repoPath = process.cwd();
  const contexts: ArtifactTemplateContext[] = [];

  for (const relativePath of artifactPaths) {
    const artifactId = extractArtifactId(relativePath);
    if (!artifactId) {
      console.warn(`Unable to infer artifact ID from path: ${relativePath}`);
      continue;
    }

    let artifact: Artifact;
    try {
      artifact = await loader.loadArtifact(artifactId, repoPath);
    } catch (error) {
      console.warn(`Skipping artifact ${artifactId}: ${error}`);
      continue;
    }

    const artifactType = deriveArtifactCategory(artifactId);
    const validationEntry = validationData?.reports.find(
      (report) => report.relativePath === relativePath,
    );

    const changeType = determineChangeType(relativePath, baseSha);
    const stateMachineInfo = validationEntry?.stateMachine ?? {
      eventCount: artifact.metadata.events.length,
      artifactType,
    };

    const validationChecks = createValidationChecks({
      cliSuccess: validationEntry?.cli.summary.success ?? true,
      durationMs: validationEntry?.cli.summary.duration,
      stateMachineEventCount: stateMachineInfo.eventCount,
      stateMachineArtifactType: stateMachineInfo.artifactType,
    });

    const dependencies = await resolveDependencies(artifact, repoPath, loader);

    contexts.push({
      artifact,
      artifactId,
      artifactType,
      changeType,
      validationChecks,
      stateMachineEventCount: stateMachineInfo.eventCount,
      stateMachineArtifactType: stateMachineInfo.artifactType,
      dependencies,
    });
  }

  if (contexts.length === 0) {
    console.log(
      'No artifact contexts generated. PR automation update is skipped.',
    );
    return;
  }

  const title = buildPrTitle(contexts);
  const body = buildPrBody({
    contexts,
    generatedAt: validationData?.generatedAt,
  });

  const octokit = new Octokit({ auth: token });

  await octokit.pulls.update({
    owner,
    repo,
    pull_number: prNumber,
    title,
    body,
  });

  const reviewerRules = loadReviewerRules(repoPath);
  const reviewerSet = new Set<string>();

  for (const context of contexts) {
    const reviewers = assignReviewers({
      artifactType: context.artifactType,
      changedFiles,
      repoPath,
      configPath: 'config/pr-reviewer-rules.json',
      rules: reviewerRules,
    });

    for (const reviewer of reviewers) {
      reviewerSet.add(reviewer);
    }
  }

  const reviewers = Array.from(reviewerSet).filter(Boolean);

  if (reviewers.length > 0) {
    await syncReviewers({
      owner,
      repo,
      prNumber,
      reviewers,
      octokit,
    });
  }

  console.log(
    `✓ Updated PR #${prNumber} with automated description and reviewer assignments.`,
  );
  console.log(`  • Title: ${title}`);
  console.log(`  • Reviewers: ${reviewers.join(', ') || 'None'}`);
}

function parseJsonArray(rawValue: string | undefined): string[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

async function loadValidationReport(
  reportPath: string,
): Promise<ValidationReportFile | null> {
  if (!existsSync(reportPath)) {
    return null;
  }

  try {
    const raw = await readFile(reportPath, 'utf8');
    return JSON.parse(raw) as ValidationReportFile;
  } catch (error) {
    console.warn(
      `Failed to parse validation report at ${reportPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

function extractArtifactId(filePath: string): string | null {
  const fileName = basename(filePath, '.yml');
  const match = fileName.match(/^[A-Z]+(?:\.[0-9]+)*/);
  return match ? match[0] : null;
}

function determineChangeType(
  relativePath: string,
  baseSha: string | undefined,
): 'add' | 'update' {
  if (!baseSha) {
    return 'update';
  }

  try {
    execSync(`git cat-file -e ${baseSha}:${relativePath}`, {
      stdio: 'ignore',
    });
    return 'update';
  } catch {
    return 'add';
  }
}

async function resolveDependencies(
  artifact: Artifact,
  repoPath: string,
  loader: ArtifactLoader,
): Promise<{ blocks: DependencyImpact[]; blockedBy: DependencyImpact[] }> {
  const relationships = artifact.metadata.relationships ?? {
    blocks: [],
    blocked_by: [],
  };

  const blocks = await Promise.all(
    relationships.blocks.map((id) =>
      loadDependencyImpact(id, repoPath, loader),
    ),
  );

  const blockedBy = await Promise.all(
    relationships.blocked_by.map((id) =>
      loadDependencyImpact(id, repoPath, loader),
    ),
  );

  return {
    blocks: blocks.filter(Boolean) as DependencyImpact[],
    blockedBy: blockedBy.filter(Boolean) as DependencyImpact[],
  };
}

async function loadDependencyImpact(
  artifactId: string,
  repoPath: string,
  loader: ArtifactLoader,
): Promise<DependencyImpact | null> {
  try {
    const dependency = await loader.loadArtifact(artifactId, repoPath);
    const artifactType = deriveArtifactCategory(artifactId);
    return {
      id: artifactId,
      title: dependency.metadata.title,
      priority: dependency.metadata.priority,
      status: getCurrentState(dependency.metadata.events),
      artifactType,
    };
  } catch {
    // If dependency file is missing, still return placeholder to highlight impact
    return {
      id: artifactId,
      title: 'Unknown artifact',
      priority: 'unknown',
      status: 'draft',
      artifactType: deriveArtifactCategory(artifactId) as ArtifactCategory,
    };
  }
}

async function syncReviewers({
  owner,
  repo,
  prNumber,
  reviewers,
  octokit,
}: {
  owner: string;
  repo: string;
  prNumber: number;
  reviewers: string[];
  octokit: Octokit;
}): Promise<void> {
  const current = await octokit.pulls.listRequestedReviewers({
    owner,
    repo,
    pull_number: prNumber,
  });

  const existing = current.data.users?.map((user) => user.login) ?? [];
  const existingSet = new Set(existing);
  const desiredSet = new Set(reviewers);

  const toRemove = existing.filter((login) => !desiredSet.has(login));
  const toAdd = reviewers.filter((login) => !existingSet.has(login));

  if (toRemove.length > 0) {
    await octokit.pulls.removeRequestedReviewers({
      owner,
      repo,
      pull_number: prNumber,
      reviewers: toRemove,
    });
  }

  if (toAdd.length > 0) {
    await octokit.pulls.requestReviewers({
      owner,
      repo,
      pull_number: prNumber,
      reviewers: toAdd,
    });
  }
}

main().catch((error) => {
  console.error('✗ Failed to update PR automation summary');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
