import { Box, Text } from 'ink';
import type { FC } from 'react';

export const Version: FC = () => {
  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>
        Kodebase CLI
      </Text>
      <Text>Version: 0.0.0</Text>
    </Box>
  );
};
