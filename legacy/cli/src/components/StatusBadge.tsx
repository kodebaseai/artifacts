import { Text } from 'ink';
import type { FC } from 'react';

interface StatusBadgeProps {
  status: string;
}

/**
 * Status badge component for displaying artifact status with color coding
 */
export const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ready':
        return 'green';
      case 'in_progress':
        return 'yellow';
      case 'in_review':
        return 'blue';
      case 'completed':
        return 'green';
      case 'blocked':
        return 'red';
      case 'cancelled':
        return 'gray';
      case 'archived':
        return 'gray';
      case 'draft':
        return 'gray';
      default:
        return 'white';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'in_progress':
        return 'In Progress';
      case 'in_review':
        return 'In Review';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <Text color={getStatusColor(status)} bold>
      {getStatusLabel(status)}
    </Text>
  );
};
