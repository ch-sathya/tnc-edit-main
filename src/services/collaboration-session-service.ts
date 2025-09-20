import { supabase } from '@/integrations/supabase/client';
import { socketService } from './socket-service';
import { CollaborationUser } from '@/types/collaboration';

export interface SessionPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  isOwner: boolean;
}

export interface CollaborationSession {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: Date;
  lastActivity: Date;
  permissions: SessionPermissions;
  user: CollaborationUser;
}

export interface SessionJoinResult {
  success: boolean;
  session?: CollaborationSession;
  error?: string;
  permissions?: SessionPermissions;
}

export interface SessionLeaveResult {
  success: boolean;
  error?: string;
}

export class CollaborationSessionService {
  private activeSessions: Map<string, CollaborationSession> = new Map();
  private sessionCleanupInterval: NodeJS.Timeout | null = null;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.startSessionCleanup();
  }

  /**
   * Join a collaboration session with authentication and permission checking
   */
  async joinSession(groupId: string, user: CollaborationUser): Promise<SessionJoinResult> {
    try {
      // Verify user authentication
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Check if user has access to the group
      const permissions = await this.checkUserPermissions(groupId, authUser.id);
      if (!permissions.canRead) {
        return {
          success: false,
          error: 'Insufficient permissions to access this collaboration room'
        };
      }

      // Create session record in database
      const sessionData = {
        group_id: groupId,
        user_id: authUser.id,
        joined_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        status: 'online'
      };

      const { data: sessionRecord, error: sessionError } = await supabase
        .from('collaboration_sessions')
        .upsert(sessionData, {
          onConflict: 'group_id,user_id'
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Failed to create session record:', sessionError);
        return {
          success: false,
          error: 'Failed to join collaboration session'
        };
      }

      // Create session object
      const session: CollaborationSession = {
        id: sessionRecord.id,
        groupId,
        userId: authUser.id,
        joinedAt: new Date(sessionRecord.joined_at),
        lastActivity: new Date(sessionRecord.last_activity),
        permissions,
        user: {
          ...user,
          id: authUser.id,
          status: 'online',
          lastActivity: new Date()
        }
      };

      // Store session locally
      this.activeSessions.set(this.getSessionKey(groupId, authUser.id), session);

      // Join Socket.IO room
      socketService.joinCollaboration(groupId, session.user);

      // Update user activity
      this.updateUserActivity(groupId, authUser.id);

      return {
        success: true,
        session,
        permissions
      };

    } catch (error) {
      console.error('Error joining collaboration session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Leave a collaboration session with cleanup
   */
  async leaveSession(groupId: string, userId: string): Promise<SessionLeaveResult> {
    try {
      const sessionKey = this.getSessionKey(groupId, userId);
      const session = this.activeSessions.get(sessionKey);

      if (!session) {
        return {
          success: false,
          error: 'Session not found'
        };
      }

      // Remove from Socket.IO room
      socketService.leaveCollaboration(groupId, userId);

      // Update session status in database
      const { error: updateError } = await supabase
        .from('collaboration_sessions')
        .update({
          status: 'offline',
          last_activity: new Date().toISOString()
        })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to update session status:', updateError);
      }

      // Remove from local storage
      this.activeSessions.delete(sessionKey);

      return {
        success: true
      };

    } catch (error) {
      console.error('Error leaving collaboration session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check user permissions for a collaboration group
   */
  async checkUserPermissions(groupId: string, userId: string): Promise<SessionPermissions> {
    try {
      // Check if user is a member of the community group
      const { data: membership, error: membershipError } = await supabase
        .from('community_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (membershipError || !membership) {
        // User is not a member - no permissions
        return {
          canRead: false,
          canWrite: false,
          canDelete: false,
          canManageUsers: false,
          isOwner: false
        };
      }

      // Check if user is the group owner
      const { data: group, error: groupError } = await supabase
        .from('community_groups')
        .select('created_by')
        .eq('id', groupId)
        .single();

      const isOwner = !groupError && group?.created_by === userId;
      const isAdmin = membership.role === 'admin';
      const isModerator = membership.role === 'moderator';

      return {
        canRead: true, // All members can read
        canWrite: true, // All members can write
        canDelete: isOwner || isAdmin, // Only owners and admins can delete
        canManageUsers: isOwner || isAdmin || isModerator, // Owners, admins, and moderators can manage users
        isOwner
      };

    } catch (error) {
      console.error('Error checking user permissions:', error);
      return {
        canRead: false,
        canWrite: false,
        canDelete: false,
        canManageUsers: false,
        isOwner: false
      };
    }
  }

  /**
   * Update user activity timestamp
   */
  async updateUserActivity(groupId: string, userId: string): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(groupId, userId);
      const session = this.activeSessions.get(sessionKey);

      if (session) {
        session.lastActivity = new Date();
        session.user.lastActivity = new Date();
      }

      // Update in database
      await supabase
        .from('collaboration_sessions')
        .update({
          last_activity: new Date().toISOString(),
          status: 'online'
        })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      // Notify other users via Socket.IO
      socketService.updateActivity(groupId, userId);

    } catch (error) {
      console.error('Error updating user activity:', error);
    }
  }

  /**
   * Get active users in a collaboration session
   */
  async getActiveUsers(groupId: string): Promise<CollaborationUser[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('collaboration_sessions')
        .select(`
          user_id,
          status,
          last_activity,
          current_file_id,
          auth.users (
            id,
            email,
            user_metadata
          )
        `)
        .eq('group_id', groupId)
        .eq('status', 'online')
        .gte('last_activity', new Date(Date.now() - this.SESSION_TIMEOUT).toISOString());

      if (error) {
        console.error('Error fetching active users:', error);
        return [];
      }

      return sessions.map((session: any) => ({
        id: session.user_id,
        name: session.users?.user_metadata?.full_name || 
              session.users?.email?.split('@')[0] || 
              'Anonymous',
        email: session.users?.email,
        avatar: session.users?.user_metadata?.avatar_url,
        status: session.status as 'online' | 'away' | 'offline',
        currentFile: session.current_file_id,
        lastActivity: new Date(session.last_activity),
        cursorColor: this.generateUserColor(session.user_id)
      }));

    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
    }
  }

  /**
   * Get session information for a user
   */
  getSession(groupId: string, userId: string): CollaborationSession | null {
    const sessionKey = this.getSessionKey(groupId, userId);
    return this.activeSessions.get(sessionKey) || null;
  }

  /**
   * Check if user has an active session
   */
  hasActiveSession(groupId: string, userId: string): boolean {
    const sessionKey = this.getSessionKey(groupId, userId);
    return this.activeSessions.has(sessionKey);
  }

  /**
   * Clean up inactive sessions
   */
  private async cleanupInactiveSessions(): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - this.SESSION_TIMEOUT);

      // Clean up local sessions
      for (const [key, session] of this.activeSessions.entries()) {
        if (session.lastActivity < cutoffTime) {
          await this.leaveSession(session.groupId, session.userId);
        }
      }

      // Clean up database sessions
      await supabase
        .from('collaboration_sessions')
        .update({ status: 'offline' })
        .lt('last_activity', cutoffTime.toISOString());

    } catch (error) {
      console.error('Error cleaning up inactive sessions:', error);
    }
  }

  /**
   * Start periodic session cleanup
   */
  private startSessionCleanup(): void {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }

    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Stop session cleanup
   */
  public stopSessionCleanup(): void {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
      this.sessionCleanupInterval = null;
    }
  }

  /**
   * Generate session key
   */
  private getSessionKey(groupId: string, userId: string): string {
    return `${groupId}:${userId}`;
  }

  /**
   * Generate user color based on user ID
   */
  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Cleanup all sessions and resources
   */
  public cleanup(): void {
    this.stopSessionCleanup();
    
    // Leave all active sessions
    for (const [key, session] of this.activeSessions.entries()) {
      this.leaveSession(session.groupId, session.userId);
    }
    
    this.activeSessions.clear();
  }
}

// Singleton instance
export const collaborationSessionService = new CollaborationSessionService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    collaborationSessionService.cleanup();
  });
}