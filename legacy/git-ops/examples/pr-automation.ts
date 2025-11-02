/**
 * PR Automation Example
 *
 * This example demonstrates how to automate PR operations:
 * creating, updating, listing, and merging pull requests.
 */

import { PRManager } from '@kodebase/git-ops';

async function prAutomation() {
  const prManager = new PRManager();
  const repoPath = process.cwd();

  // Create a draft PR
  console.log('Creating draft PR...');
  const createResult = await prManager.createDraftPR({
    branch: 'A.1.5',
    title: 'Implement email validation',
    body: `## Description
This PR implements email validation for user registration.

## Changes
- Added email validation utility
- Added tests for email validation
- Updated user registration form

## Testing
- Unit tests added
- Manual testing completed`,
    draft: true,
    repoPath,
    assignees: ['johndoe'],
    reviewers: ['janedoe', 'bobsmith'],
  });

  if (!createResult.success) {
    console.error('Failed to create PR:', createResult.error);
    return;
  }

  console.log(`Created PR #${createResult.prNumber}: ${createResult.prUrl}`);
  const prNumber = createResult.prNumber || 0;

  // Get PR information
  console.log('\nFetching PR information...');
  const prInfo = await prManager.getPRInfo(prNumber, repoPath);

  if (prInfo) {
    console.log('PR Details:');
    console.log(`- Number: ${prInfo.number}`);
    console.log(`- Title: ${prInfo.title}`);
    console.log(`- State: ${prInfo.state}`);
    console.log(`- Draft: ${prInfo.isDraft ? 'Yes' : 'No'}`);
    console.log(`- Author: ${prInfo.author}`);
  }

  // Update PR when ready
  console.log('\nMarking PR as ready for review...');
  const updateResult = await prManager.updatePR({
    prNumber,
    ready: true,
    title: 'A.1.5: ✅ Implement email validation',
    body: `${prInfo?.body}\n\n## Ready for Review\nAll tests passing, ready for review!`,
    repoPath,
  });

  if (updateResult.success) {
    console.log('PR updated successfully');
  }

  // List all PRs for the branch
  console.log('\nListing PRs for branch A.1.5...');
  const prs = await prManager.listPRs(repoPath, {
    branch: 'A.1.5',
    state: 'open',
  });

  console.table(
    prs.map((pr) => ({
      Number: pr.number,
      Title: pr.title,
      State: pr.state,
      Draft: pr.isDraft ? 'Yes' : 'No',
    })),
  );

  // Merge PR (after approval)
  console.log('\nMerging PR (after approval)...');
  const mergeResult = await prManager.mergePR(prNumber, repoPath, {
    method: 'squash',
    deleteBranch: true,
  });

  if (mergeResult.success) {
    console.log('PR merged successfully');
    console.log('Branch deleted');
  } else {
    console.error('Failed to merge PR:', mergeResult.error);
  }
}

// Run the example
prAutomation().catch(console.error);
