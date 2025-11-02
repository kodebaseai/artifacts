import { Box, Text } from 'ink';
import type { FC } from 'react';
import { useState } from 'react';
import type { WizardState } from './types.js';
import { DEFAULT_WIZARD_STATE, STEP_ORDER } from './types.js';
import { TypeSelectionStep } from './steps/TypeSelectionStep.js';
import { BasicInfoStep } from './steps/BasicInfoStep.js';
import { DetailsStep } from './steps/DetailsStep.js';
import { RelationshipsStep } from './steps/RelationshipsStep.js';
import { PreviewStep } from './steps/PreviewStep.js';
import { ConfirmationStep } from './steps/ConfirmationStep.js';

export interface WizardFlowProps {
  verbose?: boolean;
  submit?: boolean;
}

/**
 * Interactive Artifact Creation Wizard
 *
 * Guides users through a multi-step process to create artifacts with validation.
 * Follows existing CLI patterns and uses Ink components for consistency.
 *
 * Flow: Type Selection → Basic Info → Details → Relationships → Preview → Confirm
 */
export const WizardFlow: FC<WizardFlowProps> = ({
  verbose: _verbose,
  submit,
}) => {
  const [wizardState, setWizardState] =
    useState<WizardState>(DEFAULT_WIZARD_STATE);
  const [isExiting, setIsExiting] = useState(false);

  const currentStepIndex = STEP_ORDER.indexOf(wizardState.currentStep);

  const handleStateUpdate = (updates: Partial<WizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      const nextStep = STEP_ORDER[nextIndex];
      if (nextStep) {
        setWizardState((prev) => ({
          ...prev,
          currentStep: nextStep,
        }));
      }
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      const prevStep = STEP_ORDER[prevIndex];
      if (prevStep) {
        setWizardState((prev) => ({
          ...prev,
          currentStep: prevStep,
        }));
      }
    }
  };

  const handleCancel = () => {
    setIsExiting(true);
    process.exit(0);
  };

  if (isExiting) {
    return (
      <Box flexDirection="column">
        <Text color="gray">Wizard cancelled by user</Text>
      </Box>
    );
  }

  const renderCurrentStep = () => {
    const stepProps = {
      state: wizardState,
      onUpdate: handleStateUpdate,
      onNext: handleNext,
      onBack: handleBack,
      onCancel: handleCancel,
      submit,
    };

    switch (wizardState.currentStep) {
      case 'type-selection':
        return <TypeSelectionStep {...stepProps} />;
      case 'basic-info':
        return <BasicInfoStep {...stepProps} />;
      case 'details':
        return <DetailsStep {...stepProps} />;
      case 'relationships':
        return <RelationshipsStep {...stepProps} />;
      case 'preview':
        return <PreviewStep {...stepProps} />;
      case 'confirmation':
        return <ConfirmationStep {...stepProps} />;
      default:
        return (
          <Box>
            <Text color="red">Unknown step</Text>
          </Box>
        );
    }
  };

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        🧙 Artifact Creation Wizard
      </Text>

      {/* Progress indicator */}
      <Box>
        <Text color="gray">
          Step {currentStepIndex + 1} of {STEP_ORDER.length}:
        </Text>
        <Text color="yellow" bold>
          {' '}
          {STEP_ORDER[currentStepIndex]?.replace('-', ' ')}
        </Text>
      </Box>

      {/* Progress bar */}
      <Box>
        <Text color="gray">[</Text>
        {STEP_ORDER.map((step, index) => (
          <Text key={step} color={index <= currentStepIndex ? 'green' : 'gray'}>
            {index <= currentStepIndex ? '●' : '○'}
          </Text>
        ))}
        <Text color="gray">]</Text>
      </Box>

      <Text></Text>

      {renderCurrentStep()}
    </Box>
  );
};
