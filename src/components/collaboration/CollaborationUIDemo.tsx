import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ActiveUsersList, 
  CollaborationToolbar, 
  PermissionsManager, 
  SessionSettings 
} from './index';
import { CollaborationUser } from '@/types/collaboration';
import { Users, Settings, Shield, Eye } from 'lucide-react';

// Mock data for demonstration
const mockUsers: CollaborationUser[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    avatar: '',
    status: 'online',
    currentFile: 'src/components/App.tsx',
    lastActivity: new Date(),
    cursorColor: '#3b82f6'
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    avatar: '',
    status: 'online',
    currentFile: 'src/utils/helpers.ts',
    lastActivity: new Date(Date.now() - 5 * 60 * 1000),
    cursorColor: '#ef4444'
  },
  {
    id: '3',
    name: 'Carol Davis',
    email: 'carol@example.com',
    avatar: '',
    status: 'away',
    currentFile: 'README.md',
    lastActivity: new Date(Date.now() - 15 * 60 * 1000),
    cursorColor: '#10b981'
  },
  {
    id: '4',
    name: 'David Wilson',
    email: 'david@example.com',
    avatar: '',
    status: 'offline',
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
    cursorColor: '#f59e0b'
  }
];

const mockPermissions = [
  { userId: '1', role: 'owner' as const, canInvite: true, canManageFiles: true, canChangeSettings: true },
  { userId: '2', role: 'editor' as const, canInvite: false, canManageFiles: true, canChangeSettings: false },
  { userId: '3', role: 'editor' as const, canInvite: false, canManageFiles: true, canChangeSettings: false },
  { userId: '4', role: 'viewer' as const, canInvite: false, canManageFiles: false, canChangeSettings: false }
];

const mockSessionSettings = {
  isPublic: false,
  allowAnonymous: false,
  requireApproval: true,
  maxUsers: 10
};

const mockCollaborationSettings = {
  showCursors: true,
  showTypingIndicators: true,
  showUserNames: true,
  cursorAnimations: true,
  theme: 'auto' as const,
  autoSave: true,
  autoSaveInterval: 30,
  soundNotifications: false,
  desktopNotifications: true,
  maxCursorUpdatesPerSecond: 10,
  enableRealTimeSync: true,
  batchUpdates: true,
  sharePresence: true,
  shareCurrentFile: true,
  allowFollowing: true,
  conflictResolution: 'auto' as const,
  debugMode: false
};

