/**
 * Tests for Artifact Factory
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  CArtifactEvent,
  CEstimationSize,
  CPriority,
} from '../../data/types/constants';
// isValidEventId removed in v2.0 schema - event_id field no longer exists
import { ArtifactFactory } from './index';
import type { UserInfo } from './types';

describe('ArtifactFactory', () => {
  let factory: ArtifactFactory;
  let user: UserInfo;

  beforeEach(() => {
    factory = new ArtifactFactory();
    user = { name: 'John Doe', email: 'john@example.com' };
  });

  describe('createInitiative', () => {
    it('should create a valid initiative with auto-generated ID', () => {
      const result = factory.createInitiative({
        user,
        title: 'Core Platform Development',
        vision: 'Build a scalable platform',
        scope: 'Backend APIs and core services',
        success_criteria: ['APIs deployed', 'Performance targets met'],
      });

      // Check ID generation
      expect(result.id).toBe('A'); // First initiative should be 'A'

      // Check artifact structure
      const { artifact } = result;
      expect(artifact.metadata.title).toBe('Core Platform Development');
      expect(artifact.metadata.priority).toBe(CPriority.MEDIUM); // Default
      expect(artifact.metadata.estimation).toBe(CEstimationSize.L); // Default for initiatives
      expect(artifact.metadata.created_by).toBe('John Doe (john@example.com)');
      expect(artifact.metadata.assignee).toBe('John Doe (john@example.com)');
      expect(artifact.metadata.schema_version).toBe('0.2.0');

      // Check relationships
      expect(artifact.metadata.relationships.blocks).toEqual([]);
      expect(artifact.metadata.relationships.blocked_by).toEqual([]);

      // Check events
      expect(artifact.metadata.events).toHaveLength(1);
      const event = artifact.metadata.events[0];

      if (!event) {
        throw new Error('Event is undefined');
      }

      expect(event.event).toBe(CArtifactEvent.DRAFT);
      expect(event.actor).toBe('John Doe (john@example.com)');
      expect(event.trigger).toBeDefined();
      expect(event.timestamp).toBeDefined();

      // Check content
      expect(artifact.content.vision).toBe('Build a scalable platform');
      expect(artifact.content.scope).toBe('Backend APIs and core services');
      expect(artifact.content.success_criteria).toEqual([
        'APIs deployed',
        'Performance targets met',
      ]);
    });

    it('should generate sequential IDs for multiple initiatives', () => {
      const result1 = factory.createInitiative({
        user,
        title: 'First Initiative',
        vision: 'First vision',
        scope: 'First scope',
        success_criteria: ['First criteria'],
      });

      const result2 = factory.createInitiative({
        user,
        title: 'Second Initiative',
        vision: 'Second vision',
        scope: 'Second scope',
        success_criteria: ['Second criteria'],
      });

      expect(result1.id).toBe('A');
      expect(result2.id).toBe('B');
    });

    it('should respect custom options', () => {
      const result = factory.createInitiative({
        user,
        title: 'Custom Initiative',
        vision: 'Custom vision',
        scope: 'Custom scope',
        success_criteria: ['Custom criteria'],
        priority: CPriority.HIGH,
        estimation: CEstimationSize.XL,
        schema_version: '1.0.0',
        blocked_by: ['Z'],
        notes: 'Custom notes',
      });

      const { artifact } = result;
      expect(artifact.metadata.priority).toBe(CPriority.HIGH);
      expect(artifact.metadata.estimation).toBe(CEstimationSize.XL);
      expect(artifact.metadata.schema_version).toBe('1.0.0');
      expect(artifact.metadata.relationships.blocked_by).toEqual(['Z']);
      expect(artifact.notes).toBe('Custom notes');
    });

    it('should handle existing initiatives in context', () => {
      const existingArtifacts = new Map([
        ['A', {}],
        ['C', {}], // B is available
      ]);

      const factoryWithExisting = new ArtifactFactory(existingArtifacts);
      const result = factoryWithExisting.createInitiative({
        user,
        title: 'New Initiative',
        vision: 'New vision',
        scope: 'New scope',
        success_criteria: ['New criteria'],
      });

      expect(result.id).toBe('B'); // Should fill the gap
    });
  });

  describe('createMilestone', () => {
    beforeEach(() => {
      // Create parent initiative first
      factory.createInitiative({
        user,
        title: 'Parent Initiative',
        vision: 'Parent vision',
        scope: 'Parent scope',
        success_criteria: ['Parent criteria'],
      });
    });

    it('should create a valid milestone with auto-generated ID', () => {
      const result = factory.createMilestone({
        user,
        title: 'API Foundation',
        parent_initiative_id: 'A',
        summary: 'Core API infrastructure',
        deliverables: ['REST API', 'Authentication'],
        validation: ['All endpoints tested', 'Performance benchmarks met'],
      });

      // Check ID generation
      expect(result.id).toBe('A.1'); // First milestone under A

      // Check artifact structure
      const { artifact } = result;
      expect(artifact.metadata.title).toBe('API Foundation');
      expect(artifact.metadata.priority).toBe(CPriority.MEDIUM); // Default
      expect(artifact.metadata.estimation).toBe(CEstimationSize.M); // Default for milestones
      expect(artifact.metadata.created_by).toBe('John Doe (john@example.com)');

      // Check events
      expect(artifact.metadata.events).toHaveLength(1);
      expect(artifact.metadata.events[0]?.event).toBe(CArtifactEvent.DRAFT);

      // Check content
      expect(artifact.content.summary).toBe('Core API infrastructure');
      expect(artifact.content.deliverables).toEqual([
        'REST API',
        'Authentication',
      ]);
      expect(artifact.content.validation).toEqual([
        'All endpoints tested',
        'Performance benchmarks met',
      ]);
    });

    it('should generate sequential IDs under the same initiative', () => {
      const result1 = factory.createMilestone({
        user,
        title: 'First Milestone',
        parent_initiative_id: 'A',
        summary: 'First summary',
        deliverables: ['First deliverable'],
        validation: ['First validation'],
      });

      const result2 = factory.createMilestone({
        user,
        title: 'Second Milestone',
        parent_initiative_id: 'A',
        summary: 'Second summary',
        deliverables: ['Second deliverable'],
        validation: ['Second validation'],
      });

      expect(result1.id).toBe('A.1');
      expect(result2.id).toBe('A.2');
    });

    it('should throw error if parent initiative does not exist', () => {
      expect(() => {
        factory.createMilestone({
          user,
          title: 'Orphaned Milestone',
          parent_initiative_id: 'Z', // Doesn't exist
          summary: 'Summary',
          deliverables: ['Deliverable'],
          validation: ['Validation'],
        });
      }).toThrow("Parent initiative 'Z' not found");
    });

    it('should respect custom options', () => {
      const result = factory.createMilestone({
        user,
        title: 'Custom Milestone',
        parent_initiative_id: 'A',
        summary: 'Custom summary',
        deliverables: ['Custom deliverable'],
        validation: ['Custom validation'],
        priority: CPriority.CRITICAL,
        estimation: CEstimationSize.S,
        notes: 'Custom notes',
      });

      const { artifact } = result;
      expect(artifact.metadata.priority).toBe(CPriority.CRITICAL);
      expect(artifact.metadata.estimation).toBe(CEstimationSize.S);
      expect(artifact.notes).toBe('Custom notes');
    });
  });

  describe('createIssue', () => {
    beforeEach(() => {
      // Create parent hierarchy
      factory.createInitiative({
        user,
        title: 'Parent Initiative',
        vision: 'Parent vision',
        scope: 'Parent scope',
        success_criteria: ['Parent criteria'],
      });

      factory.createMilestone({
        user,
        title: 'Parent Milestone',
        parent_initiative_id: 'A',
        summary: 'Parent summary',
        deliverables: ['Parent deliverable'],
        validation: ['Parent validation'],
      });
    });

    it('should create a valid issue with auto-generated ID', () => {
      const result = factory.createIssue({
        user,
        title: 'Implement user authentication',
        parent_milestone_id: 'A.1',
        summary: 'Add secure user authentication system',
        acceptance_criteria: [
          'Users can register with email/password',
          'Users can login and receive JWT token',
          'Sessions expire after 24 hours',
        ],
      });

      // Check ID generation
      expect(result.id).toBe('A.1.1'); // First issue under A.1

      // Check artifact structure
      const { artifact } = result;
      expect(artifact.metadata.title).toBe('Implement user authentication');
      expect(artifact.metadata.priority).toBe(CPriority.MEDIUM); // Default
      expect(artifact.metadata.estimation).toBe(CEstimationSize.S); // Default for issues
      expect(artifact.metadata.created_by).toBe('John Doe (john@example.com)');

      // Check events
      expect(artifact.metadata.events).toHaveLength(1);
      expect(artifact.metadata.events[0]?.event).toBe(CArtifactEvent.DRAFT);

      // Check content
      expect(artifact.content.summary).toBe(
        'Add secure user authentication system',
      );
      expect(artifact.content.acceptance_criteria).toEqual([
        'Users can register with email/password',
        'Users can login and receive JWT token',
        'Sessions expire after 24 hours',
      ]);
    });

    it('should generate sequential IDs under the same milestone', () => {
      const result1 = factory.createIssue({
        user,
        title: 'First Issue',
        parent_milestone_id: 'A.1',
        summary: 'First summary',
        acceptance_criteria: ['First criteria'],
      });

      const result2 = factory.createIssue({
        user,
        title: 'Second Issue',
        parent_milestone_id: 'A.1',
        summary: 'Second summary',
        acceptance_criteria: ['Second criteria'],
      });

      expect(result1.id).toBe('A.1.1');
      expect(result2.id).toBe('A.1.2');
    });

    it('should throw error if parent milestone does not exist', () => {
      expect(() => {
        factory.createIssue({
          user,
          title: 'Orphaned Issue',
          parent_milestone_id: 'Z.1', // Doesn't exist
          summary: 'Summary',
          acceptance_criteria: ['Criteria'],
        });
      }).toThrow("Parent milestone 'Z.1' not found");
    });

    it('should respect custom options', () => {
      const result = factory.createIssue({
        user,
        title: 'Custom Issue',
        parent_milestone_id: 'A.1',
        summary: 'Custom summary',
        acceptance_criteria: ['Custom criteria'],
        priority: CPriority.LOW,
        estimation: CEstimationSize.XL,
        blocked_by: ['A.1.0'],
        notes: 'Custom notes',
      });

      const { artifact } = result;
      expect(artifact.metadata.priority).toBe(CPriority.LOW);
      expect(artifact.metadata.estimation).toBe(CEstimationSize.XL);
      expect(artifact.metadata.relationships.blocked_by).toEqual(['A.1.0']);
      expect(artifact.notes).toBe('Custom notes');
    });
  });

  describe('actor formatting and git config integration', () => {
    it('should format actor correctly from user info', () => {
      const result = factory.createInitiative({
        user: { name: 'Jane Smith', email: 'jane.smith@company.com' },
        title: 'Test Initiative',
        vision: 'Test vision',
        scope: 'Test scope',
        success_criteria: ['Test criteria'],
      });

      const expectedActor = 'Jane Smith (jane.smith@company.com)';
      expect(result.artifact.metadata.created_by).toBe(expectedActor);
      expect(result.artifact.metadata.assignee).toBe(expectedActor);
      expect(result.artifact.metadata.events[0]?.actor).toBe(expectedActor);
    });

    it('should handle special characters in names', () => {
      const result = factory.createInitiative({
        user: { name: 'José María García-López', email: 'jose@company.es' },
        title: 'Test Initiative',
        vision: 'Test vision',
        scope: 'Test scope',
        success_criteria: ['Test criteria'],
      });

      const expectedActor = 'José María García-López (jose@company.es)';
      expect(result.artifact.metadata.created_by).toBe(expectedActor);
    });

    it('should throw error for invalid email format', () => {
      expect(() => {
        factory.createInitiative({
          user: { name: 'John Doe', email: 'invalid-email' },
          title: 'Test Initiative',
          vision: 'Test vision',
          scope: 'Test scope',
          success_criteria: ['Test criteria'],
        });
      }).toThrow('Invalid email format');
    });
  });

  describe('TypeScript type safety', () => {
    it('should enforce required fields at compile time', () => {
      // This test verifies TypeScript types are working correctly
      const validOptions = {
        user,
        title: 'Test',
        vision: 'Test',
        scope: 'Test',
        success_criteria: ['Test'],
      };

      // Should compile successfully
      const result = factory.createInitiative(validOptions);
      expect(result).toBeDefined();

      // TypeScript would catch missing required fields at compile time
      // so we don't need runtime tests for that
    });

    it('should provide proper type inference', () => {
      const result = factory.createInitiative({
        user,
        title: 'Test Initiative',
        vision: 'Test vision',
        scope: 'Test scope',
        success_criteria: ['Test criteria'],
      });

      // TypeScript should infer the correct types
      expect(typeof result.id).toBe('string');
      expect(result.artifact.content.vision).toBeDefined();
      expect(Array.isArray(result.artifact.content.success_criteria)).toBe(
        true,
      );
    });
  });

  describe('updateContext and getContext', () => {
    it('should update context with new artifacts', () => {
      const initialContext = factory.getContext();
      expect(initialContext.existingIds.size).toBe(0);

      factory.createInitiative({
        user,
        title: 'Test Initiative',
        vision: 'Test vision',
        scope: 'Test scope',
        success_criteria: ['Test criteria'],
      });

      const updatedContext = factory.getContext();
      expect(updatedContext.existingIds.size).toBe(1);
      expect(updatedContext.existingIds.has('A')).toBe(true);
    });

    it('should handle external context updates', () => {
      factory.updateContext(
        new Map([
          ['A', {}],
          ['A.1', {}],
          ['B', {}],
        ]),
      );

      const nextInitiative = factory.createInitiative({
        user,
        title: 'Test Initiative',
        vision: 'Test vision',
        scope: 'Test scope',
        success_criteria: ['Test criteria'],
      });

      expect(nextInitiative.id).toBe('C'); // Should skip A and B
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty blocked_by arrays', () => {
      const result = factory.createInitiative({
        user,
        title: 'Test Initiative',
        vision: 'Test vision',
        scope: 'Test scope',
        success_criteria: ['Test criteria'],
        blocked_by: [],
      });

      expect(result.artifact.metadata.relationships.blocked_by).toEqual([]);
    });

    it('should handle missing optional fields gracefully', () => {
      const result = factory.createInitiative({
        user,
        title: 'Minimal Initiative',
        vision: 'Minimal vision',
        scope: 'Minimal scope',
        success_criteria: ['Minimal criteria'],
      });

      expect(result.artifact.notes).toBeUndefined();
      expect(result.artifact.metadata.relationships.blocked_by).toEqual([]);
    });

    it('should validate event creation integrity', () => {
      const result = factory.createInitiative({
        user,
        title: 'Test Initiative',
        vision: 'Test vision',
        scope: 'Test scope',
        success_criteria: ['Test criteria'],
      });

      const event = result.artifact.metadata.events[0];

      if (!event) {
        throw new Error('Event is undefined');
      }

      // Validate event has all required fields
      expect(event.timestamp).toBeDefined();
      expect(event.event).toBe(CArtifactEvent.DRAFT);
      expect(event.actor).toBeDefined();
      expect(event.trigger).toBeDefined();

      // Validate metadata structure (optional in v2.0)
      // Note: metadata is optional in v2.0 schema and may be undefined
    });
  });
});
