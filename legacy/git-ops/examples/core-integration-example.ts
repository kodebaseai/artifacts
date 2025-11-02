/**
 * @kodebase/core Integration Example
 *
 * This example demonstrates the complete integration between @kodebase/git-ops
 * and @kodebase/core, showcasing performTransition, CascadeEngine usage,
 * and real-world workflow scenarios.
 */

import {
  type Artifact,
  CascadeEngine,
  CompletionCascadeAnalyzer,
  canTransition,
  getCurrentState,
  type Issue,
  performTransition,
} from '@kodebase/core';
import {
  ArtifactLoader,
  BranchValidator,
  HookInstaller,
  PRManager,
} from '@kodebase/git-ops';

async function coreIntegrationExample() {
  const repoPath = process.cwd();
  console.log('🚀 Starting @kodebase/core Integration Example');

  // Step 1: Setup git hooks with @kodebase/core integration
  await setupIntegratedHooks(repoPath);

  // Step 2: Demonstrate state management with performTransition
  await demonstrateStateManagement(repoPath);

  // Step 3: Demonstrate cascade engine usage
  await demonstrateCascadeEngine(repoPath);

  // Step 4: Complete workflow simulation
  await simulateCompleteWorkflow(repoPath);

  console.log('✅ @kodebase/core Integration Example Complete');
}

/**
 * Setup git hooks with @kodebase/core integration
 */
async function setupIntegratedHooks(repoPath: string) {
  console.log('\n📋 Step 1: Setting up integrated git hooks...');

  const installer = new HookInstaller();

  try {
    // Install hooks with @kodebase/core integration
    const result = await installer.install({ repoPath });

    if (result.success) {
      console.log('✅ Hooks installed:', result.installed);
      console.log('⏭️ Hooks skipped:', result.skipped);
    } else {
      console.error('❌ Hook installation failed:', result.error);
      return;
    }

    // Verify hook status
    const statuses = await installer.status(repoPath);
    console.log('\n📊 Hook Status:');
    for (const status of statuses) {
      const icon = status.installed ? '✅' : '❌';
      const managed = status.isKodebase ? '(managed)' : '(external)';
      console.log(`  ${icon} ${status.name} ${managed}`);
    }
  } catch (error) {
    console.error('❌ Failed to setup hooks:', error);
  }
}

/**
 * Demonstrate state management with performTransition and canTransition
 */
async function demonstrateStateManagement(repoPath: string) {
  console.log('\n🔄 Step 2: Demonstrating state management...');

  const loader = new ArtifactLoader();
  const artifactId = 'A.1.5'; // Example issue

  try {
    // Create a test artifact if it doesn't exist
    await createTestArtifact(artifactId, repoPath);

    // Load artifact using @kodebase/core integration
    console.log(`📁 Loading artifact: ${artifactId}`);
    const artifact = await loader.loadArtifact(artifactId, repoPath);

    // Check current state
    const currentState = getCurrentState(artifact.metadata.events);
    console.log(`📊 Current state: ${currentState}`);

    // Demonstrate state transitions
    const transitions = [
      { from: 'ready', to: 'in_progress' as const, context: 'Starting work' },
      {
        from: 'in_progress',
        to: 'in_review' as const,
        context: 'Work complete, ready for review',
      },
      {
        from: 'in_review',
        to: 'completed' as const,
        context: 'Review approved, completing',
      },
    ];

    for (const transition of transitions) {
      if (getCurrentState(artifact.metadata.events) === transition.from) {
        console.log(
          `\n🔄 Attempting transition: ${transition.from} → ${transition.to}`,
        );
        console.log(`   Context: ${transition.context}`);

        // Validate transition
        if (canTransition(artifact, transition.to)) {
          // Get actor from git config
          const actor = await loader.getGitActor(repoPath);

          // Perform transition with metadata
          performTransition(artifact, transition.to, actor, {
            context: transition.context,
            timestamp: new Date().toISOString(),
            automated: true,
          });

          // Save updated artifact
          await loader.saveArtifact(artifact, artifactId, repoPath);

          console.log(`✅ Successfully transitioned to: ${transition.to}`);
        } else {
          console.log(
            `❌ Invalid transition: ${transition.from} → ${transition.to}`,
          );
        }
      }
    }

    // Display final state
    const finalState = getCurrentState(artifact.metadata.events);
    console.log(`\n📊 Final state: ${finalState}`);
  } catch (error) {
    console.error('❌ State management demo failed:', error);
  }
}

/**
 * Demonstrate CascadeEngine and CompletionCascadeAnalyzer usage
 */
