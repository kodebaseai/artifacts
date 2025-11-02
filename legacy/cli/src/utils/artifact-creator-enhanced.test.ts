/**
 * Enhanced Artifact Creator Tests
 *
 * Tests for the new features added in I.1.2:
 * - Wizard branch creation (add-<slug>)
 * - --submit flag functionality
 * - V3 event schema generation
 */

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { CArtifactEvent, CEventTrigger } from '@kodebase/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createArtifact } from './artifact-creator';

// Mock child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Mock fs
vi.mock('node:fs', () => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// Mock glob
vi.mock('glob', () => ({
  glob: {
    sync: vi.fn(() => []),
  },
}));

// Mock @kodebase/core
vi.mock('@kodebase/core', () => ({
  CArtifactEvent: {
    DRAFT: 'draft',
    READY: 'ready',
    IN_PROGRESS: 'in_progress',
    IN_REVIEW: 'in_review',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    BLOCKED: 'blocked',
    ARCHIVED: 'archived',
  },
  CEventTrigger: {
    ARTIFACT_CREATED: 'artifact_created',
    DEPENDENCIES_MET: 'dependencies_met',
    BRANCH_CREATED: 'branch_created',
    VALIDATION_PASSED: 'validation_passed',
    MANUAL: 'manual',
    SYSTEM: 'system',
  },
  ArtifactFactory: vi.fn().mockImplementation(() => ({
    createInitiative: vi.fn(() => ({
      artifact: {
        metadata: {
          title: 'Test Initiative',
          priority: 'medium',
          estimation: 'L',
          created_by: 'Test User (test@example.com)',
          assignee: 'Test User (test@example.com)',
          schema_version: '0.2.0',
          relationships: { blocks: [], blocked_by: [] },
          events: [
            {
              event: CArtifactEvent.DRAFT,
              timestamp: '2025-01-01T00:00:00Z',
              actor: 'Test User (test@example.com)',
              trigger: CEventTrigger.ARTIFACT_CREATED,
            },
          ],
        },
        content: {
          vision: 'Test vision',
          scope: 'Test scope',
          success_criteria: ['Test criteria'],
        },
      },
      id: 'A',
    })),
    createMilestone: vi.fn(() => ({
      artifact: {
        metadata: {
          title: 'Test Milestone',
          priority: 'medium',
          estimation: 'M',
          created_by: 'Test User (test@example.com)',
          assignee: 'Test User (test@example.com)',
          schema_version: '0.2.0',
          relationships: { blocks: [], blocked_by: [] },
          events: [
            {
              event: CArtifactEvent.DRAFT,
              timestamp: '2025-01-01T00:00:00Z',
              actor: 'Test User (test@example.com)',
              trigger: CEventTrigger.ARTIFACT_CREATED,
            },
          ],
        },
        content: {
          summary: 'Test summary',
          deliverables: ['Test deliverable'],
          validation: ['Test validation'],
        },
      },
      id: 'A.1',
    })),
    createIssue: vi.fn(() => ({
      artifact: {
        metadata: {
          title: 'Test Issue',
          priority: 'medium',
          estimation: 'S',
          created_by: 'Test User (test@example.com)',
          assignee: 'Test User (test@example.com)',
          schema_version: '0.2.0',
          relationships: { blocks: [], blocked_by: [] },
          events: [
            {
              event: CArtifactEvent.DRAFT,
              timestamp: '2025-01-01T00:00:00Z',
              actor: 'Test User (test@example.com)',
              trigger: CEventTrigger.ARTIFACT_CREATED,
            },
          ],
        },
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criteria'],
        },
      },
      id: 'A.1.1',
    })),
  })),
}));