export const CollaborationUIDemo: React.FC = () => {
  const [followedUsers, setFollowedUsers] = useState<string[]>(['2']);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [collaborationSettings, setCollaborationSettings] = useState(mockCollaborationSettings);
  const [activeTab, setActiveTab] = useState('users');

  const currentUserId = '1';

  const handleFollowUser = (userId: string) => {
    setFollowedUsers(prev => [...prev, userId]);
  };

  const handleUnfollowUser = (userId: string) => {
    setFollowedUsers(prev => prev.filter(id => id !== userId));
  };

  const handleViewUserFile = (userId: string, fileId: string) => {
    console.log(`Viewing file ${fileId} from user ${userId}`);
  };

  const handleMessageUser = (userId: string) => {
    console.log(`Messaging user ${userId}`);
  };

  const handleSettingsChange = (newSettings: any) => {
    setCollaborationSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Collaboration UI Components Demo</h1>
        <p className="text-muted-foreground">
          Interactive demonstration of the collaborative editor UI components
        </p>
      </div>

      {/* Collaboration Toolbar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Collaboration Toolbar</span>
          </CardTitle>
          <CardDescription>
            Main toolbar with session controls, sharing options, and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CollaborationToolbar
            groupId="demo-group"
            currentFile="src/components/App.tsx"
            users={mockUsers}
            currentUserId={currentUserId}
            isConnected={true}
            connectionStatus="connected"
            permissions={{
              canShare: true,
              canManageUsers: true,
              canChangeSettings: true,
              isOwner: true
            }}
            settings={{
              showCursors: collaborationSettings.showCursors,
              showTypingIndicators: collaborationSettings.showTypingIndicators,
              autoSave: collaborationSettings.autoSave,
              soundNotifications: collaborationSettings.soundNotifications
            }}
            onShareSession={() => console.log('Share session')}
            onInviteUsers={() => console.log('Invite users')}
            onManagePermissions={() => setPermissionsOpen(true)}
            onExportSession={() => console.log('Export session')}
            onImportFiles={() => console.log('Import files')}
            onCopySessionLink={() => console.log('Copy session link')}
            onSettingsChange={handleSettingsChange}
            onLeaveSession={() => console.log('Leave session')}
          />
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Active Users</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Permissions</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compact View */}
            <Card>
              <CardHeader>
                <CardTitle>Compact View</CardTitle>
                <CardDescription>
                  Space-efficient display for toolbars and headers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActiveUsersList
                  users={mockUsers}
                  currentUserId={currentUserId}
                  compact={true}
                  followedUsers={followedUsers}
                  onFollowUser={handleFollowUser}
                  onUnfollowUser={handleUnfollowUser}
                  onViewUserFile={handleViewUserFile}
                  onMessageUser={handleMessageUser}
                />
              </CardContent>
            </Card>

            {/* Full View */}
            <Card>
              <CardHeader>
                <CardTitle>Full View</CardTitle>
                <CardDescription>
                  Detailed view with user interactions and status information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActiveUsersList
                  users={mockUsers}
                  currentUserId={currentUserId}
                  compact={false}
                  followedUsers={followedUsers}
                  onFollowUser={handleFollowUser}
                  onUnfollowUser={handleUnfollowUser}
                  onViewUserFile={handleViewUserFile}
                  onMessageUser={handleMessageUser}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Interactions</CardTitle>
              <CardDescription>
                Current followed users and available actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Following:</span>
                  {followedUsers.length > 0 ? (
                    <div className="flex space-x-1">
                      {followedUsers.map(userId => {
                        const user = mockUsers.find(u => u.id === userId);
                        return user ? (
                          <Badge key={userId} variant="secondary">
                            {user.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Click on user actions in the lists above to follow users, view their files, or send messages.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permissions Management</CardTitle>
              <CardDescription>
                Manage user roles and session access controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setPermissionsOpen(true)}>
                Open Permissions Manager
              </Button>
              
              <div className="mt-4 space-y-2">
                <h4 className="font-medium">Current Permissions:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {mockPermissions.map(perm => {
                    const user = mockUsers.find(u => u.id === perm.userId);
                    return user ? (
                      <div key={perm.userId} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{user.name}</span>
                        <Badge variant={perm.role === 'owner' ? 'default' : 'secondary'}>
                          {perm.role}
                        </Badge>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Session Settings</CardTitle>
              <CardDescription>
                Configure collaboration behavior and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SessionSettings
                settings={collaborationSettings}
                onSettingsChange={handleSettingsChange}
                onSave={() => console.log('Settings saved')}
                onReset={() => setCollaborationSettings(mockCollaborationSettings)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Permissions Manager Dialog */}
      <PermissionsManager
        open={permissionsOpen}
        onOpenChange={setPermissionsOpen}
        users={mockUsers}
        currentUserId={currentUserId}
        groupId="demo-group"
        permissions={mockPermissions}
        sessionSettings={mockSessionSettings}
        onUpdatePermissions={(userId, permissions) => 
          console.log('Update permissions', userId, permissions)
        }
        onRemoveUser={(userId) => console.log('Remove user', userId)}
        onUpdateSessionSettings={(settings) => 
          console.log('Update session settings', settings)
        }
        onCopyInviteLink={() => console.log('Copy invite link')}
      />
    </div>
  );
};

export default CollaborationUIDemo;