async function demonstrateCascadeEngine(repoPath: string) {
  console.log('\n🌊 Step 3: Demonstrating cascade engine...');

  const loader = new ArtifactLoader();
  const _cascadeEngine = new CascadeEngine();
  const completionAnalyzer = new CompletionCascadeAnalyzer();
  _cascadeEngine;
  try {
    // Create test artifacts hierarchy: Initiative A → Milestone A.1 → Issues A.1.1, A.1.2, A.1.3
    await createTestHierarchy(repoPath);

    // Complete issues one by one and demonstrate cascade
    const issues = ['A.1.1', 'A.1.2', 'A.1.3'];

    for (const issueId of issues) {
      console.log(`\n🎯 Completing issue: ${issueId}`);

      // Load and complete the issue
      const issue = await loader.loadArtifact(issueId, repoPath);
      const actor = await loader.getGitActor(repoPath);

      // Transition to completed
      if (canTransition(issue, 'completed')) {
        performTransition(issue, 'completed', actor, {
          completion_reason: 'Automated completion for demo',
          completed_by: 'core-integration-example',
        });

        await loader.saveArtifact(issue, issueId, repoPath);
        console.log(`✅ Completed issue: ${issueId}`);
      }

      // Analyze cascade requirements
      console.log(`🔍 Analyzing cascade requirements for ${issueId}...`);

      // Create artifact map for cascade analysis
      const artifactMap = new Map<string, Artifact>();

      // Load all related artifacts
      for (const id of ['A.1.1', 'A.1.2', 'A.1.3', 'A.1', 'A']) {
        try {
          const artifact = await loader.loadArtifact(id, repoPath);
          artifactMap.set(id, artifact);
        } catch (_error) {
          console.log(`⚠️ Could not load artifact ${id} for cascade analysis`);
        }
        // _error; // Unused in this example
      }

      // Perform cascade analysis
      const cascadeResults = completionAnalyzer.analyzeCompletionCascade(
        issueId,
        artifactMap,
      );

      if (cascadeResults.hasCascades) {
        console.log(`🌊 Cascade triggered! Auto-completing:`);

        // Apply cascade completions
        for (const result of cascadeResults.autoCompleted) {
          console.log(`   → ${result.id}: ${result.reason}`);

          try {
            const parentArtifact = await loader.loadArtifact(
              result.id,
              repoPath,
            );

            if (canTransition(parentArtifact, 'completed')) {
              performTransition(parentArtifact, 'completed', actor, {
                cascade_trigger: issueId,
                cascade_reason: result.reason,
                auto_completion: true,
              });

              await loader.saveArtifact(parentArtifact, result.id, repoPath);
              console.log(`     ✅ Cascade completed: ${result.id}`);
            }
          } catch (_error) {
            console.log(
              `     ❌ Cascade failed for ${result.id}: Error during cascade`,
            );
          }
        }
      } else {
        console.log(`📝 No cascade needed for ${issueId}`);
      }
    }
  } catch (error) {
    console.error('❌ Cascade engine demo failed:', error);
  }
}

/**
 * Simulate complete workflow with git operations and @kodebase/core integration
 */
