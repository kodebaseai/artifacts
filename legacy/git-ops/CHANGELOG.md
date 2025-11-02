# Changelog

## 0.1.2

### Added

- **Enhanced Error Handling System** - Centralized error handling with structured messages and debug mode
- **Error Categorization** - Differentiates between user errors, system failures, and external dependencies
- **Color-Coded Error Output** - Visual severity indicators (critical, error, warning, info)
- **Debug Mode** - Detailed execution information via environment variables (`KODEBASE_DEBUG`, `DEBUG`)
- **Error Catalog** - 20+ predefined error scenarios with actionable solutions
- **Documentation Links** - Direct links to troubleshooting guides in error messages
- **ErrorFormatter Class** - Centralized error message formatting with constructor-based configuration

### Changed

- **All Git Hooks** - Now use centralized error handling system for consistent messaging
- **Error Messages** - Structured format with problem description, suggestions, and help links
- **Exit Code Behavior** - Error categorization determines appropriate exit codes and continuation

### Improved

- **Developer Experience** - Clear, actionable error messages with specific solutions
- **Debugging** - Debug mode provides detailed context without overwhelming casual users
- **Error Recovery** - Better categorization enables appropriate error handling strategies
- **Documentation** - Comprehensive error handling documentation with API reference

### Technical

- **Test Coverage** - All 193 tests passing (100% success rate) including error scenario testing
- **TypeScript Integration** - Full type safety for error handling system
- **Performance** - Optimized error formatting with lazy loading and efficient templating
- **Environment Configuration** - Flexible configuration via environment variables

## 0.1.1

### Added

- **@kodebase/core Integration** - Complete integration with @kodebase/core state management APIs
- **ArtifactLoader Utility** - New shared utility for loading/saving artifacts with validation
- **Direct State Management** - Hooks now use `performTransition()`, `canTransition()`, and `getCurrentState()` APIs
- **Event Identity System** - Proper handling of `event_id`, `correlation_id`, and `parent_event_id`
- **Comprehensive Integration Tests** - 600+ lines of tests in `core-integration.test.ts`
- **Performance Improvements** - ~140 minutes faster cascade operations compared to CLI approach

### Changed

- **PostCheckoutHook** - Now uses `performTransition()` and `ArtifactParser` instead of CLI commands
- **PostMergeHook** - Integrated with `CascadeEngine` for automatic cascade propagation
- **PrePushHook** - Uses `getCurrentState()` and `ArtifactLoader` for state validation
- **PreCommitHook** - Enhanced validation using `ArtifactValidator`

### Improved

- **Type Safety** - Full TypeScript integration with @kodebase/core types
- **Error Handling** - Graceful degradation when @kodebase/core operations fail
- **Reliability** - No dependency on external CLI availability
- **Testing** - 100% test pass rate (119/119 tests) including integration tests
- **Documentation** - Comprehensive docs for @kodebase/core integration

### Technical

- **Migration from CLI** - Replaced `execSync('kodebase ...')` calls with direct API usage
- **Event Traceability** - Complete audit trail through event identity fields
- **Cascade Automation** - Automatic milestone/initiative completion through state changes

### Patch Changes

- Updated dependencies []:
  - @kodebase/core@0.2.0

All notable changes to @kodebase/git-ops will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-09

### Added

- Initial release of @kodebase/git-ops package
- Git hook implementations:
  - `post-checkout`: Triggers in_progress status and creates draft PR
  - `pre-commit`: Validates commit message format and artifact ID
  - `pre-push`: Validates artifact state before push
  - `post-merge`: Updates artifact to completed status
- Branch management utilities:
  - `BranchValidator`: Validates artifact ID format
  - `BranchCreator`: Creates branches with validation
  - `BranchCleaner`: Cleans up merged branches
- Hook installation system:
  - `HookInstaller`: Install, uninstall, and check status of hooks
  - Automatic backup and restoration
  - Selective hook installation
- PR automation:
  - `PRManager`: Create, update, list, and merge PRs
  - Automatic artifact ID prefixing
  - GitHub CLI integration
- TypeScript type definitions for all operations
- Comprehensive test coverage (102+ tests)
- Integration tests demonstrating complete workflow
- Usage examples for common scenarios
- Full documentation for all modules

### Security

- No secrets or credentials stored in hooks
- All operations use local git configuration
- PR operations require authenticated GitHub CLI

### Dependencies

- `simple-git`: Git operations
- `yaml`: YAML parsing for artifacts
- `zod`: Schema validation
- `@kodebase/core`: Core types and constants (peer dependency)

[0.1.0]: https://github.com/kodebaseai/kodebase/releases/tag/@kodebase/git-ops@0.1.0
