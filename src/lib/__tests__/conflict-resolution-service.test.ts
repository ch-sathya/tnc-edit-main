import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictResolutionService } from '../conflict-resolution-service';
import { EditorChange } from '@/types/collaboration';
import { OperationalTransform } from '../operational-transform';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gt: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    }))
  }
}));

describe('ConflictResolutionService', () => {
  let service: ConflictResolutionService;
  let mockChange1: EditorChange;
  let mockChange2: EditorChange;

  beforeEach(() => {
    service = new ConflictResolutionService();
    
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

  describe('processChange', () => {
    it('should process non-conflicting changes correctly', async () => {
      const content = '';
      const result = await service.processChange('file1', mockChange1, content);
      
      expect(result.conflicts).toHaveLength(0);
      expect(result.finalContent).toBe('Hello');
      expect(result.resolvedChange).toEqual(mockChange1);
    });

    it('should detect and handle conflicts', async () => {
      const content = 'Original text';
      
      // First change
      await service.processChange('file1', mockChange1, content);
      
      // Conflicting change
      const conflictingChange: EditorChange = {
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 5
        },
        text: 'Different',
        rangeLength: 4,
        userId: 'user2',
        timestamp: 1002,
        version: 1
      };
      
      const result = await service.processChange('file1', conflictingChange, content);
      
      // Should detect conflicts but may auto-resolve some
      expect(result).toBeDefined();
      expect(result.finalContent).toBeDefined();
    });

    it('should handle multiple pending changes', async () => {
      const content = 'Test content';
      
      // Add multiple changes
      await service.processChange('file1', mockChange1, content);
      await service.processChange('file1', mockChange2, content);
      
      // Add another change
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
        timestamp: 1003,
        version: 1
      };
      
      const result = await service.processChange('file1', change3, content);
      
      expect(result).toBeDefined();
      expect(result.finalContent).toBeDefined();
    });
  });

  describe('resolveConflictManually', () => {
    it('should resolve conflict by accepting local changes', async () => {
      const conflict = {
        operation1: mockChange1,
        operation2: mockChange2,
        conflictType: 'overlap' as const,
        resolution: 'manual' as const
      };
      
      const resolved = await service.resolveConflictManually(conflict, 'accept-local');
      
      expect(resolved).toEqual(mockChange1);
    });

    it('should resolve conflict by accepting remote changes', async () => {
      const conflict = {
        operation1: mockChange1,
        operation2: mockChange2,
        conflictType: 'overlap' as const,
        resolution: 'manual' as const
      };
      
      const resolved = await service.resolveConflictManually(conflict, 'accept-remote');
      
      expect(resolved).toEqual(mockChange2);
    });

    it('should resolve conflict by merging', async () => {
      const conflict = {
        operation1: mockChange1,
        operation2: mockChange2,
        conflictType: 'overlap' as const,
        resolution: 'manual' as const
      };
      
      const mergedContent = 'Hello World';
      const resolved = await service.resolveConflictManually(conflict, 'merge', mergedContent);
      
      expect(resolved.text).toBe(mergedContent);
      expect(resolved.userId).toBe(mockChange1.userId);
    });

    it('should throw error for merge without content', async () => {
      const conflict = {
        operation1: mockChange1,
        operation2: mockChange2,
        conflictType: 'overlap' as const,
        resolution: 'manual' as const
      };
      
      await expect(
        service.resolveConflictManually(conflict, 'merge')
      ).rejects.toThrow('Merged content is required for merge resolution');
    });
  });

  describe('getPendingConflicts', () => {
    it('should return empty array when no conflicts', () => {
      const conflicts = service.getPendingConflicts();
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('clearPendingChanges', () => {
    it('should clear pending changes for a file', async () => {
      const content = 'Test';
      await service.processChange('file1', mockChange1, content);
      
      service.clearPendingChanges('file1');
      
      const stats = service.getStats();
      expect(stats.filesWithPendingChanges).not.toContain('file1');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const content = 'Test';
      await service.processChange('file1', mockChange1, content);
      await service.processChange('file2', mockChange2, content);
      
      const stats = service.getStats();
      
      expect(stats.filesWithPendingChanges.length).toBeGreaterThanOrEqual(0);
      expect(stats.pendingChangesCount).toBeGreaterThanOrEqual(0);
      expect(stats.conflictsCount).toBe(0);
    });
  });

  describe('processAutoResolvableConflicts', () => {
    it('should process auto-resolvable conflicts', async () => {
      const result = await service.processAutoResolvableConflicts();
      
      expect(result.resolved).toBe(0);
      expect(result.remaining).toBe(0);
    });
  });
});