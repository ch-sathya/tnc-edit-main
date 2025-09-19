import { useEffect, useState, useCallback } from 'react';
import { socketService } from '../services/socket-service';
import { CollaborationUser, CursorPosition, TextSelection, ConnectionStatus } from '../../server/types';

interface UseSocketReturn {
  // Connection state
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  
  // Connection methods
  connect: () => void;
  disconnect: () => void;
  
  // Collaboration methods
  joinCollaboration: (groupId: string, user: CollaborationUser) => void;
  leaveCollaboration: (groupId: string, userId: string) => void;
  updateCursor: (groupId: string, fileId: string, cursor: CursorPosition) => void;
  updateSelection: (groupId: string, fileId: string, selection: TextSelection) => void;
  startTyping: (groupId: string, fileId: string, userId: string) => void;
  stopTyping: (groupId: string, fileId: string, userId: string) => void;
  switchFile: (groupId: string, fileId: string, userId: string) => void;
  updateActivity: (groupId: string, userId: string) => void;
  
  // Event listeners
  onUserJoined: (callback: (user: CollaborationUser) => void) => () => void;
  onUserLeft: (callback: (userId: string) => void) => () => void;
  onCursorUpdated: (callback: (data: { fileId: string; cursor: CursorPosition }) => void) => () => void;
  onSelectionUpdated: (callback: (data: { fileId: string; selection: TextSelection }) => void) => () => void;
  onUserTyping: (callback: (data: { fileId: string; userId: string; isTyping: boolean }) => void) => () => void;
  onFileSwitched: (callback: (data: { fileId: string; userId: string }) => void) => () => void;
  onUserActivityUpdated: (callback: (data: { userId: string; lastActivity: Date }) => void) => () => void;
}

export const useSocket = (): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    socketService.getConnectionStatus()
  );

  useEffect(() => {
    // Listen for connection status changes
    const handleConnectionStatusChange = (status: ConnectionStatus) => {
      setConnectionStatus(status);
      setIsConnected(status === 'connected');
    };

    socketService.on('connection-status-changed', handleConnectionStatusChange);

    return () => {
      socketService.off('connection-status-changed', handleConnectionStatusChange);
    };
  }, []);

  // Connection methods
  const connect = useCallback(() => {
    socketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
  }, []);

  // Collaboration methods
  const joinCollaboration = useCallback((groupId: string, user: CollaborationUser) => {
    socketService.joinCollaboration(groupId, user);
  }, []);

  const leaveCollaboration = useCallback((groupId: string, userId: string) => {
    socketService.leaveCollaboration(groupId, userId);
  }, []);

  const updateCursor = useCallback((groupId: string, fileId: string, cursor: CursorPosition) => {
    socketService.updateCursor(groupId, fileId, cursor);
  }, []);

  const updateSelection = useCallback((groupId: string, fileId: string, selection: TextSelection) => {
    socketService.updateSelection(groupId, fileId, selection);
  }, []);

  const startTyping = useCallback((groupId: string, fileId: string, userId: string) => {
    socketService.startTyping(groupId, fileId, userId);
  }, []);

  const stopTyping = useCallback((groupId: string, fileId: string, userId: string) => {
    socketService.stopTyping(groupId, fileId, userId);
  }, []);

  const switchFile = useCallback((groupId: string, fileId: string, userId: string) => {
    socketService.switchFile(groupId, fileId, userId);
  }, []);

  const updateActivity = useCallback((groupId: string, userId: string) => {
    socketService.updateActivity(groupId, userId);
  }, []);

  // Event listener methods that return cleanup functions
  const onUserJoined = useCallback((callback: (user: CollaborationUser) => void) => {
    socketService.on('user-joined', callback);
    return () => socketService.off('user-joined', callback);
  }, []);

  const onUserLeft = useCallback((callback: (userId: string) => void) => {
    socketService.on('user-left', callback);
    return () => socketService.off('user-left', callback);
  }, []);

  const onCursorUpdated = useCallback((callback: (data: { fileId: string; cursor: CursorPosition }) => void) => {
    socketService.on('cursor-updated', callback);
    return () => socketService.off('cursor-updated', callback);
  }, []);

  const onSelectionUpdated = useCallback((callback: (data: { fileId: string; selection: TextSelection }) => void) => {
    socketService.on('selection-updated', callback);
    return () => socketService.off('selection-updated', callback);
  }, []);

  const onUserTyping = useCallback((callback: (data: { fileId: string; userId: string; isTyping: boolean }) => void) => {
    socketService.on('user-typing', callback);
    return () => socketService.off('user-typing', callback);
  }, []);

  const onFileSwitched = useCallback((callback: (data: { fileId: string; userId: string }) => void) => {
    socketService.on('file-switched', callback);
    return () => socketService.off('file-switched', callback);
  }, []);

  const onUserActivityUpdated = useCallback((callback: (data: { userId: string; lastActivity: Date }) => void) => {
    socketService.on('user-activity-updated', callback);
    return () => socketService.off('user-activity-updated', callback);
  }, []);

  return {
    // Connection state
    isConnected,
    connectionStatus,
    
    // Connection methods
    connect,
    disconnect,
    
    // Collaboration methods
    joinCollaboration,
    leaveCollaboration,
    updateCursor,
    updateSelection,
    startTyping,
    stopTyping,
    switchFile,
    updateActivity,
    
    // Event listeners
    onUserJoined,
    onUserLeft,
    onCursorUpdated,
    onSelectionUpdated,
    onUserTyping,
    onFileSwitched,
    onUserActivityUpdated,
  };
};