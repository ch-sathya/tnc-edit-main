import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { socketService } from '@/services/socket-service';
import { collaborationSessionService, SessionPermissions } from '@/services/collaboration-session-service';
import { collaborationFileService } from '@/lib/collaboration-file-service';
import { supabase } from '@/integrations/supabase/client';
import {
  CollaborationFile,
  CollaborationUser,
  CursorPosition,
  TextSelection
} from '@/types/collaboration';

// Import collaboration components
import CollaborativeMonacoEditor from './CollaborativeMonacoEditor';
import { CollaborationFileExplorer } from './CollaborationFileExplorer';
import ActiveUsersList from './ActiveUsersList';
import PresenceManager from './PresenceManager';
import SocketConnectionStatus from './SocketConnectionStatus';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from '@/components/ui/resizable';

// Icons
import { 
  Users, 
  FileText, 
  Settings, 
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';

interface CollaborativeEditorProps {
  groupId: string;
  initialFileId?: string;
  onFileChange?: (file: CollaborationFile) => void;
  onUserJoin?: (user: CollaborationUser) => void;
  onUserLeave?: (userId: string) => void;
  className?: string;
}

interface CollaborativeEditorState {
  currentFile: CollaborationFile | null;
  activeUsers: CollaborationUser[];
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  pendingChanges: any[];
  isLoading: boolean;
  error: string | null;
  sessionJoined: boolean;
  permissions: SessionPermissions | null;
}

// Generate user colors
const generateUserColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  groupId,
  initialFileId,
  onFileChange,
  onUserJoin,
  onUserLeave,
  className = ''
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Refs
  const sessionJoinedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // State
  const [state, setState] = useState<CollaborativeEditorState>({
    currentFile: null,
    activeUsers: [],
    isConnected: false,
    connectionStatus: 'disconnected',
    pendingChanges: [],
    isLoading: true,
    error: null,
    sessionJoined: false,
    permissions: null
  });

  // Current user object
  const currentUser: CollaborationUser | null = user ? {
    id: user.id,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
    email: user.email,
    avatar: user.user_metadata?.avatar_url,
    status: 'online',
    currentFile: state.currentFile?.id,
    lastActivity: new Date(),
    cursorColor: generateUserColor(user.id)
  } : null;

  // Initialize collaboration session
  const initializeSession = useCallback(async () => {
    if (!user || !currentUser || sessionJoinedRef.current) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Join collaboration session with authentication and permission checking
      const joinResult = await collaborationSessionService.joinSession(groupId, currentUser);
      
      if (!joinResult.success) {
        throw new Error(joinResult.error || 'Failed to join session');
      }

      sessionJoinedRef.current = true;

      // Connect to Socket.IO
      socketService.connect();
      
      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
        
        const checkConnection = () => {
          if (socketService.isConnected()) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        
        checkConnection();
      });

      // Load active users
      const activeUsers = await collaborationSessionService.getActiveUsers(groupId);

      // Load initial file if specified
      if (initialFileId) {
        await loadFile(initialFileId);
      } else {
        // Load first available file
        const files = await collaborationFileService.getFilesByGroup(groupId);
        if (files.length > 0) {
          await loadFile(files[0].id);
        }
      }

      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        sessionJoined: true,
        connectionStatus: 'connected',
        isConnected: true,
        permissions: joinResult.permissions || null,
        activeUsers: activeUsers.filter(u => u.id !== currentUser.id)
      }));

      toast({
        title: "Connected",
        description: "Successfully joined collaboration session",
        variant: "default"
      });

    } catch (error) {
      console.error('Failed to initialize collaboration session:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to initialize session'
      }));
      
      toast({
        title: "Connection Failed",
        description: "Failed to join collaboration session",
        variant: "destructive"
      });
    }
  }, [user, currentUser, groupId, initialFileId]);

  // Cleanup session
  const cleanupSession = useCallback(async () => {
    if (sessionJoinedRef.current && user) {
      // Leave collaboration session with proper cleanup
      await collaborationSessionService.leaveSession(groupId, user.id);
      sessionJoinedRef.current = false;
    }
    
    socketService.disconnect();
    
    setState(prev => ({
      ...prev,
      sessionJoined: false,
      isConnected: false,
      connectionStatus: 'disconnected',
      activeUsers: [],
      permissions: null
    }));
  }, [groupId, user]);

  // Load file
  const loadFile = useCallback(async (fileId: string) => {
    try {
      const file = await collaborationFileService.getFile(fileId);
      if (file) {
        setState(prev => ({ ...prev, currentFile: file }));
        
        // Notify socket about file switch
        if (currentUser && socketService.isConnected()) {
          socketService.switchFile(groupId, fileId, currentUser.id);
        }
        
        onFileChange?.(file);
      }
    } catch (error) {
      console.error('Failed to load file:', error);
      toast({
        title: "File Load Error",
        description: "Failed to load the selected file",
        variant: "destructive"
      });
    }
  }, [groupId, currentUser, onFileChange, toast]);

  // Handle file selection from explorer
  const handleFileSelect = useCallback((file: CollaborationFile) => {
    loadFile(file.id);
  }, [loadFile]);

  // Handle file content changes
  const handleFileContentChange = useCallback((content: string) => {
    if (state.currentFile) {
      setState(prev => ({
        ...prev,
        currentFile: prev.currentFile ? {
          ...prev.currentFile,
          content,
          updatedAt: new Date()
        } : null
      }));
    }
  }, [state.currentFile]);

  // Handle user activity
  const handleUserActivity = useCallback(async (userId: string) => {
    await collaborationSessionService.updateUserActivity(groupId, userId);
  }, [groupId]);

  // Handle user status changes
  const handleUserStatusChange = useCallback((userId: string, status: CollaborationUser['status']) => {
    setState(prev => ({
      ...prev,
      activeUsers: prev.activeUsers.map(user => 
        user.id === userId ? { ...user, status, lastActivity: new Date() } : user
      )
    }));
  }, []);

  // Setup socket event listeners
  useEffect(() => {
    if (!currentUser) return;

    // Connection status
    const handleConnectionStatusChange = (status: string) => {
      setState(prev => ({
        ...prev,
        isConnected: status === 'connected',
        connectionStatus: status as any
      }));
    };

    // User joined
    const handleUserJoined = (user: CollaborationUser) => {
      setState(prev => ({
        ...prev,
        activeUsers: [...prev.activeUsers.filter(u => u.id !== user.id), user]
      }));
      onUserJoin?.(user);
      
      toast({
        title: "User Joined",
        description: `${user.name} joined the collaboration`,
        variant: "default"
      });
    };

    // User left
    const handleUserLeft = (userId: string) => {
      setState(prev => ({
        ...prev,
        activeUsers: prev.activeUsers.filter(u => u.id !== userId)
      }));
      onUserLeave?.(userId);
    };

    // File switched
    const handleFileSwitched = (data: { fileId: string; userId: string }) => {
      setState(prev => ({
        ...prev,
        activeUsers: prev.activeUsers.map(user =>
          user.id === data.userId 
            ? { ...user, currentFile: data.fileId }
            : user
        )
      }));
    };

    // User activity updated
    const handleUserActivityUpdated = (data: { userId: string; lastActivity: Date }) => {
      setState(prev => ({
        ...prev,
        activeUsers: prev.activeUsers.map(user =>
          user.id === data.userId 
            ? { ...user, lastActivity: data.lastActivity }
            : user
        )
      }));
    };

    // Register event listeners
    socketService.on('connection-status-changed', handleConnectionStatusChange);
    socketService.on('user-joined', handleUserJoined);
    socketService.on('user-left', handleUserLeft);
    socketService.on('file-switched', handleFileSwitched);
    socketService.on('user-activity-updated', handleUserActivityUpdated);

    // Cleanup function
    cleanupRef.current = () => {
      socketService.off('connection-status-changed', handleConnectionStatusChange);
      socketService.off('user-joined', handleUserJoined);
      socketService.off('user-left', handleUserLeft);
      socketService.off('file-switched', handleFileSwitched);
      socketService.off('user-activity-updated', handleUserActivityUpdated);
    };

    return cleanupRef.current;
  }, [currentUser, onUserJoin, onUserLeave, toast]);

  // Initialize session on mount
  useEffect(() => {
    if (user && currentUser) {
      initializeSession();
    }

    return () => {
      cleanupSession();
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [user, currentUser, initializeSession, cleanupSession]);

  // Handle authentication changes
  useEffect(() => {
    if (!user && sessionJoinedRef.current) {
      cleanupSession();
    }
  }, [user, cleanupSession]);

  // Render loading state
  if (state.isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-medium">Connecting to collaboration session...</p>
            <p className="text-sm text-muted-foreground">
              Setting up real-time collaboration features
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (state.error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {state.error}
          </AlertDescription>
        </Alert>
        <Button onClick={initializeSession} className="w-full">
          Retry Connection
        </Button>
      </div>
    );
  }

  // Render authentication required
  if (!user || !currentUser) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You must be logged in to use the collaborative editor.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">Collaborative Editor</h1>
          {state.currentFile && (
            <Badge variant="outline" className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>{state.currentFile.name}</span>
            </Badge>
          )}
          {state.permissions && (
            <div className="flex items-center space-x-2">
              {state.permissions.isOwner && (
                <Badge variant="default" className="text-xs">
                  Owner
                </Badge>
              )}
              {!state.permissions.canWrite && (
                <Badge variant="secondary" className="text-xs">
                  Read Only
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Connection Status */}
          <SocketConnectionStatus 
            isConnected={state.isConnected}
            status={state.connectionStatus}
          />
          
          {/* Active Users Count */}
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Users className="h-3 w-3" />
            <span>{state.activeUsers.length + 1}</span>
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* File Explorer Panel */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full border-r">
              <CollaborationFileExplorer
                groupId={groupId}
                currentFileId={state.currentFile?.id}
                onFileSelect={handleFileSelect}
                className="h-full"
                readOnly={!state.permissions?.canWrite}
                canDelete={state.permissions?.canDelete || false}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Editor Panel */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full">
              {state.currentFile ? (
                <CollaborativeMonacoEditor
                  groupId={groupId}
                  currentUser={currentUser}
                  currentFile={state.currentFile}
                  onFileChange={onFileChange}
                  onContentChange={handleFileContentChange}
                  className="h-full"
                  height="100%"
                  readOnly={!state.permissions?.canWrite}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium">No file selected</p>
                      <p className="text-sm text-muted-foreground">
                        Select a file from the explorer to start collaborating
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Users Panel */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full border-l">
              <Card className="h-full rounded-none border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Active Users</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ActiveUsersList
                    users={[currentUser, ...state.activeUsers]}
                    currentUserId={currentUser.id}
                    className="space-y-2"
                  />
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Presence Manager (invisible component for activity tracking) */}
      <PresenceManager
        users={[currentUser, ...state.activeUsers]}
        currentUser={currentUser}
        onUserActivity={handleUserActivity}
        onStatusChange={handleUserStatusChange}
      />
    </div>
  );
};

export default CollaborativeEditor;