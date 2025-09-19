import { useState, useCallback, useRef, useEffect } from 'react';
import { CursorPosition, TextSelection } from '@/types/collaboration';
import { socketService } from '@/services/socket-service';

interface UseCursorManagerProps {
  groupId: string;
  fileId: string;
  userId: string;
  userName: string;
  userColor: string;
}

interface CursorManagerState {
  cursors: CursorPosition[];
  selections: TextSelection[];
  typingUsers: Set<string>;
}

export const useCursorManager = ({
  groupId,
  fileId,
  userId,
  userName,
  userColor
}: UseCursorManagerProps) => {
  const [state, setState] = useState<CursorManagerState>({
    cursors: [],
    selections: [],
    typingUsers: new Set()
  });

  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastCursorUpdateRef = useRef<number>(0);
  const lastSelectionUpdateRef = useRef<number>(0);

  // Throttle cursor updates to avoid overwhelming the socket
  const CURSOR_UPDATE_THROTTLE = 50; // 50ms
  const SELECTION_UPDATE_THROTTLE = 100; // 100ms
  const TYPING_TIMEOUT = 2000; // 2 seconds

  // Handle cursor updates from other users
  const handleCursorUpdated = useCallback((data: { fileId: string; cursor: CursorPosition }) => {
    if (data.fileId !== fileId || data.cursor.userId === userId) return;

    setState(prev => ({
      ...prev,
      cursors: [
        ...prev.cursors.filter(c => c.userId !== data.cursor.userId),
        data.cursor
      ]
    }));
  }, [fileId, userId]);

  // Handle selection updates from other users
  const handleSelectionUpdated = useCallback((data: { fileId: string; selection: TextSelection }) => {
    if (data.fileId !== fileId || data.selection.userId === userId) return;

    setState(prev => ({
      ...prev,
      selections: [
        ...prev.selections.filter(s => s.userId !== data.selection.userId),
        data.selection
      ]
    }));
  }, [fileId, userId]);

  // Handle typing indicators
  const handleUserTyping = useCallback((data: { fileId: string; userId: string; isTyping: boolean }) => {
    if (data.fileId !== fileId || data.userId === userId) return;

    setState(prev => {
      const newTypingUsers = new Set(prev.typingUsers);
      
      if (data.isTyping) {
        newTypingUsers.add(data.userId);
        
        // Clear existing timeout for this user
        const existingTimeout = typingTimeoutRef.current.get(data.userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        
        // Set new timeout to remove typing indicator
        const timeout = setTimeout(() => {
          setState(current => ({
            ...current,
            typingUsers: new Set([...current.typingUsers].filter(id => id !== data.userId))
          }));
          typingTimeoutRef.current.delete(data.userId);
        }, TYPING_TIMEOUT);
        
        typingTimeoutRef.current.set(data.userId, timeout);
      } else {
        newTypingUsers.delete(data.userId);
        
        // Clear timeout if exists
        const existingTimeout = typingTimeoutRef.current.get(data.userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          typingTimeoutRef.current.delete(data.userId);
        }
      }
      
      return {
        ...prev,
        typingUsers: newTypingUsers
      };
    });
  }, [fileId, userId]);

  // Handle user leaving
  const handleUserLeft = useCallback((leftUserId: string) => {
    setState(prev => ({
      cursors: prev.cursors.filter(c => c.userId !== leftUserId),
      selections: prev.selections.filter(s => s.userId !== leftUserId),
      typingUsers: new Set([...prev.typingUsers].filter(id => id !== leftUserId))
    }));

    // Clear any typing timeout for the user who left
    const timeout = typingTimeoutRef.current.get(leftUserId);
    if (timeout) {
      clearTimeout(timeout);
      typingTimeoutRef.current.delete(leftUserId);
    }
  }, []);

  // Broadcast cursor position (throttled)
  const updateCursor = useCallback((cursor: CursorPosition) => {
    const now = Date.now();
    if (now - lastCursorUpdateRef.current < CURSOR_UPDATE_THROTTLE) {
      return;
    }
    
    lastCursorUpdateRef.current = now;
    socketService.updateCursor(groupId, fileId, cursor);
  }, [groupId, fileId]);

  // Broadcast selection (throttled)
  const updateSelection = useCallback((selection: TextSelection) => {
    const now = Date.now();
    if (now - lastSelectionUpdateRef.current < SELECTION_UPDATE_THROTTLE) {
      return;
    }
    
    lastSelectionUpdateRef.current = now;
    socketService.updateSelection(groupId, fileId, selection);
  }, [groupId, fileId]);

  // Start typing indicator
  const startTyping = useCallback(() => {
    socketService.startTyping(groupId, fileId, userId);
  }, [groupId, fileId, userId]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    socketService.stopTyping(groupId, fileId, userId);
  }, [groupId, fileId, userId]);

  // Get typing users with their names
  const getTypingUsers = useCallback(() => {
    return Array.from(state.typingUsers).map(typingUserId => {
      const cursor = state.cursors.find(c => c.userId === typingUserId);
      return {
        userId: typingUserId,
        userName: cursor?.userName || 'Unknown User'
      };
    });
  }, [state.typingUsers, state.cursors]);

  // Set up socket event listeners
  useEffect(() => {
    socketService.on('cursor-updated', handleCursorUpdated);
    socketService.on('selection-updated', handleSelectionUpdated);
    socketService.on('user-typing', handleUserTyping);
    socketService.on('user-left', handleUserLeft);

    return () => {
      socketService.off('cursor-updated', handleCursorUpdated);
      socketService.off('selection-updated', handleSelectionUpdated);
      socketService.off('user-typing', handleUserTyping);
      socketService.off('user-left', handleUserLeft);
    };
  }, [handleCursorUpdated, handleSelectionUpdated, handleUserTyping, handleUserLeft]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, []);

  return {
    cursors: state.cursors,
    selections: state.selections,
    typingUsers: getTypingUsers(),
    updateCursor,
    updateSelection,
    startTyping,
    stopTyping
  };
};

export default useCursorManager;