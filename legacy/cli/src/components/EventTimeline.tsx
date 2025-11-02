import { Box, Text } from 'ink';
import type { FC } from 'react';

interface EventTimelineProps {
  events: Array<{
    timestamp: string;
    event: string;
    actor: string;
  }>;
  maxEvents?: number;
}

/**
 * Component for displaying artifact event timeline
 */
export const EventTimeline: FC<EventTimelineProps> = ({
  events,
  maxEvents = 5,
}) => {
  if (events.length === 0) {
    return (
      <Box marginTop={1}>
        <Text dimColor>No events</Text>
      </Box>
    );
  }

  // Sort events by timestamp (newest first) and take the most recent
  const sortedEvents = [...events]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, maxEvents);

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  const getEventColor = (event: string): string => {
    switch (event) {
      case 'draft':
        return 'gray';
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
        return 'red';
      case 'archived':
        return 'gray';
      default:
        return 'white';
    }
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold>Recent Events:</Text>
      {sortedEvents.map((event) => (
        <Box key={event.timestamp} marginTop={1} paddingLeft={2}>
          <Box flexDirection="row" gap={1}>
            <Text color={getEventColor(event.event)} bold>
              {event.event}
            </Text>
            <Text dimColor>{formatTimestamp(event.timestamp)}</Text>
          </Box>
          <Box marginTop={0}>
            <Text dimColor>by {event.actor}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};