describe('Enhanced Artifact Creator', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock behaviors
    (execSync as any).mockImplementation((cmd: string) => {
      if (cmd === 'git config user.name') return 'Test User';
      if (cmd === 'git config user.email') return 'test@example.com';
      if (cmd === 'git branch --list') return '  main\n* current-branch';
      if (cmd.startsWith('git checkout -b')) return '';
      if (cmd.startsWith('git checkout')) return '';
      return '';
    });
  });

  describe('Wizard Branch Creation', () => {
    it('should create add-<artifact-id> branch for new artifacts', async () => {
      await createArtifact(undefined, 'Build User Authentication System');

      // Verify branch creation was attempted
      const execCalls = (execSync as any).mock.calls;
      const branchCreationCall = execCalls.find((call: string[]) =>
        call[0]?.includes('git checkout -b add-'),
      );

      expect(branchCreationCall).toBeDefined();
      expect(branchCreationCall[0]).toContain('add-A');
    });

    it('should use artifact ID for branch name', async () => {
      await createArtifact(undefined, 'Complex!@# Title with $pecial Ch@rs');

      const execCalls = (execSync as any).mock.calls;
      const branchCreationCall = execCalls.find((call: string[]) =>
        call[0]?.includes('git checkout -b add-'),
      );

      // Should use artifact ID, not slug from title
      expect(branchCreationCall[0]).toContain('add-A');
    });

    it('should resume existing wizard branch', async () => {
      // Mock branch already exists
      (execSync as any).mockImplementation((cmd: string) => {
        if (cmd === 'git config user.name') return 'Test User';
        if (cmd === 'git config user.email') return 'test@example.com';
        if (cmd === 'git branch --list') {
          return '  main\n  add-A\n* current-branch';
        }
        return '';
      });

      await createArtifact(undefined, 'Existing Feature');

      const execCalls = (execSync as any).mock.calls;
      const checkoutCall = execCalls.find(
        (call: string[]) => call[0] === 'git checkout add-A',
      );

      expect(checkoutCall).toBeDefined();
    });
  });

  describe('Submit Flag Functionality', () => {
    it('should handle --submit flag with git operations', async () => {
      await createArtifact(undefined, 'Test Feature', undefined, {
        submit: true,
      });

      const execCalls = (execSync as any).mock.calls;

      // Should add, commit, and push
      const addCall = execCalls.find((call: string[]) =>
        call[0]?.includes('git add'),
      );
      const commitCall = execCalls.find((call: string[]) =>
        call[0]?.includes('git commit'),
      );
      const pushCall = execCalls.find((call: string[]) =>
        call[0]?.includes('git push'),
      );

      expect(addCall).toBeDefined();
      expect(commitCall).toBeDefined();
      expect(commitCall[0]).toContain('A: Add draft artifact');
      expect(pushCall).toBeDefined();
      expect(pushCall[0]).toContain('--set-upstream origin add-A');
    });

    it('should not perform git operations without submit flag', async () => {
      await createArtifact(undefined, 'Test Feature Without Submit');

      const execCalls = (execSync as any).mock.calls;

      // Should NOT have git add, commit, or push
      const addCall = execCalls.find((call: string[]) =>
        call[0]?.includes('git add'),
      );
      const commitCall = execCalls.find((call: string[]) =>
        call[0]?.includes('git commit'),
      );
      const pushCall = execCalls.find((call: string[]) =>
        call[0]?.includes('git push'),
      );

      expect(addCall).toBeUndefined();
      expect(commitCall).toBeUndefined();
      expect(pushCall).toBeUndefined();
    });
  });

  describe('V3 Event Schema', () => {
    it('should generate events with v3 schema structure', async () => {
      const _result = await createArtifact(undefined, 'Test V3 Schema');

      // Check that writeFileSync was called
      expect(writeFileSync).toHaveBeenCalled();

      const writeCall = (writeFileSync as any).mock.calls[0];
      const yamlContent = writeCall[1];

      // Verify v3 event schema fields
      expect(yamlContent).toContain('event: draft');
      expect(yamlContent).toContain('timestamp:');
      expect(yamlContent).toContain('actor:');
      expect(yamlContent).toContain('trigger: artifact_created');
    });

    it('should have event field before timestamp in v3 schema', async () => {
      await createArtifact(undefined, 'Test Field Order');

      const writeCall = (writeFileSync as any).mock.calls[0];
      const yamlContent = writeCall[1];

      // Find the events section
      const eventsSection = yamlContent.split('events:')[1];
      const eventIndex = eventsSection.indexOf('event:');
      const timestampIndex = eventsSection.indexOf('timestamp:');

      // Event should come before timestamp in v3 schema
      expect(eventIndex).toBeLessThan(timestampIndex);
    });
  });

  describe('Parent ID Handling', () => {
    it('should handle milestone creation under initiative', async () => {
      const result = await createArtifact('A', 'New Milestone');

      // Should determine it's a milestone based on parent
      expect(result.type).toBe('milestone');
    });

    it('should handle issue creation under milestone', async () => {
      const result = await createArtifact('A.1', 'New Issue');

      // Should determine it's an issue based on parent
      expect(result.type).toBe('issue');
    });
  });
});
