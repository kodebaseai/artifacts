/**
 * Global error handler component for the Kodebase CLI
 *
 * Provides comprehensive error display with color coding, suggestions,
 * and stack traces based on verbosity level.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { CLIError, type ErrorSuggestion } from '../types/errors.js';

interface ErrorHandlerProps {
  readonly error: Error;
  readonly verbose?: boolean;
}

/**
 * Individual suggestion component with proper formatting
 */
const SuggestionItem: React.FC<{ suggestion: ErrorSuggestion }> = ({
  suggestion,
}) => (
  <Box flexDirection="column" marginLeft={2}>
    <Text color="yellow">• {suggestion.action}</Text>
    {suggestion.command && (
      <Box marginLeft={2}>
        <Text color="gray" dimColor>
          $ {suggestion.command}
        </Text>
      </Box>
    )}
    <Box marginLeft={2}>
      <Text color="gray" dimColor>
        {suggestion.description}
      </Text>
    </Box>
  </Box>
);

/**
 * Main error display component
 */
export const ErrorHandler: React.FC<ErrorHandlerProps> = ({
  error,
  verbose = false,
}) => {
  const isCLIError = error instanceof CLIError;
  const suggestions = isCLIError ? error.suggestions : [];
  const showStack = verbose || (isCLIError && error.showStackTrace);

  return (
    <Box flexDirection="column">
      {/* Error Header */}
      <Box>
        <Text color="red" bold>
          ✗ Error:{' '}
        </Text>
        <Text color="red">{error.message}</Text>
      </Box>

      {/* Cause chain for wrapped errors */}
      {isCLIError && error.cause && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Caused by: {error.cause.message}
          </Text>
        </Box>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow" bold>
            Suggestions:
          </Text>
          {suggestions.map((suggestion, suggestionIndex) => (
            <SuggestionItem
              key={`${suggestion.action}-${suggestionIndex}`}
              suggestion={suggestion}
            />
          ))}
        </Box>
      )}

      {/* Stack trace (only when verbose or explicitly requested) */}
      {showStack && error.stack && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="gray" dimColor bold>
            Stack trace:
          </Text>
          <Text color="gray" dimColor>
            {error.stack}
          </Text>
        </Box>
      )}

      {/* Help hint */}
      {!verbose && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Use --verbose flag for detailed error information
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Hook for handling errors in command components
 */
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: unknown): CLIError => {
    if (error instanceof CLIError) {
      return error;
    }

    if (error instanceof Error) {
      // Create a concrete CLIError subclass instead of the abstract base
      const originalError = error; // Capture in closure
      return new (class extends CLIError {
        constructor() {
          super(originalError.message, { cause: originalError });
        }
      })();
    }

    // Create a concrete CLIError subclass instead of the abstract base
    return new (class extends CLIError {
      constructor() {
        super(typeof error === 'string' ? error : 'An unknown error occurred', {
          showStackTrace: true,
        });
      }
    })();
  }, []);

  return { handleError };
};

/**
 * Higher-order component that wraps commands with error boundaries
 */
export const withErrorHandler = <P extends object>(
  Component: React.ComponentType<P>,
): React.FC<P & { verbose?: boolean }> => {
  return (props) => {
    const [error, setError] = React.useState<Error | null>(null);
    const { handleError } = useErrorHandler();

    // Error boundary for React errors (CLI doesn't have window/browser events)
    React.useEffect(() => {
      // In CLI environment, we rely on React's error boundaries
      // and manual error handling in components
      const handleProcessError = (error: Error) => {
        setError(handleError(error));
      };

      const handleUnhandledRejection = (reason: unknown) => {
        setError(handleError(reason));
      };

      process.on('uncaughtException', handleProcessError);
      process.on('unhandledRejection', handleUnhandledRejection);

      return () => {
        process.off('uncaughtException', handleProcessError);
        process.off('unhandledRejection', handleUnhandledRejection);
      };
    }, [handleError]);

    if (error) {
      return <ErrorHandler error={error} verbose={props.verbose} />;
    }

    try {
      return <Component {...props} />;
    } catch (err) {
      const cliError = handleError(err);
      return <ErrorHandler error={cliError} verbose={props.verbose} />;
    }
  };
};
