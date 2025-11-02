/**
 * Wizard Types and Interfaces
 *
 * Defines the type system for the interactive artifact creation wizard.
 * Follows existing CLI patterns and TypeScript conventions.
 */

import type { ArtifactType } from '@kodebase/core';

export type WizardStep =
  | 'type-selection'
  | 'basic-info'
  | 'details'
  | 'relationships'
  | 'preview'
  | 'confirmation';

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Estimation = 'XS' | 'S' | 'M' | 'L' | 'XL';

export interface WizardState {
  currentStep: WizardStep;
  artifactType?: ArtifactType;
  parentId?: string;
  title: string;
  description: string;
  assignee: string;
  priority: Priority;
  estimation: Estimation;
  blockedBy: string[];
  blocks: string[];
  acceptanceCriteria: string[];
  isComplete: boolean;
  errors: Record<string, string>;
}

export interface StepComponentProps {
  state: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
  submit?: boolean;
}

export const DEFAULT_WIZARD_STATE: WizardState = {
  currentStep: 'type-selection',
  title: '',
  description: '',
  assignee: '',
  priority: 'medium',
  estimation: 'M',
  blockedBy: [],
  blocks: [],
  acceptanceCriteria: [],
  isComplete: false,
  errors: {},
};

export const STEP_ORDER: WizardStep[] = [
  'type-selection',
  'basic-info',
  'details',
  'relationships',
  'preview',
  'confirmation',
];

export const PRIORITY_OPTIONS: Priority[] = [
  'critical',
  'high',
  'medium',
  'low',
];
export const ESTIMATION_OPTIONS: Estimation[] = ['XS', 'S', 'M', 'L', 'XL'];
