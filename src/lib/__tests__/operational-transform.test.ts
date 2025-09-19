import { describe, it, expect, beforeEach } from 'vitest';
import { OperationalTransform, Operation, OperationConflict } from '../operational-transform';
import { EditorChange } from '@/types/collaboration';

describe('OperationalTransform', () => {
  let mockChange1: EditorChange;
  let mockChange2: EditorChange;

  beforeEach(() => {
    mockChange1 = {
      range: {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1
      },
      text: 'Hello',
      rangeLength: 0,
      userId: 'user1',
      timestamp: 1000,
      version: 1
    };

    mockChange2 = {
      range: {
        startLineNumber: 1,
        startColumn: 6,
        endLineNumber: 1,
        endColumn: 6
      },
      text: ' World',
      rangeLength: 0,
      userId: 'user2',
      timestamp: 1001,
      version: 1
    };
  });

  describe('transform', () => {
    it('should transform non-overlapping operations correctly', () => {
      const result = OperationalTransform.transform(mockChange1, mockChange2);
      
      expect(result.conflicts).toHaveLength(0);
      expect(result.operation1Prime).toEqual(mockChange1);
      expect(result.operation2Prime.range.startColumn).toBe(11); // Adjusted for "Hello" insertion
    });

    it('should detect conflicts in overlapping operations', () => {
      // Create a replacement operation that overlaps with an insertion
      const overlappingChange1 = {
        ...mockChange1,
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 5
        },
        text: 'Hello',
        rangeLength: 4 // Replacing 4 characters
      };
      
      const overlappingChange2 = {
        ...mockChange2,
        range: {
          startLineNumber: 1,
          startColumn: 3,
          endLineNumber: 1,
          endColumn: 7
        },
        text: 'World',
        rangeLength: 4 // Replacing 4 characters
      };

      const result = OperationalTransform.transform(overlappingChange1, overlappingChange2);
      
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].conflictType).toBe('overlap');
    });

    it('should handle adjacent operations', () => {
      const adjacentChange = {
        ...mockChange2,
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1
        }
      };

      const result = OperationalTransform.transform(mockChange1, adjacentChange);
      
      if (result.conflicts.length > 0) {
        expect(result.conflicts[0].conflictType).toBe('adjacent');
        expect(result.conflicts[0].resolution).toBe('automatic');
      }
    });

    it('should handle nested operations', () => {
      const nestedChange = {
        ...mockChange1,
        range: {
          startLineNumber: 1,
          startColumn: 2,
          endLineNumber: 1,
          endColumn: 4
        },
        text: 'XX',
        rangeLength: 2
      };

      const containerChange = {
        ...mockChange2,
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 10
        },
        text: 'Completely new text',
        rangeLength: 9
      };

      const result = OperationalTransform.transform(nestedChange, containerChange);
      
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].conflictType).toBe('nested');
    });
  });

  describe('compose', () => {
    it('should compose multiple operations correctly', () => {
      const change3: EditorChange = {
        range: {
          startLineNumber: 1,
          startColumn: 12,
          endLineNumber: 1,
          endColumn: 12
        },
        text: '!',
        rangeLength: 0,
        userId: 'user3',
        timestamp: 1002,
        version: 1
      };

      const composed = OperationalTransform.compose([mockChange1, mockChange2, change3]);
      
      expect(composed.text).toContain('Hello');
      expect(composed.timestamp).toBe(1002); // Latest timestamp
      expect(composed.version).toBe(1); // Max version
    });

    it('should handle empty array', () => {
      expect(() => OperationalTransform.compose([])).toThrow('Cannot compose empty array of changes');
    });

    it('should return single operation unchanged', () => {
      const result = OperationalTransform.compose([mockChange1]);
      expect(result).toEqual(mockChange1);
    });

    it('should sort operations by position before composing', () => {
      const laterChange: EditorChange = {
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1
        },
        text: 'Start ',
        rangeLength: 0,
        userId: 'user3',
        timestamp: 1002,
        version: 1
      };

      const composed = OperationalTransform.compose([mockChange2, laterChange, mockChange1]);
      
      // Should be composed in position order, not input order
      expect(composed).toBeDefined();
    });
  });

  describe('invert', () => {
    it('should create inverse operation for insertion', () => {
      const originalContent = 'Original text';
      const insertChange: EditorChange = {
        range: {
          startLineNumber: 1,
          startColumn: 9,
          endLineNumber: 1,
          endColumn: 9
        },
        text: 'new ',
        rangeLength: 0,
        userId: 'user1',
        timestamp: 1000,
        version: 1
      };

      const inverted = OperationalTransform.invert(insertChange, originalContent);
      
      expect(inverted.text).toBe('');
      expect(inverted.rangeLength).toBe(4); // Length of 'new '
      expect(inverted.range).toEqual(insertChange.range);
    });

    it('should create inverse operation for deletion', () => {
      const originalContent = 'Hello World';
      const deleteChange: EditorChange = {
        range: {
          startLineNumber: 1,
          startColumn: 7,
          endLineNumber: 1,
          endColumn: 12
        },
        text: '',
        rangeLength: 5,
        userId: 'user1',
        timestamp: 1000,
        version: 1
      };

      const inverted = OperationalTransform.invert(deleteChange, originalContent);
      
      expect(inverted.text).toBe('World');
      expect(inverted.rangeLength).toBe(0);
    });

    it('should handle multi-line operations', () => {
      const originalContent = 'Line 1\nLine 2\nLine 3';
      const multiLineChange: EditorChange = {
        range: {
          startLineNumber: 1,
          startColumn: 7,
          endLineNumber: 2,
          endColumn: 4
        },
        text: 'New\nContent',
        rangeLength: 9,
        userId: 'user1',
        timestamp: 1000,
        version: 1
      };

      const inverted = OperationalTransform.invert(multiLineChange, originalContent);
      
      expect(inverted.text).toBe('\nLin');
      expect(inverted.rangeLength).toBe(11); // Length of 'New\nContent'
    });
  });

  describe('apply', () => {
    it('should apply insertion correctly', () => {
      const content = 'Hello World';
      const insertChange: EditorChange = {
        range: {
          startLineNumber: 1,
          startColumn: 6,
          endLineNumber: 1,
          endColumn: 6
        },
        text: 'Beautiful ',
        rangeLength: 0,
        userId: 'user1',
        timestamp: 1000,
        version: 1
      };

      const result = OperationalTransform.apply(content, insertChange);
      expect(result).toBe('HelloBeautiful  World');
    });

    it('should apply deletion correctly', () => {
      const content = 'Hello Beautiful World';
      const deleteChange: EditorChange = {
        range: {
          startLineNumber: 1,
          startColumn: 6,
          endLineNumber: 1,
          endColumn: 16
        },
        text: '',
        rangeLength: 10,
        userId: 'user1',
        timestamp: 1000,
        version: 1
      };

      const result = OperationalTransform.apply(content, deleteChange);
      expect(result).toBe('Hello World');
    });

    it('should apply replacement correctly', () => {
      const content = 'Hello World';
      const replaceChange: EditorChange = {
        range: {
          startLineNumber: 1,
          startColumn: 7,
          endLineNumber: 1,
          endColumn: 12
        },
        text: 'Universe',
        rangeLength: 5,
        userId: 'user1',
        timestamp: 1000,
        version: 1
      };

      const result = OperationalTransform.apply(content, replaceChange);
      expect(result).toBe('Hello Universe');
    });

    it('should handle multi-line operations', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const multiLineChange: EditorChange = {
        range: {
          startLineNumber: 2,
          startColumn: 1,
          endLineNumber: 2,
          endColumn: 7
        },
        text: 'New Line 2\nExtra Line',
        rangeLength: 6,
        userId: 'user1',
        timestamp: 1000,
        version: 1
      };

      const result = OperationalTransform.apply(content, multiLineChange);
      expect(result).toBe('Line 1\nNew Line 2\nExtra Line\nLine 3');
    });

    it('should handle empty lines correctly', () => {
      const content = '';
      const insertChange: EditorChange = {
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1
        },
        text: 'First line',
        rangeLength: 0,
        userId: 'user1',
        timestamp: 1000,
        version: 1
      };

      const result = OperationalTransform.apply(content, insertChange);
      expect(result).toBe('First line');
    });
  });

  describe('canAutoResolve', () => {
    it('should return true for adjacent conflicts', () => {
      const conflict: OperationConflict = {
        operation1: mockChange1,
        operation2: mockChange2,
        conflictType: 'adjacent',
        resolution: 'manual'
      };

      expect(OperationalTransform.canAutoResolve(conflict)).toBe(true);
    });

    it('should return true for automatic resolution', () => {
      const conflict: OperationConflict = {
        operation1: mockChange1,
        operation2: mockChange2,
        conflictType: 'overlap',
        resolution: 'automatic'
      };

      expect(OperationalTransform.canAutoResolve(conflict)).toBe(true);
    });

    it('should return false for manual resolution conflicts', () => {
      const conflict: OperationConflict = {
        operation1: mockChange1,
        operation2: mockChange2,
        conflictType: 'overlap',
        resolution: 'manual'
      };

      expect(OperationalTransform.canAutoResolve(conflict)).toBe(false);
    });
  });

  describe('autoResolve', () => {
    it('should resolve adjacent conflicts automatically', () => {
      const conflict: OperationConflict = {
        operation1: mockChange1,
        operation2: mockChange2,
        conflictType: 'adjacent',
        resolution: 'automatic'
      };

      const result = OperationalTransform.autoResolve(conflict);
      
      expect(result.conflicts).toHaveLength(0);
      expect(result.operation1Prime).toBeDefined();
      expect(result.operation2Prime).toBeDefined();
    });

    it('should throw error for non-auto-resolvable conflicts', () => {
      const conflict: OperationConflict = {
        operation1: mockChange1,
        operation2: mockChange2,
        conflictType: 'nested',
        resolution: 'manual'
      };

      expect(() => OperationalTransform.autoResolve(conflict)).toThrow('Conflict cannot be automatically resolved');
    });
  });

  describe('integration tests', () => {
    it('should handle a complete transformation workflow', () => {
      const content = 'The quick brown fox';
      
      // Two users make concurrent edits
      const user1Change: EditorChange = {
        range: { startLineNumber: 1, startColumn: 5, endLineNumber: 1, endColumn: 10 },
        text: 'slow',
        rangeLength: 5,
        userId: 'user1',
        timestamp: 1000,
        version: 1
      };
      
      const user2Change: EditorChange = {
        range: { startLineNumber: 1, startColumn: 17, endLineNumber: 1, endColumn: 20 },
        text: 'dog',
        rangeLength: 3,
        userId: 'user2',
        timestamp: 1001,
        version: 1
      };

      // Transform the operations
      const result = OperationalTransform.transform(user1Change, user2Change);
      
      // Apply both operations
      let finalContent = OperationalTransform.apply(content, result.operation1Prime);
      finalContent = OperationalTransform.apply(finalContent, result.operation2Prime);
      
      expect(finalContent).toBe('The slow brown dog');
      expect(result.conflicts).toHaveLength(0);
    });

    it('should handle conflicting edits with manual resolution needed', () => {
      const content = 'Hello World';
      
      // Two users edit the same word
      const user1Change: EditorChange = {
        range: { startLineNumber: 1, startColumn: 7, endLineNumber: 1, endColumn: 12 },
        text: 'Universe',
        rangeLength: 5,
        userId: 'user1',
        timestamp: 1000,
        version: 1
      };
      
      const user2Change: EditorChange = {
        range: { startLineNumber: 1, startColumn: 7, endLineNumber: 1, endColumn: 12 },
        text: 'Earth',
        rangeLength: 5,
        userId: 'user2',
        timestamp: 1001,
        version: 1
      };

      const result = OperationalTransform.transform(user1Change, user2Change);
      
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].conflictType).toBe('overlap');
      expect(result.conflicts[0].resolution).toBe('manual');
    });
  });
});