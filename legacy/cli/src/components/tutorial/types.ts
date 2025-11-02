/**
 * Tutorial Types and Constants
 */

export type TutorialStepType =
  | 'welcome'
  | 'concepts'
  | 'create-initiative'
  | 'create-milestone'
  | 'create-issue'
  | 'git-integration'
  | 'completion';

export interface TutorialState {
  currentStep: TutorialStepType;
  completedSteps: TutorialStepType[];
  sandboxPath: string;
  isReady: boolean;
  // Artifact IDs created during tutorial for reference
  createdArtifacts: {
    initiative?: string;
    milestone?: string;
    issue?: string;
  };
  // Progress tracking for resumable sessions
  progress: {
    [key in TutorialStepType]?: boolean;
  };
}

export const TUTORIAL_STEPS: TutorialStepType[] = [
  'welcome',
  'concepts',
  'create-initiative',
  'create-milestone',
  'create-issue',
  'git-integration',
  'completion',
];

export const DEFAULT_TUTORIAL_STATE: TutorialState = {
  currentStep: 'welcome',
  completedSteps: [],
  sandboxPath: '',
  isReady: false,
  createdArtifacts: {},
  progress: {},
};

export interface TutorialStepInfo {
  title: string;
  description: string;
  objectives: string[];
  canGoBack: boolean;
  isSkippable: boolean;
}

export const TUTORIAL_STEP_INFO: Record<TutorialStepType, TutorialStepInfo> = {
  welcome: {
    title: 'Welcome to Kodebase! 🎓',
    description: "Introduction to the tutorial and what you'll learn",
    objectives: ['Understand tutorial structure', 'Set expectations'],
    canGoBack: false,
    isSkippable: false,
  },
  concepts: {
    title: 'Core Concepts 📚',
    description: 'Learn about artifacts, relationships, and the methodology',
    objectives: [
      'Understand Initiatives, Milestones, Issues',
      'Learn artifact relationships',
      'Grasp the workflow',
    ],
    canGoBack: true,
    isSkippable: false,
  },
  'create-initiative': {
    title: 'Create Your First Initiative 🚀',
    description: 'Create an initiative using the kodebase CLI',
    objectives: [
      'Use kodebase create command',
      'Understand initiative structure',
      'See generated files',
    ],
    canGoBack: true,
    isSkippable: false,
  },
  'create-milestone': {
    title: 'Add a Milestone 🎯',
    description: 'Create a milestone under your initiative',
    objectives: [
      'Create child artifacts',
      'Understand parent-child relationships',
      'See milestone structure',
    ],
    canGoBack: true,
    isSkippable: false,
  },
  'create-issue': {
    title: 'Create an Issue 📝',
    description: 'Create an issue under your milestone',
    objectives: [
      'Complete the artifact hierarchy',
      'Understand issue properties',
      'Practice CLI commands',
    ],
    canGoBack: true,
    isSkippable: false,
  },
  'git-integration': {
    title: 'Git Workflow Integration 🌿',
    description: 'Learn how kodebase integrates with Git workflows',
    objectives: [
      'Understand branch naming',
      'Learn status management',
      'Practice Git commands',
    ],
    canGoBack: true,
    isSkippable: true,
  },
  completion: {
    title: 'Tutorial Complete! 🎉',
    description: 'Summary of what you learned and next steps',
    objectives: ['Review key concepts', 'Get next steps', 'Clean up sandbox'],
    canGoBack: true,
    isSkippable: false,
  },
};
