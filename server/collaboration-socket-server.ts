import { Server, Socket } from 'socket.io';
import { SupabaseClient } from '@supabase/supabase-js';

interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  status: 'online' | 'away' | 'offline';
  currentFile?: string;
  lastActivity: Date;
}

interface CursorPosition {
  line: number;
  column: number;
  userId: string;
  userName: string;
  color: string;
  timestamp: number;
}

interface TextSelection {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  userId: string;
  userName: string;
  color: string;
}

interface ClientToServerEvents {
  'join-collaboration': (data: { groupId: string }) => void;
  'leave-collaboration': (data: { groupId: string }) => void;
  'cursor-update': (data: { groupId: string; fileId: string; cursor: Omit<CursorPosition, 'userId'> }) => void;
  'selection-update': (data: { groupId: string; fileId: string; selection: Omit<TextSelection, 'userId'> }) => void;
  'typing-start': (data: { groupId: string; fileId: string }) => void;
  'typing-stop': (data: { groupId: string; fileId: string }) => void;
  'file-switch': (data: { groupId: string; fileId: string }) => void;
  'user-activity': (data: { groupId: string }) => void;
}

interface ServerToClientEvents {
  'user-joined': (user: CollaborationUser) => void;
  'user-left': (userId: string) => void;
  'cursor-updated': (data: { fileId: string; cursor: CursorPosition }) => void;
  'selection-updated': (data: { fileId: string; selection: TextSelection }) => void;
  'user-typing': (data: { fileId: string; userId: string; isTyping: boolean }) => void;
  'file-switched': (data: { fileId: string; userId: string }) => void;
  'connection-status': (status: 'connected' | 'disconnected') => void;
  'user-activity-updated': (data: { userId: string; lastActivity: Date }) => void;
  'auth-error': (message: string) => void;
}

interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  data: {
    user: { id: string; email?: string };
    userId: string;
  };
}

type CollaborationSocket = AuthenticatedSocket;

