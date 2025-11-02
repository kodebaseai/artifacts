import { describe, expect, it } from 'vitest';

describe('artifact type detection logic', () => {
  function determineTypeFromParentId(
    parentId?: string,
  ): 'initiative' | 'milestone' | 'issue' {
    if (!parentId) {
      return 'initiative';
    }

    const dotCount = (parentId.match(/\./g) || []).length;

    if (dotCount === 0) {
      return 'milestone';
    } else if (dotCount === 1) {
      return 'issue';
    } else {
      throw new Error(`Invalid parent ID format: ${parentId}`);
    }
  }

  it('should identify initiative when no parent ID is provided', () => {
    const type = determineTypeFromParentId(undefined);
    expect(type).toBe('initiative');
  });

  it('should identify milestone when initiative ID is provided', () => {
    const type = determineTypeFromParentId('A');
    expect(type).toBe('milestone');
  });

  it('should identify issue when milestone ID is provided', () => {
    const type = determineTypeFromParentId('A.1');
    expect(type).toBe('issue');
  });

  it('should throw error for invalid parent ID format', () => {
    expect(() => determineTypeFromParentId('A.1.2')).toThrow(
      'Invalid parent ID format: A.1.2',
    );
  });
});

describe('basic draft content creation', () => {
  function createBasicDraft(
    type: 'initiative' | 'milestone' | 'issue',
    idea: string,
  ) {
    switch (type) {
      case 'initiative':
        return {
          vision: `Vision for: ${idea}`,
          scope: `Scope to be defined for: ${idea}`,
          success_criteria: [`Success criteria for: ${idea}`],
        };
      case 'milestone':
        return {
          summary: `Summary for: ${idea}`,
          deliverables: [`Deliverables for: ${idea}`],
          validation: [`Validation criteria for: ${idea}`],
        };
      case 'issue':
        return {
          summary: `Summary for: ${idea}`,
          acceptance_criteria: [`Acceptance criteria for: ${idea}`],
        };
    }
  }

  it('should create initiative content', () => {
    const content = createBasicDraft('initiative', 'Build a new feature');
    expect(content).toEqual({
      vision: 'Vision for: Build a new feature',
      scope: 'Scope to be defined for: Build a new feature',
      success_criteria: ['Success criteria for: Build a new feature'],
    });
  });

  it('should create milestone content', () => {
    const content = createBasicDraft('milestone', 'Add API endpoints');
    expect(content).toEqual({
      summary: 'Summary for: Add API endpoints',
      deliverables: ['Deliverables for: Add API endpoints'],
      validation: ['Validation criteria for: Add API endpoints'],
    });
  });

  it('should create issue content', () => {
    const content = createBasicDraft('issue', 'Fix login bug');
    expect(content).toEqual({
      summary: 'Summary for: Fix login bug',
      acceptance_criteria: ['Acceptance criteria for: Fix login bug'],
    });
  });
});
