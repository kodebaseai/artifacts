/**
 * Tests for error catalog functionality
 */

import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_CORRUPTED,
  ARTIFACT_NOT_FOUND,
  ERROR_CATALOG,
  GIT_CONFIG_MISSING,
  GITHUB_AUTH_REQUIRED,
  GITHUB_CLI_NOT_INSTALLED,
  getErrorByCode,
  getErrorsByCategory,
  HOOKS_PERMISSION_DENIED,
  INVALID_ARTIFACT_ID,
  INVALID_STATE_TRANSITION,
  NETWORK_TIMEOUT,
  NOT_GIT_REPOSITORY,
} from './error-catalog';

describe('Error Catalog', () => {
  describe('ERROR_CATALOG', () => {
    it('should contain all predefined errors', () => {
      expect(ERROR_CATALOG.size).toBeGreaterThan(0);

      // Check that all error codes are present
      const expectedCodes = [
        'NETWORK_EXTERNAL_001',
        'NETWORK_AUTH_001',
        'ARTIFACT_VALIDATION_001',
        'ARTIFACT_FILE_001',
        'ARTIFACT_FILE_002',
        'PERMISSIONS_FILE_001',
        'NETWORK_CONNECTION_001',
        'ARTIFACT_STATE_001',
        'GIT_CONFIG_001',
        'GIT_REPO_001',
      ];

      for (const code of expectedCodes) {
        expect(ERROR_CATALOG.has(code)).toBe(true);
      }
    });

    it('should have consistent error structure', () => {
      for (const [code, error] of ERROR_CATALOG.entries()) {
        expect(error.code).toBe(code);
        expect(error.severity).toBeDefined();
        expect(error.category).toBeDefined();
        expect(error.type).toBeDefined();
        expect(error.message).toBeDefined();
        expect(error.description).toBeDefined();
        expect(Array.isArray(error.actions)).toBe(true);

        // Check that actions have proper structure
        for (const action of error.actions) {
          expect(action.description).toBeDefined();
          expect(typeof action.description).toBe('string');
          expect(action.description.length).toBeGreaterThan(0);

          if (action.link) {
            expect(action.link).toMatch(/^https?:\/\//);
          }
        }
      }
    });
  });

  describe('getErrorByCode', () => {
    it('should return error for valid code', () => {
      const error = getErrorByCode('NETWORK_EXTERNAL_001');
      expect(error).toBeDefined();
      expect(error?.code).toBe('NETWORK_EXTERNAL_001');
      expect(error?.message).toBe('GitHub CLI not installed');
    });

    it('should return undefined for invalid code', () => {
      const error = getErrorByCode('INVALID_CODE_999');
      expect(error).toBeUndefined();
    });
  });

  describe('getErrorsByCategory', () => {
    it('should return errors for valid category', () => {
      const networkErrors = getErrorsByCategory('network');
      expect(networkErrors.length).toBeGreaterThan(0);

      for (const error of networkErrors) {
        expect(error.category).toBe('network');
      }
    });

    it('should return empty array for invalid category', () => {
      const errors = getErrorsByCategory('invalid_category');
      expect(errors).toEqual([]);
    });

    it('should return all git_config errors', () => {
      const gitConfigErrors = getErrorsByCategory('git_config');
      expect(gitConfigErrors.length).toBeGreaterThan(0);

      for (const error of gitConfigErrors) {
        expect(error.category).toBe('git_config');
      }
    });
  });

  describe('GitHub CLI errors', () => {
    describe('GITHUB_CLI_NOT_INSTALLED', () => {
      it('should have correct structure', () => {
        expect(GITHUB_CLI_NOT_INSTALLED.code).toBe('NETWORK_EXTERNAL_001');
        expect(GITHUB_CLI_NOT_INSTALLED.severity).toBe('error');
        expect(GITHUB_CLI_NOT_INSTALLED.category).toBe('network');
        expect(GITHUB_CLI_NOT_INSTALLED.type).toBe('external_dependency');
        expect(GITHUB_CLI_NOT_INSTALLED.message).toBe(
          'GitHub CLI not installed',
        );
        expect(GITHUB_CLI_NOT_INSTALLED.actions.length).toBeGreaterThan(0);
      });

      it('should have installation instructions', () => {
        const hasBrewInstall = GITHUB_CLI_NOT_INSTALLED.actions.some((action) =>
          action.command?.includes('brew install gh'),
        );
        const hasWebsiteLink = GITHUB_CLI_NOT_INSTALLED.actions.some((action) =>
          action.command?.includes('https://cli.github.com/'),
        );

        expect(hasBrewInstall).toBe(true);
        expect(hasWebsiteLink).toBe(true);
      });
    });

    describe('GITHUB_AUTH_REQUIRED', () => {
      it('should have correct structure', () => {
        expect(GITHUB_AUTH_REQUIRED.code).toBe('NETWORK_AUTH_001');
        expect(GITHUB_AUTH_REQUIRED.severity).toBe('error');
        expect(GITHUB_AUTH_REQUIRED.category).toBe('authentication');
        expect(GITHUB_AUTH_REQUIRED.type).toBe('user_error');
        expect(GITHUB_AUTH_REQUIRED.message).toBe(
          'GitHub authentication required',
        );
      });

      it('should have authentication instructions', () => {
        const hasAuthLogin = GITHUB_AUTH_REQUIRED.actions.some((action) =>
          action.command?.includes('gh auth login'),
        );
        const hasAuthStatus = GITHUB_AUTH_REQUIRED.actions.some((action) =>
          action.command?.includes('gh auth status'),
        );

        expect(hasAuthLogin).toBe(true);
        expect(hasAuthStatus).toBe(true);
      });
    });
  });

  describe('Artifact errors', () => {
    describe('INVALID_ARTIFACT_ID', () => {
      it('should have correct structure', () => {
        expect(INVALID_ARTIFACT_ID.code).toBe('ARTIFACT_VALIDATION_001');
        expect(INVALID_ARTIFACT_ID.severity).toBe('error');
        expect(INVALID_ARTIFACT_ID.category).toBe('validation');
        expect(INVALID_ARTIFACT_ID.type).toBe('user_error');
        expect(INVALID_ARTIFACT_ID.message).toBe('Invalid artifact ID format');
      });

      it('should have example artifact ID format', () => {
        const hasExample = INVALID_ARTIFACT_ID.actions.some((action) =>
          action.command?.includes('A.1.5'),
        );
        expect(hasExample).toBe(true);
      });
    });

    describe('ARTIFACT_NOT_FOUND', () => {
      it('should have correct structure', () => {
        expect(ARTIFACT_NOT_FOUND.code).toBe('ARTIFACT_FILE_001');
        expect(ARTIFACT_NOT_FOUND.severity).toBe('error');
        expect(ARTIFACT_NOT_FOUND.category).toBe('artifact');
        expect(ARTIFACT_NOT_FOUND.type).toBe('user_error');
        expect(ARTIFACT_NOT_FOUND.message).toBe('Artifact file not found');
      });

      it('should have file checking and creation instructions', () => {
        const hasListCommand = ARTIFACT_NOT_FOUND.actions.some((action) =>
          action.command?.includes('ls -la'),
        );
        const hasCopyCommand = ARTIFACT_NOT_FOUND.actions.some((action) =>
          action.command?.includes('cp'),
        );

        expect(hasListCommand).toBe(true);
        expect(hasCopyCommand).toBe(true);
      });
    });

    describe('ARTIFACT_CORRUPTED', () => {
      it('should have correct structure', () => {
        expect(ARTIFACT_CORRUPTED.code).toBe('ARTIFACT_FILE_002');
        expect(ARTIFACT_CORRUPTED.severity).toBe('error');
        expect(ARTIFACT_CORRUPTED.category).toBe('artifact');
        expect(ARTIFACT_CORRUPTED.type).toBe('user_error');
        expect(ARTIFACT_CORRUPTED.message).toBe(
          'Artifact file corrupted or invalid',
        );
      });

      it('should have validation and recovery instructions', () => {
        const hasYamlValidation = ARTIFACT_CORRUPTED.actions.some((action) =>
          action.command?.includes('js-yaml'),
        );
        const hasGitRestore = ARTIFACT_CORRUPTED.actions.some((action) =>
          action.command?.includes('git checkout'),
        );

        expect(hasYamlValidation).toBe(true);
        expect(hasGitRestore).toBe(true);
      });
    });
  });

  describe('Permission errors', () => {
    describe('HOOKS_PERMISSION_DENIED', () => {
      it('should have correct structure', () => {
        expect(HOOKS_PERMISSION_DENIED.code).toBe('PERMISSIONS_FILE_001');
        expect(HOOKS_PERMISSION_DENIED.severity).toBe('error');
        expect(HOOKS_PERMISSION_DENIED.category).toBe('permissions');
        expect(HOOKS_PERMISSION_DENIED.type).toBe('system_failure');
        expect(HOOKS_PERMISSION_DENIED.message).toBe(
          'Permission denied accessing git hooks',
        );
      });

      it('should have permission fixing instructions', () => {
        const hasChmodCommand = HOOKS_PERMISSION_DENIED.actions.some((action) =>
          action.command?.includes('chmod'),
        );
        const hasListCommand = HOOKS_PERMISSION_DENIED.actions.some((action) =>
          action.command?.includes('ls -la'),
        );

        expect(hasChmodCommand).toBe(true);
        expect(hasListCommand).toBe(true);
      });
    });
  });

  describe('Network errors', () => {
    describe('NETWORK_TIMEOUT', () => {
      it('should have correct structure', () => {
        expect(NETWORK_TIMEOUT.code).toBe('NETWORK_CONNECTION_001');
        expect(NETWORK_TIMEOUT.severity).toBe('warning');
        expect(NETWORK_TIMEOUT.category).toBe('network');
        expect(NETWORK_TIMEOUT.type).toBe('external_dependency');
        expect(NETWORK_TIMEOUT.message).toBe('Network operation timed out');
      });

      it('should have connectivity checking instructions', () => {
        const hasPingCommand = NETWORK_TIMEOUT.actions.some((action) =>
          action.command?.includes('ping'),
        );
        const hasStatusCheck = NETWORK_TIMEOUT.actions.some((action) =>
          action.command?.includes('status.github.com'),
        );

        expect(hasPingCommand).toBe(true);
        expect(hasStatusCheck).toBe(true);
      });
    });
  });

  describe('State transition errors', () => {
    describe('INVALID_STATE_TRANSITION', () => {
      it('should have correct structure', () => {
        expect(INVALID_STATE_TRANSITION.code).toBe('ARTIFACT_STATE_001');
        expect(INVALID_STATE_TRANSITION.severity).toBe('error');
        expect(INVALID_STATE_TRANSITION.category).toBe('validation');
        expect(INVALID_STATE_TRANSITION.type).toBe('user_error');
        expect(INVALID_STATE_TRANSITION.message).toBe(
          'Invalid state transition',
        );
      });

      it('should have state checking instructions', () => {
        const hasGrepCommand = INVALID_STATE_TRANSITION.actions.some((action) =>
          action.command?.includes('grep'),
        );

        expect(hasGrepCommand).toBe(true);
      });
    });
  });

  describe('Git configuration errors', () => {
    describe('GIT_CONFIG_MISSING', () => {
      it('should have correct structure', () => {
        expect(GIT_CONFIG_MISSING.code).toBe('GIT_CONFIG_001');
        expect(GIT_CONFIG_MISSING.severity).toBe('error');
        expect(GIT_CONFIG_MISSING.category).toBe('git_config');
        expect(GIT_CONFIG_MISSING.type).toBe('user_error');
        expect(GIT_CONFIG_MISSING.message).toBe('Git configuration missing');
      });

      it('should have git config instructions', () => {
        const hasUserName = GIT_CONFIG_MISSING.actions.some((action) =>
          action.command?.includes('git config user.name'),
        );
        const hasUserEmail = GIT_CONFIG_MISSING.actions.some((action) =>
          action.command?.includes('git config user.email'),
        );

        expect(hasUserName).toBe(true);
        expect(hasUserEmail).toBe(true);
      });
    });

    describe('NOT_GIT_REPOSITORY', () => {
      it('should have correct structure', () => {
        expect(NOT_GIT_REPOSITORY.code).toBe('GIT_REPO_001');
        expect(NOT_GIT_REPOSITORY.severity).toBe('error');
        expect(NOT_GIT_REPOSITORY.category).toBe('git_repository');
        expect(NOT_GIT_REPOSITORY.type).toBe('user_error');
        expect(NOT_GIT_REPOSITORY.message).toBe('Not a git repository');
      });

      it('should have git initialization instructions', () => {
        const hasGitInit = NOT_GIT_REPOSITORY.actions.some((action) =>
          action.command?.includes('git init'),
        );
        const hasPwdCommand = NOT_GIT_REPOSITORY.actions.some((action) =>
          action.command?.includes('pwd'),
        );

        expect(hasGitInit).toBe(true);
        expect(hasPwdCommand).toBe(true);
      });
    });
  });

  describe('Documentation links', () => {
    it('should have consistent documentation base URL', () => {
      for (const error of ERROR_CATALOG.values()) {
        for (const action of error.actions) {
          if (action.link) {
            expect(action.link).toMatch(/^https:\/\/docs\.kodebase\.ai/);
          }
        }
      }
    });

    it('should have troubleshooting links for all error categories', () => {
      const categories = new Set<string>();
      for (const error of ERROR_CATALOG.values()) {
        categories.add(error.category);
      }

      for (const category of categories) {
        const categoryErrors = getErrorsByCategory(category);
        const hasDocumentationLink = categoryErrors.some((error) =>
          error.actions.some((action) => action.link),
        );

        // Allow some categories to not have documentation links
        // but most should have them
        if (category !== 'unknown' && category !== 'system') {
          expect(hasDocumentationLink).toBe(true);
        }
      }
    });
  });

  describe('Error severity and types', () => {
    it('should have appropriate severity levels', () => {
      const severityCounts = {
        critical: 0,
        error: 0,
        warning: 0,
        info: 0,
      };

      for (const error of ERROR_CATALOG.values()) {
        severityCounts[error.severity]++;
      }

      // Most errors should be 'error' level
      expect(severityCounts.error).toBeGreaterThan(severityCounts.critical);
      expect(severityCounts.error).toBeGreaterThan(severityCounts.warning);
    });

    it('should have appropriate error types', () => {
      const typeCounts = {
        user_error: 0,
        system_failure: 0,
        external_dependency: 0,
      };

      for (const error of ERROR_CATALOG.values()) {
        typeCounts[error.type]++;
      }

      // Should have a mix of error types
      expect(typeCounts.user_error).toBeGreaterThan(0);
      expect(typeCounts.system_failure).toBeGreaterThan(0);
      expect(typeCounts.external_dependency).toBeGreaterThan(0);
    });

    it('should have external dependencies as warnings or errors', () => {
      for (const error of ERROR_CATALOG.values()) {
        if (error.type === 'external_dependency') {
          expect(['warning', 'error'].includes(error.severity)).toBe(true);
        }
      }
    });

    it('should have system failures as errors or critical', () => {
      for (const error of ERROR_CATALOG.values()) {
        if (error.type === 'system_failure') {
          expect(['error', 'critical'].includes(error.severity)).toBe(true);
        }
      }
    });
  });
});
