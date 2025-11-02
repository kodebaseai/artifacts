/**
 * Basic Workflow Example
 *
 * This example demonstrates the basic workflow of using @kodebase/git-ops
 * to manage artifact lifecycle through git operations.
 */

import {
  HookInstaller,
  BranchValidator,
  BranchCreator,
  PRManager,
} from '@kodebase/git-ops';

async function basicWorkflow() {
  const repoPath = process.cwd();

  // Step 1: Install git hooks
  console.log('Installing git hooks...');
  const installer = new HookInstaller();
  const installResult = await installer.install({ repoPath });

  if (!installResult.success) {
    console.error('Failed to install hooks:', installResult.error);
    return;
  }

  console.log('Installed hooks:', installResult.installed);
  console.log('Skipped hooks:', installResult.skipped);

  // Step 2: Validate artifact ID before creating branch
  const artifactId = 'A.1.5';
  const validator = new BranchValidator();
  const validation = validator.validate(artifactId);

  if (!validation.valid) {
    console.error('Invalid artifact ID:', validation.error);
    return;
  }

  // Step 3: Create artifact branch
  console.log(`Creating branch for artifact ${artifactId}...`);
  const creator = new BranchCreator();

  try {
    await creator.create({
      artifactId,
      repoPath,
      checkout: true,
      push: true,
    });
    console.log(`Branch ${artifactId} created and checked out`);
  } catch (error) {
    console.error('Failed to create branch:', error);
    return;
  }

  // Step 4: The post-checkout hook automatically:
  // - Updates artifact status to 'in_progress'
  // - Creates a draft PR
  console.log('Post-checkout hook triggered automatically');

  // Step 5: Work on the feature...
  console.log('You can now work on your feature');
  console.log(
    'When you commit, the pre-commit hook will validate your commit message',
  );

  // Step 6: When ready, update the PR
  const prManager = new PRManager();

  // Get PR info
  const prs = await prManager.listPRs(repoPath, { branch: artifactId });
  if (prs.length > 0) {
    const pr = prs[0];
    console.log(`Found PR #${pr.number}: ${pr.title}`);

    // Mark PR as ready for review
    await prManager.updatePR({
      prNumber: pr.number,
      ready: true,
      repoPath,
    });
    console.log('PR marked as ready for review');
  }

  // Step 7: After PR is approved and merged:
  // - The post-merge hook updates artifact status to 'completed'
  // - Cascade effects are triggered for parent artifacts
  console.log('When PR is merged, post-merge hook will complete the artifact');
}

// Run the example
basicWorkflow().catch(console.error);
