import { io, Socket } from 'socket.io-client';
import { supabase } from '@/integrations/supabase/client';
import { 
  CollaborationUser, 
  CursorPosition, 
  TextSelection
} from '@/types/collaboration';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'auth_error';

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
  'rate-limited': (message: string) => void;
}

type CollaborationSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export class SocketService {
  private socket: CollaborationSocket | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private currentUserId: string | null = null;

  // Event listeners
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor() {
    // Socket will be initialized when connect() is called with auth
  }

  private async initializeSocket(): Promise<boolean> {
    // Get the current session token
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.access_token) {
      console.error('Cannot initialize socket: No authenticated session');
      this.connectionStatus = 'auth_error';
      this.emit('connection-status-changed', 'auth_error');
      return false;
    }

    this.currentUserId = session.user.id;

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
      timeout: 20000,
      auth: {
        token: session.access_token
      }
    });

    this.setupEventHandlers();
    return true;
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket.IO connected (authenticated)');
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.emit('connection-status-changed', 'connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      this.connectionStatus = 'disconnected';
      this.emit('connection-status-changed', 'disconnected');
    });

    this.socket.on('connect_error', async (error) => {
      console.error('Socket.IO connection error:', error.message);
      
      // Check if it's an auth error
      if (error.message.includes('Authentication') || error.message.includes('Invalid')) {
        this.connectionStatus = 'auth_error';
        this.emit('connection-status-changed', 'auth_error');
        
        // Try to refresh the token and reconnect
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token && this.socket) {
          this.socket.auth = { token: session.access_token };
          this.handleReconnection();
        }
      } else {
        this.connectionStatus = 'disconnected';
        this.handleReconnection();
      }
    });

    // Authentication error from server
    this.socket.on('auth-error', (message) => {
      console.error('Socket auth error:', message);
      this.emit('auth-error', message);
    });

    // Rate limiting notification from server
    this.socket.on('rate-limited', (message) => {
      console.warn('Socket rate limited:', message);
      this.emit('rate-limited', message);
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
  public async connect(): Promise<void> {
    // Initialize socket with auth if not already done
    if (!this.socket) {
      const initialized = await this.initializeSocket();
      if (!initialized) {
        return;
      }
    }

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
      // Only send groupId - server will use authenticated userId
      this.socket.emit('join-collaboration', { groupId });
    }
  }

  public leaveCollaboration(groupId: string, userId: string): void {
    if (this.socket && this.socket.connected) {
      // Only send groupId - server will use authenticated userId
      this.socket.emit('leave-collaboration', { groupId });
    }
  }

  public updateCursor(groupId: string, fileId: string, cursor: CursorPosition): void {
    if (this.socket && this.socket.connected) {
      // Don't send userId - server will use authenticated userId
      const { userId, ...cursorWithoutUserId } = cursor;
      this.socket.emit('cursor-update', { groupId, fileId, cursor: cursorWithoutUserId });
    }
  }

  public updateSelection(groupId: string, fileId: string, selection: TextSelection): void {
    if (this.socket && this.socket.connected) {
      // Don't send userId - server will use authenticated userId
      const { userId, ...selectionWithoutUserId } = selection;
      this.socket.emit('selection-update', { groupId, fileId, selection: selectionWithoutUserId });
    }
  }

  public startTyping(groupId: string, fileId: string, userId: string): void {
    if (this.socket && this.socket.connected) {
      // Don't send userId - server will use authenticated userId
      this.socket.emit('typing-start', { groupId, fileId });
    }
  }

  public stopTyping(groupId: string, fileId: string, userId: string): void {
    if (this.socket && this.socket.connected) {
      // Don't send userId - server will use authenticated userId
      this.socket.emit('typing-stop', { groupId, fileId });
    }
  }

  public switchFile(groupId: string, fileId: string, userId: string): void {
    if (this.socket && this.socket.connected) {
      // Don't send userId - server will use authenticated userId
      this.socket.emit('file-switch', { groupId, fileId });
    }
  }

  public updateActivity(groupId: string, userId: string): void {
    if (this.socket && this.socket.connected) {
      // Don't send userId - server will use authenticated userId
      this.socket.emit('user-activity', { groupId });
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

  public getCurrentUserId(): string | null {
    return this.currentUserId;
  }
}

// Singleton instance
export const socketService = new SocketService();
