import type { ArtifactSchema } from '@kodebase/core';
import { ValidationEngine } from '@kodebase/core';
import { Box, Text } from 'ink';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { EventTimeline } from '../components/EventTimeline.js';
import { RelationshipList } from '../components/RelationshipList.js';
import { StatusBadge } from '../components/StatusBadge.js';
import type { StatusCommandProps } from '../types/command.js';
import { ArtifactLoader } from '../utils/artifact-loader.js';

/**
 * Status Command Component
 *
 * Implements the 'kodebase status' command for displaying comprehensive artifact information.
 *
 * Command syntax: `kodebase status <artifact-id> [--json]`
 *
 * @description
 * This command provides detailed views of any artifact in the system:
 * - Loads and validates artifact from filesystem
 * - Displays metadata, timeline, and relationships
 * - Supports both human-readable and JSON output formats
 * - Shows current status with visual indicators
 * - Presents event timeline with timestamps and actors
 * - Reveals dependency information (blocks/blocked by)
 *
 * @example
 * ```bash
 * kodebase status D.2.2           # Formatted display with colors and structure
 * kodebase status A.1 --json      # JSON output for scripts and automation
 * kodebase status C              # Works with any artifact type
 * ```
 *
 * **Display Features:**
 * - Color-coded status badges with icons
 * - Chronological event timeline
 * - Dependency visualization
 * - Metadata summary (priority, assignee, estimation)
 * - Content preview (summary, criteria, vision)
 *
 * @see {@link https://github.com/kodebaseai/kodebase/blob/main/packages/cli/src/commands/status-command.md} Full documentation
 */
