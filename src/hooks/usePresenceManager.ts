import { useState, useCallback, useEffect, useRef } from 'react';
import { CollaborationUser } from '@/types/collaboration';
import { socketService } from '@/services/socket-service';

interface UsePresenceManagerProps {
  groupId: string;
  currentUser: CollaborationUser;
}

interface PresenceState {
  activeUsers: CollaborationUser[];
  isConnected: boolean;
}

export const usePresenceManager = ({
  groupId,
  currentUser
}: UsePresenceManagerProps) => {
  const [state, setState] = useState<PresenceState>({
    activeUsers: [],
    isConnected: false
  });

  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());
  
  // Heartbeat interval for keeping presence alive
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds
  const ACTIVITY_THROTTLE = 5000; // 5 seconds

  // Handle user joining the collaboration
  const handleUserJoined = useCallback((user: CollaborationUser) => {
    setState(prev => ({
      ...prev,
      activeUsers: [
        ...prev.activeUsers.filter(u => u.id !== user.id),
        user
      ]
    }));
  }, []);

  // Handle user leaving the collaboration
  const handleUserLeft = useCallback((userId: string) => {
    setState(prev => ({
      ...prev,
      activeUsers: prev.activeUsers.filter(u => u.id !== userId)
    }));
  }, []);

  // Handle connection status changes
  const handleConnectionStatusChanged = useCallback((status: string) => {
    setState(prev => ({
      ...prev,
      isConnected: status === 'connected'
    }));
  }, []);

  // Handle user activity updates
  const handleUserActivityUpdated = useCallback((data: { userId: string; lastActivity: Date }) => {
    setState(prev => ({
      ...prev,
      activeUsers: prev.activeUsers.map(user =>
        user.id === data.userId
          ? { ...user, lastActivity: data.lastActivity, status: 'online' as const }
          : user
      )
    }));
  }, []);

  // Join collaboration session
  const joinSession = useCallback(async () => {
    if (!socketService.isConnected()) {
      socketService.connect();
    }

    // Wait for connection
    const waitForConnection = () => {
      return new Promise<void>((resolve) => {
        if (socketService.isConnected()) {
          resolve();
          return;
        }

        const checkConnection = () => {
          if (socketService.isConnected()) {
            resolve();
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    };

    await waitForConnection();
    
    // Join the collaboration room
    socketService.joinCollaboration(groupId, currentUser);

    // Start heartbeat to maintain presence
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketService.isConnected()) {
        socketService.updateActivity(groupId, currentUser.id);
      }
    }, HEARTBEAT_INTERVAL);
  }, [groupId, currentUser]);

  // Leave collaboration session
  const leaveSession = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }

    if (socketService.isConnected()) {
      socketService.leaveCollaboration(groupId, currentUser.id);
    }

    setState(prev => ({
      ...prev,
      activeUsers: prev.activeUsers.filter(u => u.id !== currentUser.id)
    }));
  }, [groupId, currentUser.id]);

  // Update user activity (throttled)
  const updateActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current < ACTIVITY_THROTTLE) {
      return;
    }

    lastActivityRef.current = now;
    
    if (socketService.isConnected()) {
      socketService.updateActivity(groupId, currentUser.id);
    }

    // Update current user's last activity in local state
    setState(prev => ({
      ...prev,
      activeUsers: prev.activeUsers.map(user =>
        user.id === currentUser.id
          ? { ...user, lastActivity: new Date(), status: 'online' as const }
          : user
      )
    }));
  }, [groupId, currentUser.id]);

  // Update user status
  const updateUserStatus = useCallback((userId: string, status: CollaborationUser['status']) => {
    setState(prev => ({
      ...prev,
      activeUsers: prev.activeUsers.map(user =>
        user.id === userId
          ? { ...user, status, lastActivity: new Date() }
          : user
      )
    }));

    // If it's the current user, broadcast the status change
    if (userId === currentUser.id && socketService.isConnected()) {
      const updatedUser = { ...currentUser, status, lastActivity: new Date() };
      socketService.joinCollaboration(groupId, updatedUser);
    }
  }, [currentUser, groupId]);

  // Update current file for user
  const updateCurrentFile = useCallback((fileId: string) => {
    setState(prev => ({
      ...prev,
      activeUsers: prev.activeUsers.map(user =>
        user.id === currentUser.id
          ? { ...user, currentFile: fileId }
          : user
      )
    }));

    if (socketService.isConnected()) {
      socketService.switchFile(groupId, fileId, currentUser.id);
    }
  }, [groupId, currentUser.id]);

  // Get users by status
  const getUsersByStatus = useCallback((status: CollaborationUser['status']) => {
    return state.activeUsers.filter(user => user.status === status);
  }, [state.activeUsers]);

  // Get user count
  const getUserCount = useCallback(() => {
    return state.activeUsers.length;
  }, [state.activeUsers]);

  // Get online user count
  const getOnlineUserCount = useCallback(() => {
    return state.activeUsers.filter(user => user.status === 'online').length;
  }, [state.activeUsers]);

  // Set up socket event listeners
  useEffect(() => {
    socketService.on('user-joined', handleUserJoined);
    socketService.on('user-left', handleUserLeft);
    socketService.on('connection-status-changed', handleConnectionStatusChanged);
    socketService.on('user-activity-updated', handleUserActivityUpdated);

    return () => {
      socketService.off('user-joined', handleUserJoined);
      socketService.off('user-left', handleUserLeft);
      socketService.off('connection-status-changed', handleConnectionStatusChanged);
      socketService.off('user-activity-updated', handleUserActivityUpdated);
    };
  }, [
    handleUserJoined,
    handleUserLeft,
    handleConnectionStatusChanged,
    handleUserActivityUpdated
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveSession();
    };
  }, [leaveSession]);

  return {
    activeUsers: state.activeUsers,
    isConnected: state.isConnected,
    joinSession,
    leaveSession,
    updateActivity,
    updateUserStatus,
    updateCurrentFile,
    getUsersByStatus,
    getUserCount,
    getOnlineUserCount
  };
};

export default usePresenceManager;