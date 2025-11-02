import { describe, expect, it } from 'vitest';
import { deriveArtifactCategory } from '../pr-template';
import { assignReviewers } from '../reviewer-assignment';

const repoPath = process.cwd();

const rules = {
  productArchitecture: ['owner-product'],
  technicalLeads: ['tech-lead'],
  issues: {
    default: ['default-reviewer'],
    areas: [
      { pattern: 'packages/core/**', reviewers: ['core-owner'] },
      { pattern: 'apps/web/**', reviewers: ['web-owner'] },
    ],
  },
} as const;

describe('Reviewer assignment', () => {
  it('assigns product reviewers for initiatives', () => {
    const reviewers = assignReviewers({
      artifactType: 'initiative',
      changedFiles: [],
      repoPath,
      rules,
    });

    expect(reviewers).toContain('owner-product');
  });

  it('assigns code-owner reviewers for issue areas', () => {
    const reviewers = assignReviewers({
      artifactType: 'issue',
      changedFiles: ['packages/core/src/index.ts'],
      repoPath,
      rules,
    });

    expect(reviewers).toContain('core-owner');
  });

  it('falls back to default issue reviewers when no area matches', () => {
    const reviewers = assignReviewers({
      artifactType: 'issue',
      changedFiles: ['docs/README.md'],
      repoPath,
      rules,
    });

    expect(reviewers).toContain('default-reviewer');
  });

  it('derives artifact type based on identifier depth', () => {
    expect(deriveArtifactCategory('I')).toBe('initiative');
    expect(deriveArtifactCategory('I.2')).toBe('milestone');
    expect(deriveArtifactCategory('I.2.3')).toBe('issue');
  });
});