export const Status: FC<StatusCommandProps> = ({
  artifactId,
  format = 'formatted',
  checkParent = false,
  experimental = false,
}) => {
  const [result, setResult] = useState<{
    success: boolean;
    artifact?: ArtifactSchema;
    error?: string;
    validationResult?: {
      isValid: boolean;
      errors: Array<{ message: string; field?: string; code: string }>;
    };
    parentBlocking?: {
      isBlocked: boolean;
      blockedBy: string[];
    };
    experimentalData?: {
      dependencies: Array<{ id: string; type: string; status: string }>;
      cascadePreview: Array<{ event: string; affects: string[] }>;
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadArtifact = async () => {
      try {
        const loader = new ArtifactLoader();
        const artifact = await loader.loadArtifact(artifactId);

        // Run validation if requested
        let validationResult:
          | {
              isValid: boolean;
              errors: Array<{ message: string; field?: string; code: string }>;
            }
          | undefined;
        if (checkParent || experimental) {
          const validationEngine = new ValidationEngine();
          const validationPath = await loader.getArtifactPath(artifactId);
          const validation = await validationEngine.validateArtifact(
            validationPath,
            {
              validateSchema: true,
              validateReadiness: true,
              validateDependencies: checkParent,
              validateRelationships: checkParent,
            },
          );

          validationResult = {
            isValid: validation.isValid,
            errors: validation.errors,
          };
        }

        // Check parent blocking if requested
        let parentBlocking:
          | {
              isBlocked: boolean;
              blockedBy: string[];
            }
          | undefined;
        if (checkParent && artifact.metadata.relationships?.blocked_by) {
          const blockedBy = artifact.metadata.relationships.blocked_by;
          parentBlocking = {
            isBlocked: blockedBy.length > 0,
            blockedBy: blockedBy,
          };
        }

        // Generate experimental data if requested
        let experimentalData:
          | {
              dependencies: Array<{ id: string; type: string; status: string }>;
              cascadePreview: Array<{ event: string; affects: string[] }>;
            }
          | undefined;
        if (experimental) {
          // Mock implementation for now - in real implementation this would
          // analyze dependencies and cascade effects
          experimentalData = {
            dependencies:
              artifact.metadata.relationships?.blocked_by?.map((dep) => ({
                id: dep,
                type: 'dependency',
                status: 'resolved', // This would be determined by checking each artifact
              })) || [],
            cascadePreview: [
              {
                event: 'completion',
                affects: artifact.metadata.relationships?.blocks || [],
              },
            ],
          };
        }

        setResult({
          success: true,
          artifact,
          validationResult,
          parentBlocking,
          experimentalData,
        });
      } catch (error) {
        setResult({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadArtifact();
  }, [artifactId, checkParent, experimental]);

  if (isLoading) {
    return (
      <Box flexDirection="column">
        <Text>Loading artifact {artifactId}...</Text>
      </Box>
    );
  }

  if (!result) {
    return (
      <Box flexDirection="column">
        <Text color="red">Unexpected error occurred</Text>
      </Box>
    );
  }

  if (!result.success) {
    return (
      <Box flexDirection="column">
        <Text color="red">✗ {result.error}</Text>
        <Text>Make sure the artifact ID is correct and the file exists.</Text>
      </Box>
    );
  }

  const { artifact } = result;
  if (!artifact) {
    return (
      <Box flexDirection="column">
        <Text color="red">Artifact data is missing</Text>
      </Box>
    );
  }

  // Get current status from latest event
  const currentStatus =
    artifact.metadata.events.length > 0
      ? artifact.metadata.events[artifact.metadata.events.length - 1]?.event ||
        'unknown'
      : 'unknown';

  // Handle JSON output
  if (format === 'json') {
    const jsonOutput = {
      id: artifactId,
      title: artifact.metadata.title,
      status: currentStatus,
      assignee: artifact.metadata.assignee,
      priority: artifact.metadata.priority,
      estimation: artifact.metadata.estimation,
      relationships: artifact.metadata.relationships,
      events: artifact.metadata.events,
      ...(result.validationResult && { validation: result.validationResult }),
      ...(result.parentBlocking && { parentBlocking: result.parentBlocking }),
      ...(result.experimentalData && { experimental: result.experimentalData }),
    };

    return (
      <Box flexDirection="column">
        <Text>{JSON.stringify(jsonOutput, null, 2)}</Text>
      </Box>
    );
  }

  // Handle formatted output
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={1}>
        <Text bold color="cyan">
          {artifactId}:
        </Text>
        <Text bold>{artifact.metadata.title}</Text>
      </Box>

      <Box flexDirection="row" gap={2} marginTop={1}>
        <Box flexDirection="row" gap={1}>
          <Text dimColor>Status:</Text>
          <StatusBadge status={currentStatus} />
        </Box>

        <Box flexDirection="row" gap={1}>
          <Text dimColor>Priority:</Text>
          <Text bold color="magenta">
            {artifact.metadata.priority}
          </Text>
        </Box>

        <Box flexDirection="row" gap={1}>
          <Text dimColor>Size:</Text>
          <Text bold>{artifact.metadata.estimation}</Text>
        </Box>
      </Box>

      <Box flexDirection="row" gap={1} marginTop={1}>
        <Text dimColor>Assignee:</Text>
        <Text>{artifact.metadata.assignee}</Text>
      </Box>

      <RelationshipList
        blocks={artifact.metadata.relationships?.blocks || []}
        blockedBy={artifact.metadata.relationships?.blocked_by || []}
        currentStatus={currentStatus}
      />

      {/* Validation Results */}
      {result.validationResult && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={result.validationResult.isValid ? 'green' : 'red'}>
            Validation:{' '}
            {result.validationResult.isValid ? '✓ Valid' : '✗ Invalid'}
          </Text>
          {result.validationResult.errors.length > 0 && (
            <Box flexDirection="column" marginLeft={2}>
              {result.validationResult.errors.map((error) => (
                <Text key={error.code + error.message} color="red">
                  • {error.message}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Parent Blocking Warnings */}
      {result.parentBlocking?.isBlocked && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="yellow">
            ⚠️ Parent Blocking Warning
          </Text>
          <Box flexDirection="column" marginLeft={2}>
            <Text color="yellow">
              This artifact is blocked by:{' '}
              {result.parentBlocking.blockedBy.join(', ')}
            </Text>
          </Box>
        </Box>
      )}

      {/* Experimental Features */}
      {result.experimentalData && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="cyan">
            🧪 Experimental Data
          </Text>
          <Box flexDirection="column" marginLeft={2}>
            <Text>
              Dependencies ({result.experimentalData.dependencies.length}):
            </Text>
            {result.experimentalData.dependencies.map((dep) => (
              <Text key={dep.id} dimColor>
                • {dep.id} ({dep.status})
              </Text>
            ))}
            <Box marginTop={1}>
              <Text>Cascade Preview:</Text>
            </Box>
            {result.experimentalData.cascadePreview.map((cascade) => (
              <Text key={cascade.event + cascade.affects.join(',')} dimColor>
                • {cascade.event} → affects {cascade.affects.length} items
              </Text>
            ))}
          </Box>
        </Box>
      )}

      <EventTimeline
        events={artifact.metadata.events.map((event) => ({
          timestamp: event.timestamp,
          event: event.event,
          actor: event.actor,
        }))}
      />
    </Box>
  );
};
