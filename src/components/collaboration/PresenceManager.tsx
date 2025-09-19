import React, { useEffect, useCallback, useRef } from 'react';
import { CollaborationUser } from '@/types/collaboration';

interface PresenceManagerProps {
  users: CollaborationUser[];
  currentUser: CollaborationUser;
  onUserActivity?: (userId: string) => void;
  onStatusChange?: (userId: string, status: CollaborationUser['status']) => void;
  className?: string;
}

interface UserActivityTracker {
  lastActivity: number;
  idleTimeout?: NodeJS.Timeout;
  awayTimeout?: NodeJS.Timeout;
}

export const PresenceManager: React.FC<PresenceManagerProps> = ({
  users,
  currentUser,
  onUserActivity,
  onStatusChange,
  className = ''
}) => {
  const activityTrackersRef = useRef<Map<string, UserActivityTracker>>(new Map());
  const mouseActivityRef = useRef<number>(0);
  const keyboardActivityRef = useRef<number>(0);
  
  // Activity detection timeouts
  const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  const AWAY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  // Track user activity and update status
  const updateUserActivity = useCallback((userId: string) => {
    const now = Date.now();
    const tracker = activityTrackersRef.current.get(userId) || { lastActivity: now };
    
    // Clear existing timeouts
    if (tracker.idleTimeout) {
      clearTimeout(tracker.idleTimeout);
    }
    if (tracker.awayTimeout) {
      clearTimeout(tracker.awayTimeout);
    }

    // Update activity timestamp
    tracker.lastActivity = now;

    // Set user to online if they were idle/away
    const user = users.find(u => u.id === userId);
    if (user && user.status !== 'online') {
      onStatusChange?.(userId, 'online');
    }

    // Set idle timeout
    tracker.idleTimeout = setTimeout(() => {
      onStatusChange?.(userId, 'away');
    }, IDLE_TIMEOUT);

    // Set away timeout
    tracker.awayTimeout = setTimeout(() => {
      onStatusChange?.(userId, 'offline');
    }, AWAY_TIMEOUT);

    activityTrackersRef.current.set(userId, tracker);
    onUserActivity?.(userId);
  }, [users, onUserActivity, onStatusChange]);

  // Handle mouse activity
  const handleMouseActivity = useCallback(() => {
    const now = Date.now();
    // Throttle mouse activity updates to every 1 second
    if (now - mouseActivityRef.current > 1000) {
      mouseActivityRef.current = now;
      updateUserActivity(currentUser.id);
    }
  }, [currentUser.id, updateUserActivity]);

  // Handle keyboard activity
  const handleKeyboardActivity = useCallback(() => {
    const now = Date.now();
    // Throttle keyboard activity updates to every 500ms
    if (now - keyboardActivityRef.current > 500) {
      keyboardActivityRef.current = now;
      updateUserActivity(currentUser.id);
    }
  }, [currentUser.id, updateUserActivity]);

  // Handle visibility change (tab focus/blur)
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // User switched away from tab - mark as away after delay
      setTimeout(() => {
        if (document.hidden) {
          onStatusChange?.(currentUser.id, 'away');
        }
      }, IDLE_TIMEOUT);
    } else {
      // User returned to tab - mark as online
      updateUserActivity(currentUser.id);
    }
  }, [currentUser.id, updateUserActivity, onStatusChange]);

  // Handle window focus/blur
  const handleWindowFocus = useCallback(() => {
    updateUserActivity(currentUser.id);
  }, [currentUser.id, updateUserActivity]);

  const handleWindowBlur = useCallback(() => {
    // Mark as away after a delay when window loses focus
    setTimeout(() => {
      onStatusChange?.(currentUser.id, 'away');
    }, IDLE_TIMEOUT);
  }, [currentUser.id, onStatusChange]);

  // Initialize activity tracking for current user
  useEffect(() => {
    updateUserActivity(currentUser.id);
  }, [currentUser.id, updateUserActivity]);

  // Set up activity event listeners
  useEffect(() => {
    // Mouse and keyboard activity
    document.addEventListener('mousemove', handleMouseActivity, { passive: true });
    document.addEventListener('mousedown', handleMouseActivity, { passive: true });
    document.addEventListener('keydown', handleKeyboardActivity, { passive: true });
    document.addEventListener('keypress', handleKeyboardActivity, { passive: true });
    document.addEventListener('scroll', handleMouseActivity, { passive: true });

    // Visibility and focus events
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('mousemove', handleMouseActivity);
      document.removeEventListener('mousedown', handleMouseActivity);
      document.removeEventListener('keydown', handleKeyboardActivity);
      document.removeEventListener('keypress', handleKeyboardActivity);
      document.removeEventListener('scroll', handleMouseActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [
    handleMouseActivity,
    handleKeyboardActivity,
    handleVisibilityChange,
    handleWindowFocus,
    handleWindowBlur
  ]);

  // Cleanup activity trackers when users leave
  useEffect(() => {
    const currentUserIds = new Set(users.map(u => u.id));
    
    // Clean up trackers for users who are no longer present
    activityTrackersRef.current.forEach((tracker, userId) => {
      if (!currentUserIds.has(userId)) {
        if (tracker.idleTimeout) clearTimeout(tracker.idleTimeout);
        if (tracker.awayTimeout) clearTimeout(tracker.awayTimeout);
        activityTrackersRef.current.delete(userId);
      }
    });
  }, [users]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activityTrackersRef.current.forEach(tracker => {
        if (tracker.idleTimeout) clearTimeout(tracker.idleTimeout);
        if (tracker.awayTimeout) clearTimeout(tracker.awayTimeout);
      });
      activityTrackersRef.current.clear();
    };
  }, []);

  // This component doesn't render anything - it just manages presence tracking
  return null;
};

export default PresenceManager;