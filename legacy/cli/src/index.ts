import { render } from 'ink';
import React from 'react';
import { App } from './components/App.js';
import { measurePerformance } from './utils/performance.js';

// Parse args and extract verbose flag
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');

// Filter out global flags from args passed to App
const filteredArgs = args.filter((arg) => arg !== '--verbose');

// Wrap the entire CLI execution in performance monitoring
measurePerformance('cli-execution', async () => {
  render(React.createElement(App, { args: filteredArgs, verbose }));
  return Promise.resolve();
}).catch((error) => {
  // Fallback error handling if React error boundary doesn't catch it
  console.error('\x1b[31m✗ Fatal Error:\x1b[0m', error.message);
  if (verbose && error.stack) {
    console.error('\x1b[90mStack trace:\x1b[0m');
    console.error(error.stack);
  }
  process.exit(error.exitCode || 1);
});
