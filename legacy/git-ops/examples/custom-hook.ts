/**
 * Custom Hook Example
 *
 * This example demonstrates how to use individual hooks
 * programmatically for custom workflows.
 */

import {
  PostCheckoutHook,
  PreCommitHook,
  PrePushHook,
  PostMergeHook,
  type HookContext,
  type PostCheckoutContext,
  type PrePushContext,
  type PostMergeContext,
} from '@kodebase/git-ops';

async function customHookUsage() {
  const repoPath = process.cwd();

  // Example 1: Use post-checkout hook programmatically
  console.log('Running post-checkout hook...');
  const postCheckout = new PostCheckoutHook();

  const checkoutContext: PostCheckoutContext = {
    hookType: 'post-checkout',
    repoPath,
    args: ['0000000', 'abc123', '1'],
    env: process.env,
    cwd: repoPath,
    previousHead: '0000000',
    newHead: 'abc123',
    isBranchCheckout: true,
  };

  const checkoutResult = await postCheckout.run(checkoutContext);
  console.log('Post-checkout result:', checkoutResult);

  // Example 2: Validate commit message
  console.log('\nValidating commit message...');
  const preCommit = new PreCommitHook();

  const commitContext: HookContext = {
    hookType: 'pre-commit',
    repoPath,
    args: [],
    env: process.env,
    cwd: repoPath,
  };

  // First check if hook should run
  const shouldRunCommit = await preCommit.shouldRun(commitContext);
  console.log('Should run pre-commit:', shouldRunCommit);

  if (shouldRunCommit) {
    const commitResult = await preCommit.run(commitContext);
    console.log('Pre-commit result:', commitResult);
  }

  // Example 3: Pre-push validation
  console.log('\nRunning pre-push validation...');
  const prePush = new PrePushHook();

  const pushContext: PrePushContext = {
    hookType: 'pre-push',
    repoPath,
    args: ['origin', 'https://github.com/org/repo.git'],
    env: process.env,
    cwd: repoPath,
    remoteName: 'origin',
    remoteUrl: 'https://github.com/org/repo.git',
    refs: [
      {
        localRef: 'refs/heads/A.1.5',
        localSha: 'abc123',
        remoteRef: 'refs/heads/A.1.5',
        remoteSha: '000000',
      },
    ],
  };

  const pushResult = await prePush.run(pushContext);
  console.log('Pre-push result:', pushResult);

  // Example 4: Post-merge processing
  console.log('\nRunning post-merge hook...');
  const postMerge = new PostMergeHook();

  const mergeContext: PostMergeContext = {
    hookType: 'post-merge',
    repoPath,
    args: ['0'], // 0 = not squash merge, 1 = squash merge
    env: process.env,
    cwd: repoPath,
    squashMerge: false,
  };

  const mergeResult = await postMerge.run(mergeContext);
  console.log('Post-merge result:', mergeResult);

  // Example 5: Hook composition for custom workflow
  console.log('\nCustom workflow example...');

  async function customWorkflow(_artifactId: string) {
    // Run multiple hooks in sequence
    const hooks = [
      { name: 'pre-commit', hook: new PreCommitHook() },
      { name: 'pre-push', hook: new PrePushHook() },
    ];

    for (const { name } of hooks) {
      console.log(`Running ${name}...`);

      // Skip type casting for examples - in real usage, create proper context
      // based on the specific hook type
      console.log(`Checking if ${name} should run...`);
      // This is a simplified example - in production, create proper typed contexts
      console.log(`${name} check complete`);
    }

    return true;
  }

  const success = await customWorkflow('A.1.5');
  console.log('Custom workflow completed:', success ? 'Success' : 'Failed');
}

// Run the example
customHookUsage().catch(console.error);