export class CollaborationSocketServer {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private supabase: SupabaseClient;
  private activeUsers: Map<string, CollaborationUser> = new Map();
  private userSessions: Map<string, { socketId: string; groupId: string }> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map(); // fileId -> Set of userIds
  private activityTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>, supabase: SupabaseClient) {
    this.io = io;
    this.supabase = supabase;
  }

  public initialize(): void {
    this.io.on('connection', (socket: CollaborationSocket) => {
      const userId = socket.data.userId;
      console.log(`Authenticated socket connected: ${socket.id} (User: ${userId})`);

      // Handle user joining collaboration room
      socket.on('join-collaboration', async (data) => {
        await this.handleJoinCollaboration(socket, data);
      });

      // Handle user leaving collaboration room
      socket.on('leave-collaboration', (data) => {
        this.handleLeaveCollaboration(socket, data);
      });

      // Handle cursor position updates
      socket.on('cursor-update', (data) => {
        this.handleCursorUpdate(socket, data);
      });

      // Handle text selection updates
      socket.on('selection-update', (data) => {
        this.handleSelectionUpdate(socket, data);
      });

      // Handle typing indicators
      socket.on('typing-start', (data) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('typing-stop', (data) => {
        this.handleTypingStop(socket, data);
      });

      // Handle file switching
      socket.on('file-switch', (data) => {
        this.handleFileSwitch(socket, data);
      });

      // Handle user activity updates
      socket.on('user-activity', (data) => {
        this.handleUserActivity(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

      // Send connection confirmation
      socket.emit('connection-status', 'connected');
    });
  }

  private async handleJoinCollaboration(
    socket: CollaborationSocket, 
    data: { groupId: string }
  ): Promise<void> {
    const { groupId } = data;
    const userId = socket.data.userId;
    const roomName = `collaboration-${groupId}`;

    // Verify user is a participant in this room
    const { data: participant, error } = await this.supabase
      .from('room_participants')
      .select('role')
      .eq('room_id', groupId)
      .eq('user_id', userId)
      .single();

    if (error || !participant) {
      console.log(`User ${userId} denied access to room ${groupId}: not a participant`);
      socket.emit('auth-error', 'You are not a participant of this room');
      return;
    }

    // Fetch user profile for display name
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('display_name, username, avatar_url')
      .eq('user_id', userId)
      .single();

    const userName = profile?.display_name || profile?.username || socket.data.user.email || 'Anonymous';

    // Create the user object from verified server-side data
    const user: CollaborationUser = {
      id: userId,
      name: userName,
      color: this.generateUserColor(userId),
      status: 'online',
      lastActivity: new Date()
    };

    // Join the room
    socket.join(roomName);

    // Store user session
    this.userSessions.set(userId, { socketId: socket.id, groupId });
    this.activeUsers.set(userId, user);

    // Notify other users in the room
    socket.to(roomName).emit('user-joined', user);

    // Send current active users to the joining user
    const roomUsers = Array.from(this.activeUsers.values())
      .filter(u => this.userSessions.get(u.id)?.groupId === groupId);
    
    // Send each active user individually to maintain consistency
    roomUsers.forEach(activeUser => {
      if (activeUser.id !== userId) {
        socket.emit('user-joined', activeUser);
      }
    });

    console.log(`User ${userName} (${userId}) joined collaboration room ${groupId} with role: ${participant.role}`);
  }

  private handleLeaveCollaboration(
    socket: CollaborationSocket, 
    data: { groupId: string }
  ): void {
    const { groupId } = data;
    const userId = socket.data.userId;
    const roomName = `collaboration-${groupId}`;

    // Remove user from active users and sessions
    this.activeUsers.delete(userId);
    this.userSessions.delete(userId);

    // Clear any activity timers
    const timer = this.activityTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.activityTimers.delete(userId);
    }

    // Remove from typing indicators
    this.typingUsers.forEach((users, fileId) => {
      if (users.has(userId)) {
        users.delete(userId);
        socket.to(roomName).emit('user-typing', { fileId, userId, isTyping: false });
      }
    });

    // Leave the room and notify others
    socket.leave(roomName);
    socket.to(roomName).emit('user-left', userId);

    console.log(`User ${userId} left collaboration room ${groupId}`);
  }

  private handleCursorUpdate(
    socket: CollaborationSocket, 
    data: { groupId: string; fileId: string; cursor: Omit<CursorPosition, 'userId'> }
  ): void {
    const { groupId, fileId, cursor } = data;
    const userId = socket.data.userId;
    const roomName = `collaboration-${groupId}`;

    // Update user activity
    this.updateUserActivity(userId);

    // Build cursor with verified userId
    const verifiedCursor: CursorPosition = {
      ...cursor,
      userId
    };

    // Broadcast cursor update to other users in the room
    socket.to(roomName).emit('cursor-updated', { fileId, cursor: verifiedCursor });
  }

  private handleSelectionUpdate(
    socket: CollaborationSocket, 
    data: { groupId: string; fileId: string; selection: Omit<TextSelection, 'userId'> }
  ): void {
    const { groupId, fileId, selection } = data;
    const userId = socket.data.userId;
    const roomName = `collaboration-${groupId}`;

    // Update user activity
    this.updateUserActivity(userId);

    // Build selection with verified userId
    const verifiedSelection: TextSelection = {
      ...selection,
      userId
    };

    // Broadcast selection update to other users in the room
    socket.to(roomName).emit('selection-updated', { fileId, selection: verifiedSelection });
  }

  private handleTypingStart(
    socket: CollaborationSocket, 
    data: { groupId: string; fileId: string }
  ): void {
    const { groupId, fileId } = data;
    const userId = socket.data.userId;
    const roomName = `collaboration-${groupId}`;

    // Add user to typing set for this file
    if (!this.typingUsers.has(fileId)) {
      this.typingUsers.set(fileId, new Set());
    }
    this.typingUsers.get(fileId)!.add(userId);

    // Update user activity
    this.updateUserActivity(userId);

    // Broadcast typing indicator
    socket.to(roomName).emit('user-typing', { fileId, userId, isTyping: true });
  }

  private handleTypingStop(
    socket: CollaborationSocket, 
    data: { groupId: string; fileId: string }
  ): void {
    const { groupId, fileId } = data;
    const userId = socket.data.userId;
    const roomName = `collaboration-${groupId}`;

    // Remove user from typing set
    const typingSet = this.typingUsers.get(fileId);
    if (typingSet) {
      typingSet.delete(userId);
      if (typingSet.size === 0) {
        this.typingUsers.delete(fileId);
      }
    }

    // Broadcast typing stop
    socket.to(roomName).emit('user-typing', { fileId, userId, isTyping: false });
  }

  private handleFileSwitch(
    socket: CollaborationSocket, 
    data: { groupId: string; fileId: string }
  ): void {
    const { groupId, fileId } = data;
    const userId = socket.data.userId;
    const roomName = `collaboration-${groupId}`;

    // Update user's current file
    const user = this.activeUsers.get(userId);
    if (user) {
      user.currentFile = fileId;
      this.activeUsers.set(userId, user);
    }

    // Update user activity
    this.updateUserActivity(userId);

    // Broadcast file switch to other users
    socket.to(roomName).emit('file-switched', { fileId, userId });
  }

  private handleUserActivity(
    socket: CollaborationSocket, 
    data: { groupId: string }
  ): void {
    const userId = socket.data.userId;
    this.updateUserActivity(userId);
  }

  private handleDisconnection(socket: CollaborationSocket): void {
    const userId = socket.data.userId;
    const session = this.userSessions.get(userId);

    if (session) {
      this.handleLeaveCollaboration(socket, { groupId: session.groupId });
    }

    console.log(`Socket disconnected: ${socket.id} (User: ${userId})`);
  }

  private updateUserActivity(userId: string): void {
    const user = this.activeUsers.get(userId);
    if (user) {
      user.lastActivity = new Date();
      user.status = 'online';
      this.activeUsers.set(userId, user);

      // Clear existing timer
      const existingTimer = this.activityTimers.get(userId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer for idle detection (5 minutes)
      const timer = setTimeout(() => {
        const currentUser = this.activeUsers.get(userId);
        if (currentUser) {
          currentUser.status = 'away';
          this.activeUsers.set(userId, currentUser);

          // Notify users in the same group
          const session = this.userSessions.get(userId);
          if (session) {
            const roomName = `collaboration-${session.groupId}`;
            this.io.to(roomName).emit('user-activity-updated', {
              userId,
              lastActivity: currentUser.lastActivity
            });
          }
        }
        this.activityTimers.delete(userId);
      }, 5 * 60 * 1000); // 5 minutes

      this.activityTimers.set(userId, timer);
    }
  }

  private generateUserColor(userId: string): string {
    // Generate a consistent color based on user ID
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  // Public methods for external access if needed
  public getActiveUsers(groupId: string): CollaborationUser[] {
    return Array.from(this.activeUsers.values())
      .filter(user => this.userSessions.get(user.id)?.groupId === groupId);
  }

  public getUserCount(groupId: string): number {
    return this.getActiveUsers(groupId).length;
  }

  public isUserOnline(userId: string): boolean {
    return this.activeUsers.has(userId);
  }
}
