import { io, Socket } from 'socket.io-client';
import { 
  CollaborationUser, 
  CursorPosition, 
  TextSelection
} from '@/types/collaboration';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

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

type CollaborationSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export class SocketService {
  private socket: CollaborationSocket | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Event listeners
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? process.env.VITE_SOCKET_URL || 'ws://localhost:3001'
      : 'ws://localhost:3001';

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket.IO connected');
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.emit('connection-status-changed', 'connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      this.connectionStatus = 'disconnected';
      this.emit('connection-status-changed', 'disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.connectionStatus = 'disconnected';
      this.handleReconnection();
    });

    // Collaboration events
    this.socket.on('user-joined', (user) => {
      this.emit('user-joined', user);
    });

    this.socket.on('user-left', (userId) => {
      this.emit('user-left', userId);
    });

    this.socket.on('cursor-updated', (data) => {
      this.emit('cursor-updated', data);
    });

    this.socket.on('selection-updated', (data) => {
      this.emit('selection-updated', data);
    });

    this.socket.on('user-typing', (data) => {
      this.emit('user-typing', data);
    });

    this.socket.on('file-switched', (data) => {
      this.emit('file-switched', data);
    });

    this.socket.on('connection-status', (status) => {
      this.connectionStatus = status === 'connected' ? 'connected' : 'disconnected';
      this.emit('connection-status-changed', status);
    });

    this.socket.on('user-activity-updated', (data) => {
      this.emit('user-activity-updated', data);
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.connectionStatus = 'reconnecting';
      this.emit('connection-status-changed', 'reconnecting');
      
      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
    }
  }

  // Public methods
  public connect(): void {
    if (this.socket && !this.socket.connected) {
      this.connectionStatus = 'connecting';
      this.emit('connection-status-changed', 'connecting');
      this.socket.connect();
    }
  }

  public disconnect(): void {
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
  }

  public joinCollaboration(groupId: string, user: CollaborationUser): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join-collaboration', { groupId, user });
    }
  }

  public leaveCollaboration(groupId: string, userId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave-collaboration', { groupId, userId });
    }
  }

  public updateCursor(groupId: string, fileId: string, cursor: CursorPosition): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('cursor-update', { groupId, fileId, cursor });
    }
  }

  public updateSelection(groupId: string, fileId: string, selection: TextSelection): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('selection-update', { groupId, fileId, selection });
    }
  }

  public startTyping(groupId: string, fileId: string, userId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing-start', { groupId, fileId, userId });
    }
  }

  public stopTyping(groupId: string, fileId: string, userId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing-stop', { groupId, fileId, userId });
    }
  }

  public switchFile(groupId: string, fileId: string, userId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('file-switch', { groupId, fileId, userId });
    }
  }

  public updateActivity(groupId: string, userId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('user-activity', { groupId, userId });
    }
  }

  // Event listener management
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Getters
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getSocket(): CollaborationSocket | null {
    return this.socket;
  }
}

// Singleton instance
export const socketService = new SocketService();