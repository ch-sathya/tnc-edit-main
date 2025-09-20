import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCommunityGroup } from '@/hooks/useCommunityGroups';
import { collaborationSessionService } from '@/services/collaboration-session-service';
import { collaborationFileService } from '@/lib/collaboration-file-service';
import { CollaborationFile, CollaborationUser } from '@/types/collaboration';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

// Icons
import { 
  Plus, 
  Settings, 
  Users, 
  FileText, 
  Clock, 
  Trash2, 
  Edit,
  Code2,
  History,
  UserPlus,
  UserMinus,
  Crown,
  Shield,
  Eye
} from 'lucide-react';

interface CollaborationRoomManagerProps {
  groupId: string;
  onStartCollaboration?: (fileId?: string) => void;
  className?: string;
}

interface CollaborationSession {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  lastActivity: Date;
  activeUsers: CollaborationUser[];
  files: CollaborationFile[];
  isActive: boolean;
}

interface CreateSessionData {
  name: string;
  description: string;
  initialFiles: string[];
}

export const CollaborationRoomManager: React.FC<CollaborationRoomManagerProps> = ({
  groupId,
  onStartCollaboration,
  className = ''
}) => {
  const { user } = useAuth();
  const { data: group } = useCommunityGroup(groupId);
  
  // State
  const [sessions, setSessions] = useState<CollaborationSession[]>([]);
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CollaborationSession | null>(null);
  
  // Form state
  const [createForm, setCreateForm] = useState<CreateSessionData>({
    name: '',
    description: '',
    initialFiles: []
  });

  // Load collaboration data
  useEffect(() => {
    loadCollaborationData();
  }, [groupId]);

  const loadCollaborationData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get active users
      const users = await collaborationSessionService.getActiveUsers(groupId);
      setActiveUsers(users);
      
      // Get collaboration files (representing sessions)
      const files = await collaborationFileService.getFilesByGroup(groupId);
      
      // Transform files into sessions (simplified for now)
      const sessionData: CollaborationSession[] = [{
        id: 'main',
        name: `${group?.name || 'Group'} Collaboration`,
        description: 'Main collaboration session for this group',
        createdBy: group?.owner_id || '',
        createdAt: new Date(group?.created_at || Date.now()),
        lastActivity: new Date(),
        activeUsers: users,
        files: files,
        isActive: users.length > 0
      }];
      
      setSessions(sessionData);
    } catch (error) {
      console.error('Failed to load collaboration data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!user || !createForm.name.trim()) return;
    
    try {
      // For now, we'll just start the main collaboration session
      // In a full implementation, this would create a new session record
      setShowCreateDialog(false);
      setCreateForm({ name: '', description: '', initialFiles: [] });
      onStartCollaboration?.();
    } catch (error) {
      console.error('Failed to create collaboration session:', error);
    }
  };

  const handleJoinSession = async (sessionId: string) => {
    if (!user) return;
    
    try {
      onStartCollaboration?.();
    } catch (error) {
      console.error('Failed to join collaboration session:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    // Implementation for deleting a session
    console.log('Delete session:', sessionId);
  };

  const canManageSessions = group?.is_owner || false;
  const canJoinSessions = group?.is_member || false;

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading collaboration rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Collaboration Rooms</h2>
          <p className="text-muted-foreground">
            Manage and join collaborative coding sessions
          </p>
        </div>
        
        {canManageSessions && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Collaboration Session</DialogTitle>
                <DialogDescription>
                  Set up a new collaborative coding session for your group members.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="session-name">Session Name</Label>
                  <Input
                    id="session-name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter session name..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="session-description">Description (Optional)</Label>
                  <Textarea
                    id="session-description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what you'll be working on..."
                    rows={3}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSession} disabled={!createForm.name.trim()}>
                  Create Session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Active Users */}
      {activeUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Currently Active ({activeUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {activeUsers.map((user) => (
                <Badge key={user.id} variant="secondary" className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: user.cursorColor }}
                  />
                  {user.name}
                  {user.status === 'online' && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collaboration Sessions */}
      <div className="grid gap-4">
        {sessions.map((session) => (
          <Card key={session.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="h-5 w-5" />
                    {session.name}
                    {session.isActive && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </CardTitle>
                  {session.description && (
                    <CardDescription>{session.description}</CardDescription>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {canManageSessions && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSession(session);
                          setShowSettingsDialog(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSession(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Session Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {session.activeUsers.length} active
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {session.files.length} files
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {session.lastActivity.toLocaleDateString()}
                </div>
              </div>

              {/* Files Preview */}
              {session.files.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Recent Files:</p>
                  <div className="flex flex-wrap gap-1">
                    {session.files.slice(0, 5).map((file) => (
                      <Badge key={file.id} variant="outline" className="text-xs">
                        {file.name}
                      </Badge>
                    ))}
                    {session.files.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{session.files.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                {canJoinSessions ? (
                  <Button 
                    onClick={() => handleJoinSession(session.id)}
                    className="flex items-center gap-2"
                  >
                    <Code2 className="h-4 w-4" />
                    {session.isActive ? 'Join Session' : 'Start Session'}
                  </Button>
                ) : (
                  <Alert>
                    <AlertDescription>
                      You need to be a member of this group to join collaboration sessions.
                    </AlertDescription>
                  </Alert>
                )}
                
                <Button variant="outline" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Session Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Session Settings</DialogTitle>
            <DialogDescription>
              Configure collaboration session settings and permissions.
            </DialogDescription>
          </DialogHeader>
          
          {selectedSession && (
            <div className="space-y-6">
              {/* Basic Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Session Name</Label>
                    <Input defaultValue={selectedSession.name} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select defaultValue={selectedSession.isActive ? 'active' : 'inactive'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea defaultValue={selectedSession.description} rows={3} />
                </div>
              </div>

              <Separator />

              {/* User Management */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">User Permissions</h3>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {selectedSession.activeUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: user.cursorColor }}
                          />
                          <span className="font-medium">{user.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {user.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Crown className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Shield className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <UserMinus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {sessions.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Code2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Collaboration Sessions</h3>
            <p className="text-muted-foreground mb-4">
              Create your first collaboration session to start coding together.
            </p>
            {canManageSessions && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Session
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CollaborationRoomManager;