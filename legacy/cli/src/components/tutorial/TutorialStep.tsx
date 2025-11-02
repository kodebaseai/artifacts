import { Box, Text, useInput } from 'ink';
import type { FC } from 'react';
import { useState } from 'react';
import type { TutorialState, TutorialStepType } from './types.js';
import { TUTORIAL_STEP_INFO } from './types.js';
import {
  createTutorialInitiative,
  createTutorialMilestone,
  createTutorialIssue,
  demonstrateGitWorkflow,
} from '../../utils/tutorial-artifact-creator.js';

export interface TutorialStepProps {
  step: TutorialStepType;
  tutorialState: TutorialState;
  onNext: () => void;
  onBack: () => void;
  verbose?: boolean;
}

/**
 * Individual Tutorial Step Component
 *
 * Renders content and handles interaction for a specific tutorial step.
 * Each step teaches specific concepts and may include interactive exercises.
 */
export const TutorialStep: FC<TutorialStepProps> = ({
  step,
  tutorialState,
  onNext,
  onBack,
  verbose: _verbose = false,
}) => {
  const [isWaitingForInput, setIsWaitingForInput] = useState(true);
  const [stepStatus, setStepStatus] = useState<
    'waiting' | 'creating' | 'completed' | 'error'
  >('waiting');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const stepInfo = TUTORIAL_STEP_INFO[step];

  const handleArtifactCreation = async () => {
    if (
      ![
        'create-initiative',
        'create-milestone',
        'create-issue',
        'git-integration',
      ].includes(step)
    ) {
      return;
    }

    setStepStatus('creating');
    setIsWaitingForInput(false);

    try {
      let result: { success: boolean; error?: string } | undefined;

      switch (step) {
        case 'create-initiative':
          result = await createTutorialInitiative(
            tutorialState.sandboxPath,
            'Build my first web app',
          );
          break;
        case 'create-milestone':
          result = await createTutorialMilestone(
            tutorialState.sandboxPath,
            'User authentication system',
            'A',
          );
          break;
        case 'create-issue':
          result = await createTutorialIssue(
            tutorialState.sandboxPath,
            'Implement login endpoint',
            'A.1',
          );
          break;
        case 'git-integration':
          result = await demonstrateGitWorkflow(tutorialState.sandboxPath);
          break;
      }

      if (result?.success) {
        if (step === 'git-integration') {
          setStatusMessage('✅ Git workflow demonstrated successfully!');
        } else {
          setStatusMessage(`✅ Created ${step.split('-')[1]} successfully!`);
        }
        setStepStatus('completed');
      } else {
        setStepStatus('error');
        if (step === 'git-integration') {
          setStatusMessage(`❌ Git workflow demo failed: ${result?.error}`);
        } else {
          setStatusMessage(
            `❌ Failed to create ${step.split('-')[1]}: ${result?.error}`,
          );
        }
      }
    } catch (error) {
      setStepStatus('error');
      setStatusMessage(
        `❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    setTimeout(() => {
      setIsWaitingForInput(true);
    }, 2000); // Allow user to read the result
  };

  useInput((input, key) => {
    if (!isWaitingForInput) return;

    // Handle creation steps
    if (
      [
        'create-initiative',
        'create-milestone',
        'create-issue',
        'git-integration',
      ].includes(step) &&
      stepStatus === 'waiting'
    ) {
      if (key.return || input === 'c') {
        handleArtifactCreation();
        return;
      }
    }

    // Handle navigation
    if (key.return || input === 'n') {
      onNext();
    }
    if (input === 'b' && stepInfo.canGoBack) {
      onBack();
    }
  });

  const renderStepContent = () => {
    switch (step) {
      case 'welcome':
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              {stepInfo.title}
            </Text>
            <Text></Text>
            <Text>Welcome to the Kodebase interactive tutorial! 🎉</Text>
            <Text></Text>
            <Text>In the next few minutes, you'll learn:</Text>
            <Text color="green">
              • Core kodebase concepts (Initiatives, Milestones, Issues)
            </Text>
            <Text color="green">• How to create and manage artifacts</Text>
            <Text color="green">• Git workflow integration</Text>
            <Text color="green">• Essential CLI commands</Text>
            <Text></Text>
            <Text color="yellow">🔧 Sandbox Environment:</Text>
            <Text>Everything happens in a temporary directory:</Text>
            <Text color="gray">{tutorialState.sandboxPath}</Text>
            <Text>This will be cleaned up automatically when you finish.</Text>
          </Box>
        );

      case 'concepts':
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              {stepInfo.title}
            </Text>
            <Text></Text>
            <Text bold>The Kodebase Hierarchy:</Text>
            <Text></Text>
            <Text color="blue">📋 Initiative</Text>
            <Text color="gray">
              {' '}
              └─ Large project or goal (e.g., "Build user authentication")
            </Text>
            <Text color="green"> 🎯 Milestone</Text>
            <Text color="gray">
              {' '}
              └─ Major deliverable (e.g., "API endpoints")
            </Text>
            <Text color="yellow"> 📝 Issue</Text>
            <Text color="gray">
              {' '}
              └─ Specific task (e.g., "Implement login endpoint")
            </Text>
            <Text></Text>
            <Text bold>Key Benefits:</Text>
            <Text color="green">
              • Structure: Break big projects into manageable pieces
            </Text>
            <Text color="green">
              • Tracking: Clear progress and status for everything
            </Text>
            <Text color="green">
              • Git Integration: Automatic branch and PR management
            </Text>
            <Text color="green">
              • Documentation: Everything is documented as you work
            </Text>
          </Box>
        );

      case 'create-initiative':
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              {stepInfo.title}
            </Text>
            <Text></Text>
            <Text>
              Let's create your first Initiative! An initiative represents
            </Text>
            <Text>a large project or goal you want to accomplish.</Text>
            <Text></Text>

            {stepStatus === 'waiting' && (
              <>
                <Text bold>Ready to create initiative:</Text>
                <Text color="green">"Build my first web app"</Text>
                <Text></Text>
                <Text color="yellow">💡 What this will do:</Text>
                <Text>• Creates a new Initiative with ID "A"</Text>
                <Text>• Generates proper YAML structure</Text>
                <Text>• Sets up the artifact hierarchy</Text>
                <Text>• Adds initial "draft" event</Text>
                <Text></Text>
                <Text bold color="cyan">
                  Press Enter or 'c' to create the initiative!
                </Text>
              </>
            )}

            {stepStatus === 'creating' && (
              <Text color="yellow">🔧 Creating initiative...</Text>
            )}

            {stepStatus === 'completed' && (
              <>
                <Text color="green">{statusMessage}</Text>
                <Text></Text>
                <Text>🎉 Your first Initiative is ready! It's stored in:</Text>
                <Text color="gray">
                  {tutorialState.sandboxPath}/.kodebase/artifacts/
                </Text>
                <Text></Text>
                <Text>You now have Initiative "A: Build my first web app"</Text>
              </>
            )}

            {stepStatus === 'error' && <Text color="red">{statusMessage}</Text>}

            <Text></Text>
            <Text color="gray">
              In a real project, you'd run: kodebase create "Build my first web
              app"
            </Text>
          </Box>
        );

      case 'create-milestone':
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              {stepInfo.title}
            </Text>
            <Text></Text>
            <Text>Great! Now let's add a Milestone under your Initiative.</Text>
            <Text>Milestones represent major deliverables or phases.</Text>
            <Text></Text>

            {stepStatus === 'waiting' && (
              <>
                <Text bold>Ready to create milestone:</Text>
                <Text color="green">"User authentication system"</Text>
                <Text color="gray">under Initiative A</Text>
                <Text></Text>
                <Text color="yellow">💡 What this will do:</Text>
                <Text>• Creates Milestone "A.1" under Initiative "A"</Text>
                <Text>• Sets up parent-child relationship</Text>
                <Text>• Creates milestone-specific directory</Text>
                <Text>• Tracks dependencies automatically</Text>
                <Text></Text>
                <Text bold color="cyan">
                  Press Enter or 'c' to create the milestone!
                </Text>
              </>
            )}

            {stepStatus === 'creating' && (
              <Text color="yellow">🔧 Creating milestone...</Text>
            )}

            {stepStatus === 'completed' && (
              <>
                <Text color="green">{statusMessage}</Text>
                <Text></Text>
                <Text>🎉 Your milestone is ready!</Text>
                <Text></Text>
                <Text>Current structure:</Text>
                <Text color="blue">
                  A: "Build my first web app" (Initiative)
                </Text>
                <Text color="green">
                  └─ A.1: "User authentication system" (Milestone)
                </Text>
              </>
            )}

            {stepStatus === 'error' && <Text color="red">{statusMessage}</Text>}

            <Text></Text>
            <Text color="gray">
              In a real project, you'd run: kodebase create A "User
              authentication system"
            </Text>
          </Box>
        );

      case 'create-issue':
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              {stepInfo.title}
            </Text>
            <Text></Text>
            <Text>
              Perfect! Now let's create an Issue - the actual work item
            </Text>
            <Text>that someone will implement.</Text>
            <Text></Text>

            {stepStatus === 'waiting' && (
              <>
                <Text bold>Ready to create issue:</Text>
                <Text color="green">"Implement login endpoint"</Text>
                <Text color="gray">under Milestone A.1</Text>
                <Text></Text>
                <Text color="yellow">💡 What this will do:</Text>
                <Text>• Creates Issue "A.1.1" under Milestone "A.1"</Text>
                <Text>• Completes the three-level hierarchy</Text>
                <Text>• Sets up work tracking structure</Text>
                <Text>• Prepares for Git workflow integration</Text>
                <Text></Text>
                <Text bold color="cyan">
                  Press Enter or 'c' to create the issue!
                </Text>
              </>
            )}

            {stepStatus === 'creating' && (
              <Text color="yellow">🔧 Creating issue...</Text>
            )}

            {stepStatus === 'completed' && (
              <>
                <Text color="green">{statusMessage}</Text>
                <Text></Text>
                <Text>🎉 Complete project structure created!</Text>
                <Text></Text>
                <Text>Your full hierarchy:</Text>
                <Text color="blue">
                  A: "Build my first web app" (Initiative)
                </Text>
                <Text color="green">
                  └─ A.1: "User authentication system" (Milestone)
                </Text>
                <Text color="yellow">
                  {' '}
                  └─ A.1.1: "Implement login endpoint" (Issue)
                </Text>
                <Text></Text>
                <Text>
                  ✨ You now have a complete kodebase project structure!
                </Text>
              </>
            )}

            {stepStatus === 'error' && <Text color="red">{statusMessage}</Text>}

            <Text></Text>
            <Text color="gray">
              In a real project, you'd run: kodebase create A.1 "Implement login
              endpoint"
            </Text>
          </Box>
        );

      case 'git-integration':
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              {stepInfo.title}
            </Text>
            <Text></Text>
            <Text>Now for the powerful part - Git integration! Let's</Text>
            <Text>demonstrate how kodebase manages workflow for you.</Text>
            <Text></Text>

            {stepStatus === 'waiting' && (
              <>
                <Text bold>Ready to demonstrate Git workflow:</Text>
                <Text color="green">
                  Making A.1.1 ready and creating branch
                </Text>
                <Text></Text>
                <Text color="yellow">💡 What this will do:</Text>
                <Text>• Mark issue A.1.1 as ready for development</Text>
                <Text>• Create feature branch "A.1.1"</Text>
                <Text>• Update artifact status to "in_progress"</Text>
                <Text>• Show you the complete workflow</Text>
                <Text></Text>
                <Text bold color="cyan">
                  Press Enter or 'c' to demonstrate Git workflow!
                </Text>
              </>
            )}

            {stepStatus === 'creating' && (
              <Text color="yellow">
                🔧 Running Git workflow demonstration...
              </Text>
            )}

            {stepStatus === 'completed' && (
              <>
                <Text color="green">{statusMessage}</Text>
                <Text></Text>
                <Text>🎉 Git workflow demonstration complete!</Text>
                <Text></Text>
                <Text bold>Key Commands You Just Learned:</Text>
                <Text color="green">kodebase ready A.1.1</Text>
                <Text color="gray">
                  {' '}
                  └─ Mark issue as ready for development
                </Text>
                <Text></Text>
                <Text color="green">git checkout -b A.1.1</Text>
                <Text color="gray"> └─ Create branch matching artifact ID</Text>
                <Text color="gray"> └─ Triggers automatic status updates</Text>
                <Text></Text>
                <Text color="green">kodebase pr --ready</Text>
                <Text color="gray"> └─ Mark work ready for review</Text>
                <Text></Text>
                <Text color="yellow">💡 The Magic:</Text>
                <Text>• Branch names match artifact IDs</Text>
                <Text>• Status updates happen automatically</Text>
                <Text>• Everything stays in sync with Git</Text>
              </>
            )}

            {stepStatus === 'error' && <Text color="red">{statusMessage}</Text>}

            <Text></Text>
            <Text color="gray">
              In real projects: kodebase ready A.1.1 && git checkout -b A.1.1
            </Text>
          </Box>
        );

      case 'completion':
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              {stepInfo.title}
            </Text>
            <Text></Text>

            {/* Achievement Certificate */}
            <Box
              flexDirection="column"
              borderStyle="round"
              borderColor="green"
              paddingX={2}
              paddingY={1}
              marginBottom={1}
            >
              <Text bold color="green">
                🏆 KODEBASE TUTORIAL COMPLETED 🏆
              </Text>
              <Text></Text>
              <Text color="cyan">Certificate of Achievement</Text>
              <Text></Text>
              <Text>You have successfully mastered the fundamentals</Text>
              <Text>of the Kodebase methodology and CLI.</Text>
              <Text></Text>
              <Text bold>Skills Acquired:</Text>
              <Text color="green">✓ Artifact creation and management</Text>
              <Text color="green">✓ Project structure organization</Text>
              <Text color="green">✓ Git workflow integration</Text>
              <Text color="green">✓ CLI command proficiency</Text>
              <Text></Text>
              <Text italic color="gray">
                Ready to build amazing projects! 🚀
              </Text>
            </Box>

            <Text bold>Congratulations! You've completed the tutorial! 🎉</Text>
            <Text></Text>
            <Text bold color="green">
              What you learned:
            </Text>
            <Text>✓ Core concepts: Initiatives, Milestones, Issues</Text>
            <Text>✓ Creating artifacts with the CLI</Text>
            <Text>✓ Understanding parent-child relationships</Text>
            <Text>✓ Git workflow integration patterns</Text>
            <Text>✓ Essential commands for daily use</Text>
            <Text></Text>
            <Text bold color="cyan">
              🚀 Ready to Start Your First Real Project?
            </Text>
            <Text></Text>
            <Text bold color="yellow">
              Step 1: Initialize Your Project
            </Text>
            <Text color="green">cd your-project-directory</Text>
            <Text color="green">kodebase init</Text>
            <Text color="gray"> └─ Sets up .kodebase/ directory structure</Text>
            <Text></Text>
            <Text bold color="yellow">
              Step 2: Create Your First Real Initiative
            </Text>
            <Text color="green">kodebase create "Your project idea"</Text>
            <Text color="gray"> └─ Creates Initiative A with your idea</Text>
            <Text></Text>
            <Text bold color="yellow">
              Step 3: Break It Down
            </Text>
            <Text color="green">kodebase create A "First milestone"</Text>
            <Text color="green">kodebase create A.1 "First task"</Text>
            <Text color="gray"> └─ Build your project hierarchy</Text>
            <Text></Text>
            <Text bold color="yellow">
              Step 4: Start Working
            </Text>
            <Text color="green">kodebase ready A.1.1</Text>
            <Text color="green">kodebase start A.1.1</Text>
            <Text color="gray"> └─ Begin your first real implementation</Text>
            <Text></Text>
            <Text bold color="cyan">
              📚 Learn More:
            </Text>
            <Text>• Run "kodebase --help" for all commands</Text>
            <Text>• Use "kb" shortcut for faster workflow</Text>
            <Text>• Check docs for advanced features</Text>
            <Text>• Join the community for tips and tricks</Text>
            <Text></Text>
            <Text bold color="yellow">
              💡 Quick Reference:
            </Text>
            <Text>kb c "idea" - Create artifact</Text>
            <Text>kb ready ID - Mark ready for work</Text>
            <Text>kb start ID - Begin implementation</Text>
            <Text>kb list - Show all artifacts</Text>
            <Text>kb status ID - Check progress</Text>
            <Text></Text>
            <Text color="green">🧹 Tutorial Environment Cleanup:</Text>
            <Text>• Sandbox directory will be removed automatically</Text>
            <Text>• All temporary files and artifacts will be cleaned up</Text>
            <Text>• Your system remains clean and unaffected</Text>
            <Text></Text>
            <Text color="gray">
              Safe to exit - cleanup happens automatically on tutorial
              completion
            </Text>
          </Box>
        );

      default:
        return (
          <Box>
            <Text color="red">Unknown tutorial step: {step}</Text>
          </Box>
        );
    }
  };

  const getNavigationText = () => {
    if (
      [
        'create-initiative',
        'create-milestone',
        'create-issue',
        'git-integration',
      ].includes(step)
    ) {
      if (stepStatus === 'waiting') {
        const action = step === 'git-integration' ? 'demonstrate' : 'create';
        return `Press Enter or 'c' to ${action} • ${stepInfo.canGoBack ? "Press 'b' to go Back" : ''}`;
      } else if (stepStatus === 'completed') {
        return `Press Enter or 'n' for Next${stepInfo.canGoBack ? " • Press 'b' to go Back" : ''}`;
      } else if (stepStatus === 'creating') {
        const action =
          step === 'git-integration'
            ? 'Demonstrating workflow...'
            : 'Creating artifact...';
        return action;
      } else if (stepStatus === 'error') {
        return `Press Enter or 'n' to continue${stepInfo.canGoBack ? " • Press 'b' to go Back" : ''}`;
      }
    }

    return `Press Enter or 'n' for Next${stepInfo.canGoBack ? " • Press 'b' to go Back" : ''}`;
  };

  return (
    <Box flexDirection="column">
      {renderStepContent()}

      <Box marginTop={1}>
        <Text color="gray">{getNavigationText()}</Text>
      </Box>
    </Box>
  );
};
