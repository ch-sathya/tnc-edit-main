import { Server, Socket } from 'socket.io';
import { CollaborationUser, CursorPosition, TextSelection } from './types';

interface ClientToServerEvents {
  'join-collaboration': (data: { groupId: string; user: CollaborationUser }) => void;
  'leave-collaboration': (data: { groupId: string; userId: string }) => void;
  'cursor-update': (data: { groupId: string; fileId: string; cursor: CursorPosition }) => void;
  'selection-update': (data: { groupId: string; fileId: string; selection: TextSelection }) => void;
  'typing-start': (data: { groupId: string; fileId: string; userId: string }) => void;
  'typing-stop': (data: { groupId: string; fileId: string; userId: string }) => void;
  'file-switch': (data: { groupId: string; fileId: string; userId: string }) => void;
  'user-activity': (data: { groupId: string; userId: string }) => void;
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
}

type CollaborationSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export class CollaborationSocketServer {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private activeUsers: Map<string, CollaborationUser> = new Map();
  private userSessions: Map<string, { socketId: string; groupId: string }> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map(); // fileId -> Set of userIds
  private activityTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
  }

  public initialize(): void {
    this.io.on('connection', (socket: CollaborationSocket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Handle user joining collaboration room
      socket.on('join-collaboration', (data) => {
        this.handleJoinCollaboration(socket, data);
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

  private handleJoinCollaboration(
    socket: CollaborationSocket, 
    data: { groupId: string; user: CollaborationUser }
  ): void {
    const { groupId, user } = data;
    const roomName = `collaboration-${groupId}`;

    // Join the room
    socket.join(roomName);

    // Store user session
    this.userSessions.set(user.id, { socketId: socket.id, groupId });
    this.activeUsers.set(user.id, { ...user, status: 'online', lastActivity: new Date() });

    // Notify other users in the room
    socket.to(roomName).emit('user-joined', user);

    // Send current active users to the joining user
    const roomUsers = Array.from(this.activeUsers.values())
      .filter(u => this.userSessions.get(u.id)?.groupId === groupId);
    
    // Send each active user individually to maintain consistency
    roomUsers.forEach(activeUser => {
      if (activeUser.id !== user.id) {
        socket.emit('user-joined', activeUser);
      }
    });

    console.log(`User ${user.name} joined collaboration room ${groupId}`);
  }

  private handleLeaveCollaboration(
    socket: CollaborationSocket, 
    data: { groupId: string; userId: string }
  ): void {
    const { groupId, userId } = data;
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
    data: { groupId: string; fileId: string; cursor: CursorPosition }
  ): void {
    const { groupId, fileId, cursor } = data;
    const roomName = `collaboration-${groupId}`;

    // Update user activity
    this.updateUserActivity(cursor.userId);

    // Broadcast cursor update to other users in the room
    socket.to(roomName).emit('cursor-updated', { fileId, cursor });
  }

  private handleSelectionUpdate(
    socket: CollaborationSocket, 
    data: { groupId: string; fileId: string; selection: TextSelection }
  ): void {
    const { groupId, fileId, selection } = data;
    const roomName = `collaboration-${groupId}`;

    // Update user activity
    this.updateUserActivity(selection.userId);

    // Broadcast selection update to other users in the room
    socket.to(roomName).emit('selection-updated', { fileId, selection });
  }

  private handleTypingStart(
    socket: CollaborationSocket, 
    data: { groupId: string; fileId: string; userId: string }
  ): void {
    const { groupId, fileId, userId } = data;
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
    data: { groupId: string; fileId: string; userId: string }
  ): void {
    const { groupId, fileId, userId } = data;
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
    data: { groupId: string; fileId: string; userId: string }
  ): void {
    const { groupId, fileId, userId } = data;
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
    data: { groupId: string; userId: string }
  ): void {
    this.updateUserActivity(data.userId);
  }

  private handleDisconnection(socket: CollaborationSocket): void {
    // Find user by socket ID
    let disconnectedUserId: string | null = null;
    let groupId: string | null = null;

    for (const [userId, session] of this.userSessions.entries()) {
      if (session.socketId === socket.id) {
        disconnectedUserId = userId;
        groupId = session.groupId;
        break;
      }
    }

    if (disconnectedUserId && groupId) {
      this.handleLeaveCollaboration(socket, { groupId, userId: disconnectedUserId });
    }

    console.log(`Socket disconnected: ${socket.id}`);
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