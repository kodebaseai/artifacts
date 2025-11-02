import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { minimatch } from 'minimatch';

export type ArtifactCategory = 'initiative' | 'milestone' | 'issue';

export interface IssueAreaRule {
  pattern: string;
  reviewers: string[];
}

export interface ReviewerRuleConfig {
  productArchitecture?: string[];
  technicalLeads?: string[];
  issues?: {
    default?: string[];
    areas?: IssueAreaRule[];
  };
}

export interface ReviewerAssignmentOptions {
  artifactType: ArtifactCategory;
  changedFiles: string[];
  repoPath: string;
  configPath?: string;
  rules?: ReviewerRuleConfig;
}

export function loadReviewerRules(
  repoPath: string,
  configPath?: string,
): ReviewerRuleConfig {
  const path = resolve(repoPath, configPath ?? 'config/pr-reviewer-rules.json');

  if (!existsSync(path)) {
    return {};
  }

  try {
    const raw = readFileSync(path, 'utf8');
    return JSON.parse(raw) as ReviewerRuleConfig;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error parsing rules';
    throw new Error(`Failed to read reviewer rules: ${message}`);
  }
}

function uniqueReviewers(reviewers: string[]): string[] {
  return Array.from(new Set(reviewers.filter(Boolean)));
}

function getIssueReviewers(
  rules: ReviewerRuleConfig,
  changedFiles: string[],
): string[] {
  const issueRules = rules.issues;
  if (!issueRules) {
    return [];
  }

  const matches = new Set<string>();

  if (issueRules.areas?.length) {
    for (const rule of issueRules.areas) {
      const anyMatch = changedFiles.some((file) =>
        minimatch(file, rule.pattern, { dot: true }),
      );

      if (anyMatch) {
        for (const reviewer of rule.reviewers) {
          matches.add(reviewer);
        }
      }
    }
  }

  if (matches.size > 0) {
    return Array.from(matches);
  }

  return issueRules.default ? [...issueRules.default] : [];
}

export function assignReviewers(options: ReviewerAssignmentOptions): string[] {
  const rules =
    options.rules ?? loadReviewerRules(options.repoPath, options.configPath);

  switch (options.artifactType) {
    case 'initiative':
      return uniqueReviewers(rules.productArchitecture ?? []);
    case 'milestone':
      return uniqueReviewers(rules.technicalLeads ?? []);
    case 'issue':
      return uniqueReviewers(
        getIssueReviewers(rules, options.changedFiles ?? []),
      );
    default:
      return [];
  }
}
