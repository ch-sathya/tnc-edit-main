import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CollaborationSyncService } from '../collaboration-sync-service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      }),
    })),
    removeChannel: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(),
    },
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window events
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
});

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
});

describe('CollaborationSyncService', () => {
  let service: CollaborationSyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    service = new CollaborationSyncService();
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describe('Initialization', () => {
    it('should set up connection monitoring on creation', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should load queued changes from localStorage', () => {
      expect(localStorageMock.getItem).toHaveBeenCalledWith('collaboration_queued_changes');
    });
  });

  describe('Group Subscription', () => {
    it('should subscribe to group updates', async () => {
      const groupId = '550e8400-e29b-41d4-a716-446655440000';
      const callbacks = {
        onFileUpdated: vi.fn(),
        onFileCreated: vi.fn(),
        onFileDeleted: vi.fn(),
      };

      await service.subscribeToGroup(groupId, callbacks);

      expect(supabase.channel).toHaveBeenCalledWith(`collaboration_files_${groupId}`);
    });

    it('should unsubscribe from group updates', async () => {
      const groupId = '550e8400-e29b-41d4-a716-446655440000';
      const callbacks = {
        onFileUpdated: vi.fn(),
      };

      await service.subscribeToGroup(groupId, callbacks);
      await service.unsubscribeFromGroup(groupId);

      expect(supabase.removeChannel).toHaveBeenCalled();
    });
  });

  describe('Change Queue Management', () => {
    it('should queue changes when offline', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440001';
      const change = {
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 5,
        },
        text: 'hello',
        rangeLength: 4,
        userId: '550e8400-e29b-41d4-a716-446655440002',
        timestamp: Date.now(),
        version: 1,
      };

      await service.queueChange(fileId, change);

      const status = service.getQueueStatus();
      expect(status.pending).toBe(1);
    });

    it('should save queued changes to localStorage', async () => {
      const fileId = '550e8400-e29b-41d4-a716-446655440001';
      const change = {
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 5,
        },
        text: 'hello',
        rangeLength: 4,
        userId: '550e8400-e29b-41d4-a716-446655440002',
        timestamp: Date.now(),
        version: 1,
      };

      await service.queueChange(fileId, change);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'collaboration_queued_changes',
        expect.any(String)
      );
    });

    it('should clear the queue', () => {
      service.clearQueue();

      const status = service.getQueueStatus();
      expect(status.pending).toBe(0);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'collaboration_queued_changes',
        '[]'
      );
    });
  });

  describe('Connection Status', () => {
    it('should report correct queue status', () => {
      const status = service.getQueueStatus();

      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('syncInProgress');
      expect(typeof status.pending).toBe('number');
      expect(typeof status.isOnline).toBe('boolean');
      expect(typeof status.syncInProgress).toBe('boolean');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all subscriptions', async () => {
      const groupId1 = '550e8400-e29b-41d4-a716-446655440000';
      const groupId2 = '550e8400-e29b-41d4-a716-446655440001';

      await service.subscribeToGroup(groupId1, {});
      await service.subscribeToGroup(groupId2, {});

      await service.cleanup();

      // Should have called removeChannel for each subscription
      expect(supabase.removeChannel).toHaveBeenCalledTimes(2);
    });
  });
});