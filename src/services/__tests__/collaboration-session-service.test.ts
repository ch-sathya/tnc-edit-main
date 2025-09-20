import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CollaborationSessionService } from '../collaboration-session-service';
import { supabase } from '@/integrations/supabase/client';
import { socketService } from '../socket-service';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn()
        }))
      }))
    }))
  }
}));

vi.mock('../socket-service', () => ({
  socketService: {
    joinCollaboration: vi.fn(),
    leaveCollaboration: vi.fn(),
    updateActivity: vi.fn()
  }
}));

describe('CollaborationSessionService', () => {
  let service: CollaborationSessionService;
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User'
    }
  };

  const mockCollaborationUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    status: 'online' as const,
    lastActivity: new Date(),
    cursorColor: '#FF6B6B'
  };

  beforeEach(() => {
    service = new CollaborationSessionService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('joinSession', () => {
    it('should successfully join a session with valid authentication', async () => {
      // Mock successful authentication
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock successful group membership check
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'community_group_members') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { role: 'member' },
                    error: null
                  })
                }))
              }))
            }))
          };
        }
        if (table === 'community_groups') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { created_by: 'other-user' },
                  error: null
                })
              }))
            }))
          };
        }
        if (table === 'collaboration_sessions') {
          return {
            upsert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'session-123',
                    group_id: 'group-123',
                    user_id: 'user-123',
                    joined_at: new Date().toISOString(),
                    last_activity: new Date().toISOString()
                  },
                  error: null
                })
              }))
            }))
          };
        }
        return {};
      });

      const result = await service.joinSession('group-123', mockCollaborationUser);

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.permissions).toBeDefined();
      expect(result.permissions?.canRead).toBe(true);
      expect(result.permissions?.canWrite).toBe(true);
      expect(socketService.joinCollaboration).toHaveBeenCalledWith('group-123', expect.any(Object));
    });

    it('should fail when user is not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      const result = await service.joinSession('group-123', mockCollaborationUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });

    it('should fail when user has no permissions', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock no group membership
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'community_group_members') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Not found')
                  })
                }))
              }))
            }))
          };
        }
        return {};
      });

      const result = await service.joinSession('group-123', mockCollaborationUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to access this collaboration room');
    });
  });

  describe('leaveSession', () => {
    it('should successfully leave a session', async () => {
      // First join a session
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'community_group_members') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { role: 'member' },
                    error: null
                  })
                }))
              }))
            }))
          };
        }
        if (table === 'community_groups') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { created_by: 'other-user' },
                  error: null
                })
              }))
            }))
          };
        }
        if (table === 'collaboration_sessions') {
          return {
            upsert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'session-123',
                    group_id: 'group-123',
                    user_id: 'user-123',
                    joined_at: new Date().toISOString(),
                    last_activity: new Date().toISOString()
                  },
                  error: null
                })
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  error: null
                })
              }))
            }))
          };
        }
        return {};
      });

      await service.joinSession('group-123', mockCollaborationUser);
      const result = await service.leaveSession('group-123', 'user-123');

      expect(result.success).toBe(true);
      expect(socketService.leaveCollaboration).toHaveBeenCalledWith('group-123', 'user-123');
    });

    it('should fail when session is not found', async () => {
      const result = await service.leaveSession('group-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });

  describe('checkUserPermissions', () => {
    it('should return correct permissions for group owner', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'community_group_members') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { role: 'member' },
                    error: null
                  })
                }))
              }))
            }))
          };
        }
        if (table === 'community_groups') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { created_by: 'user-123' },
                  error: null
                })
              }))
            }))
          };
        }
        return {};
      });

      const permissions = await service.checkUserPermissions('group-123', 'user-123');

      expect(permissions.canRead).toBe(true);
      expect(permissions.canWrite).toBe(true);
      expect(permissions.canDelete).toBe(true);
      expect(permissions.canManageUsers).toBe(true);
      expect(permissions.isOwner).toBe(true);
    });

    it('should return no permissions for non-member', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'community_group_members') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Not found')
                  })
                }))
              }))
            }))
          };
        }
        return {};
      });

      const permissions = await service.checkUserPermissions('group-123', 'user-123');

      expect(permissions.canRead).toBe(false);
      expect(permissions.canWrite).toBe(false);
      expect(permissions.canDelete).toBe(false);
      expect(permissions.canManageUsers).toBe(false);
      expect(permissions.isOwner).toBe(false);
    });
  });

  describe('updateUserActivity', () => {
    it('should update user activity', async () => {
      // Mock session exists
      (supabase.from as any).mockImplementation(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              error: null
            })
          }))
        }))
      }));

      await service.updateUserActivity('group-123', 'user-123');

      expect(socketService.updateActivity).toHaveBeenCalledWith('group-123', 'user-123');
    });
  });
});