async function simulateCompleteWorkflow(repoPath: string) {
  console.log('\n🎬 Step 4: Simulating complete workflow...');

  const loader = new ArtifactLoader();
  const validator = new BranchValidator();
  const prManager = new PRManager();
  const issueId = 'A.2.1'; // New issue for workflow simulation

  try {
    // Create test issue
    await createTestArtifact(issueId, repoPath);
    console.log(`📋 Created test issue: ${issueId}`);

    // 1. Validate branch name
    const validation = validator.validate(issueId);
    if (!validation.valid) {
      console.error(`❌ Invalid branch name: ${issueId}`);
      return;
    }
    console.log(`✅ Branch name validated: ${issueId}`);

    // 2. Simulate post-checkout hook (branch creation)
    console.log(`🌿 Simulating branch checkout: ${issueId}`);
    const artifact = await loader.loadArtifact(issueId, repoPath);
    const actor = await loader.getGitActor(repoPath);

    if (canTransition(artifact, 'in_progress')) {
      performTransition(artifact, 'in_progress', actor, {
        hook: 'post-checkout',
        branch_created: issueId,
      });
      await loader.saveArtifact(artifact, issueId, repoPath);
      console.log(
        `✅ Transitioned ${issueId} to in_progress via post-checkout hook`,
      );
    }

    // 3. Simulate work and commits (pre-commit validation would happen here)
    console.log(`💻 Simulating development work on ${issueId}...`);

    // 4. Simulate PR creation
    console.log(`🔄 Creating draft PR for ${issueId}...`);
    try {
      const prResult = await prManager.createDraftPR({
        branch: issueId,
        title: 'Implement user authentication system',
        body: `This PR implements user authentication as specified in issue ${issueId}.\n\n## Changes\n- Add login/logout functionality\n- Implement session management\n- Add user validation`,
        repoPath,
      });

      if (prResult.success) {
        console.log(`✅ Draft PR created: ${prResult.prUrl}`);
      } else {
        console.log(`⚠️ PR creation failed: ${prResult.error}`);
      }
    } catch (error) {
      console.log(`⚠️ PR creation skipped (GitHub CLI not available): ${error}`);
    }

    // 5. Simulate work completion and review
    console.log(`👀 Simulating work completion and review...`);
    if (canTransition(artifact, 'in_review')) {
      performTransition(artifact, 'in_review', actor, {
        work_completed: true,
        ready_for_review: true,
      });
      await loader.saveArtifact(artifact, issueId, repoPath);
      console.log(`✅ Transitioned ${issueId} to in_review`);
    }

    // 6. Simulate merge and post-merge hook
    console.log(`🔀 Simulating PR merge and post-merge hook...`);
    if (canTransition(artifact, 'completed')) {
      performTransition(artifact, 'completed', actor, {
        hook: 'post-merge',
        merge_commit: 'abc123def456',
        pr_number: '42',
      });
      await loader.saveArtifact(artifact, issueId, repoPath);
      console.log(`✅ Completed ${issueId} via post-merge hook`);
    }

    // 7. Show final artifact state
    const finalArtifact = await loader.loadArtifact(issueId, repoPath);
    const finalState = getCurrentState(finalArtifact.metadata.events);
    console.log(`\n📊 Workflow complete! Final state: ${finalState}`);
    console.log(
      `📝 Event history: ${finalArtifact.metadata.events.length} events`,
    );
  } catch (error) {
    console.error('❌ Workflow simulation failed:', error);
  }
}

/**
 * Helper: Create test artifact
 */
async function createTestArtifact(
  artifactId: string,
  repoPath: string,
): Promise<void> {
  const loader = new ArtifactLoader();

  // Check if artifact already exists
  try {
    await loader.loadArtifact(artifactId, repoPath);
    console.log(`📄 Artifact ${artifactId} already exists`);
    return;
  } catch (_error) {
    // Artifact doesn't exist, create it
  }
  // _error; // Unused in this example

  const testArtifact: Issue = {
    metadata: {
      title: `Test Issue ${artifactId}`,
      priority: 'medium',
      estimation: 'S',
      created_by: 'core-integration-example',
      assignee: 'core-integration-example',
      schema_version: '0.2.0',
      relationships: {
        blocks: [],
        blocked_by: [],
      },
      events: [
        {
          timestamp: new Date().toISOString(),
          event: 'draft',
          actor: 'core-integration-example',
          event_id: `evt_${Date.now()}`,
          metadata: {
            correlation_id: `evt_${Date.now()}`,
            parent_event_id: null,
          },
        },
        {
          timestamp: new Date().toISOString(),
          event: 'ready',
          actor: 'core-integration-example',
          event_id: `evt_${Date.now() + 1}`,
          metadata: {
            correlation_id: `evt_${Date.now()}`,
            parent_event_id: null,
          },
        },
      ],
    },
    content: {
      summary: `Test issue for demonstrating @kodebase/core integration with git-ops`,
      acceptance_criteria: [
        'Demonstrate performTransition usage',
        'Show cascade engine integration',
        'Validate state management workflow',
      ],
    },
  };

  await loader.saveArtifact(testArtifact, artifactId, repoPath);
  console.log(`✅ Created test artifact: ${artifactId}`);
}

/**
 * Helper: Create test hierarchy for cascade demonstration
 */
async function createTestHierarchy(_repoPath: string): Promise<void> {
  console.log(`🏗️ Creating test artifact hierarchy...`);
  _repoPath;
  // This would create A, A.1, A.1.1, A.1.2, A.1.3 for cascade testing
  // Implementation would depend on specific artifact structure requirements
  console.log(`📁 Test hierarchy creation simulated`);
}

// Export for use in other examples
export {
  coreIntegrationExample,
  setupIntegratedHooks,
  demonstrateStateManagement,
  demonstrateCascadeEngine,
  simulateCompleteWorkflow,
};

// Run example if called directly
if (require.main === module) {
  coreIntegrationExample().catch(console.error);
}
