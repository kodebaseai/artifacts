import { Box, Text } from 'ink';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import type { ListCommandProps } from '../types/command.js';
import {
  ArtifactLoader,
  type ArtifactSummary,
} from '../utils/artifact-loader.js';

/**
 * List Command Component
 *
 * Implements the 'kodebase list' command for displaying artifacts with advanced filtering and sorting.
 *
 * Command syntax: `kodebase list [options]`
 *
 * @description
 * This command provides a comprehensive view of all artifacts in the system:
 * - Recursively discovers all artifacts in the project
 * - Supports multiple filter criteria (type, status, assignee, parent)
 * - Offers flexible sorting options (created, updated, priority, status)
 * - Handles large datasets with pagination
 * - Displays results in organized, scannable format
 *
 * @example
 * ```bash
 * kodebase list                                    # All artifacts
 * kodebase list --type issue --status ready       # Ready issues
 * kodebase list --assignee "John Doe"             # Specific person's work
 * kodebase list --parent A.1 --sort priority     # Issues under A.1 by priority
 * ```
 *
 * **Filter Options:**
 * - `--type`: initiative, milestone, issue (comma-separated)
 * - `--status`: draft, ready, in_progress, completed, etc.
 * - `--assignee`: exact or partial name/email matching
 * - `--parent`: all children under specific parent ID
 * - `--sort`: created, updated, priority, status
 * - `--page`, `--page-size`: pagination controls
 *
 * @see {@link https://github.com/kodebaseai/kodebase/blob/main/packages/cli/src/commands/list-command.md} Full documentation
 */

export const List: FC<ListCommandProps> = ({ options = {} }) => {
  const [artifacts, setArtifacts] = useState<ArtifactSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadArtifacts = async () => {
      try {
        setLoading(true);
        console.log('🔍 Starting to load artifacts...');
        const loader = new ArtifactLoader();
        const allArtifacts = await loader.loadAllArtifacts();
        console.log(`📦 Loaded ${allArtifacts.length} total artifacts`);

        if (allArtifacts.length > 0) {
          console.log('📋 Sample artifacts:');
          allArtifacts.slice(0, 3).forEach((a) => {
            console.log(`  - ${a.id} (${a.type}) - ${a.title}`);
          });
        }

        // Apply filters
        let filteredArtifacts = allArtifacts;

        if (options.type) {
          const types = options.type.split(',');
          console.log(`🔍 Filtering by type: ${types.join(', ')}`);
          const beforeCount = filteredArtifacts.length;
          filteredArtifacts = filteredArtifacts.filter((artifact) =>
            types.includes(artifact.type),
          );
          console.log(
            `📊 After type filter: ${beforeCount} → ${filteredArtifacts.length}`,
          );
        }

        if (options.status) {
          const statuses = options.status.split(',');
          filteredArtifacts = filteredArtifacts.filter((artifact) =>
            statuses.includes(artifact.status),
          );
        }

        if (options.assignee) {
          const assignees = options.assignee.split(',');
          filteredArtifacts = filteredArtifacts.filter((artifact) =>
            assignees.some((assignee) => artifact.assignee.includes(assignee)),
          );
        }

        if (options.parent) {
          filteredArtifacts = filteredArtifacts.filter((artifact) =>
            artifact.id.startsWith(options.parent || ''),
          );
        }

        // Sort artifacts (default by ID)
        const sortField = options.sort || 'id';
        filteredArtifacts.sort((a, b) => {
          switch (sortField) {
            case 'title':
              return a.title.localeCompare(b.title);
            case 'type':
              return a.type.localeCompare(b.type);
            case 'status':
              return a.status.localeCompare(b.status);
            case 'assignee':
              return a.assignee.localeCompare(b.assignee);
            default:
              return a.id.localeCompare(b.id);
          }
        });

        // Apply pagination
        const pageSize = options.pageSize || 50;
        const page = options.page || 1;
        const startIndex = (page - 1) * pageSize;
        const paginatedArtifacts = filteredArtifacts.slice(
          startIndex,
          startIndex + pageSize,
        );

        setArtifacts(paginatedArtifacts);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load artifacts',
        );
      } finally {
        setLoading(false);
      }
    };

    loadArtifacts();
  }, [options]);

  if (loading) {
    return <Text>Loading artifacts...</Text>;
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text>Make sure you're in a Kodebase project directory.</Text>
      </Box>
    );
  }

  if (artifacts.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No artifacts found matching the criteria.</Text>
        <Text>
          Try adjusting your filters or check if the .kodebase/artifacts
          directory exists.
        </Text>
      </Box>
    );
  }

  // Calculate column widths for proper alignment
  const maxIdWidth = Math.max(
    2,
    ...artifacts.map((a) => (' '.repeat(a.level * 2) + a.id).length),
  );
  const maxTitleWidth = Math.max(5, ...artifacts.map((a) => a.title.length));
  const maxTypeWidth = Math.max(4, ...artifacts.map((a) => a.type.length));
  const maxStatusWidth = Math.max(6, ...artifacts.map((a) => a.status.length));
  const maxAssigneeWidth = Math.max(
    8,
    ...artifacts.map((a) => a.assignee.split(' ')[0]?.length || 0),
  );

  // Truncate title if too long
  const truncateTitle = (title: string, maxWidth: number) => {
    if (title.length <= maxWidth) return title;
    return `${title.substring(0, maxWidth - 3)}...`;
  };

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Artifacts ({artifacts.length} found)
      </Text>
      <Text></Text>

      {/* Header row */}
      <Text bold>
        {'ID'.padEnd(maxIdWidth)} {'Title'.padEnd(Math.min(maxTitleWidth, 40))}{' '}
        {'Type'.padEnd(maxTypeWidth)} {'Status'.padEnd(maxStatusWidth)}{' '}
        {'Assignee'.padEnd(maxAssigneeWidth)}
      </Text>

      {/* Separator */}
      <Text color="gray">
        {'-'.repeat(maxIdWidth)} {'-'.repeat(Math.min(maxTitleWidth, 40))}{' '}
        {'-'.repeat(maxTypeWidth)} {'-'.repeat(maxStatusWidth)}{' '}
        {'-'.repeat(maxAssigneeWidth)}
      </Text>

      {/* Data rows */}
      {artifacts.map((artifact) => {
        const indentedId = ' '.repeat(artifact.level * 2) + artifact.id;
        const truncatedTitle = truncateTitle(artifact.title, 40);
        const firstAssignee = artifact.assignee.split(' ')[0] || 'Unassigned';

        return (
          <Text key={artifact.id}>
            {indentedId.padEnd(maxIdWidth)}{' '}
            {truncatedTitle.padEnd(Math.min(maxTitleWidth, 40))}{' '}
            {artifact.type.padEnd(maxTypeWidth)}{' '}
            {artifact.status.padEnd(maxStatusWidth)}{' '}
            {firstAssignee.padEnd(maxAssigneeWidth)}
          </Text>
        );
      })}

      {artifacts.length === (options.pageSize || 50) && (
        <Text color="gray">
          Showing page {options.page || 1}. Use --page to see more results.
        </Text>
      )}
    </Box>
  );
};
