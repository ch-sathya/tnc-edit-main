import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Share2, 
  Lock, 
  Unlock, 
  Eye, 
  Edit3, 
  Trash2, 
  Users,
  Shield,
  UserPlus,
  UserMinus,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CollaborationFile, FilePermissions } from '@/types/collaboration';
import { projectFileManagementService } from '@/services/project-file-management-service';
import { supabase } from '@/integrations/supabase/client';

interface FilePermissionsManagerProps {
  file: CollaborationFile;
  currentUserId: string;
  onPermissionsChange?: (fileId: string, permissions: FilePermissions) => void;
}

interface GroupMember {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  isOwner: boolean;
}

export const FilePermissionsManager: React.FC<FilePermissionsManagerProps> = ({
  file,
  currentUserId,
  onPermissionsChange
}) => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<FilePermissions | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (file) {
      loadPermissionsAndMembers();
    }
  }, [file, currentUserId]);

  const loadPermissionsAndMembers = async () => {
    try {
      setLoading(true);
      
      // Load file permissions
      const filePermissions = await projectFileManagementService.checkFilePermissions(file.id, currentUserId);
      setPermissions(filePermissions);
      setIsOwner(file.createdBy === currentUserId);

      // Load group members
      const { data: memberships, error } = await supabase
        .from('group_memberships')
        .select(`
          user_id,
          profiles:user_id (
            user_id,
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('group_id', file.groupId);

      if (error) {
        throw new Error(`Failed to load group members: ${error.message}`);
      }

      // Get group owner
      const { data: group, error: groupError } = await supabase
        .from('community_groups')
        .select('owner_id')
        .eq('id', file.groupId)
        .single();

      if (groupError) {
        throw new Error(`Failed to load group info: ${groupError.message}`);
      }

      const members: GroupMember[] = (memberships || []).map((membership: any) => ({
        id: membership.user_id,
        userId: membership.user_id,
        displayName: membership.profiles?.display_name || 'Unknown User',
        username: membership.profiles?.username || 'unknown',
        avatarUrl: membership.profiles?.avatar_url,
        isOwner: membership.user_id === group.owner_id
      }));

      setGroupMembers(members);
    } catch (error) {
      console.error('Error loading permissions and members:', error);
      toast({
        title: "Error",
        description: "Failed to load file permissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPermissionLevel = (userId: string): 'owner' | 'editor' | 'viewer' | 'none' => {
    if (file.createdBy === userId) {
      return 'owner';
    }
    
    if (permissions?.sharedWith?.includes(userId)) {
      return 'editor';
    }
    
    // All group members have at least viewer access
    const isMember = groupMembers.some(member => member.userId === userId);
    return isMember ? 'viewer' : 'none';
  };

  const updatePermissions = async (userId: string, level: 'editor' | 'viewer' | 'none') => {
    if (!permissions) return;

    try {
      let updatedSharedWith = [...(permissions.sharedWith || [])];
      
      switch (level) {
        case 'editor':
          if (!updatedSharedWith.includes(userId)) {
            updatedSharedWith.push(userId);
          }
          break;
        case 'viewer':
          updatedSharedWith = updatedSharedWith.filter(id => id !== userId);
          break;
        case 'none':
          updatedSharedWith = updatedSharedWith.filter(id => id !== userId);
          break;
      }

      const updatedPermissions: FilePermissions = {
        ...permissions,
        sharedWith: updatedSharedWith
      };

      setPermissions(updatedPermissions);
      onPermissionsChange?.(file.id, updatedPermissions);

      // In a real implementation, this would save to the database
      // For now, we'll just store in localStorage as a demo
      const permissionsKey = `file_permissions_${file.id}`;
      localStorage.setItem(permissionsKey, JSON.stringify(updatedPermissions));

      toast({
        title: "Permissions updated",
        description: `File permissions have been updated`
      });
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive"
      });
    }
  };

  const getPermissionIcon = (level: string) => {
    switch (level) {
      case 'owner':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'editor':
        return <Edit3 className="h-4 w-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-green-500" />;
      default:
        return <Lock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPermissionBadge = (level: string) => {
    const variants = {
      owner: 'destructive',
      editor: 'default',
      viewer: 'secondary',
      none: 'outline'
    } as const;

    return (
      <Badge variant={variants[level as keyof typeof variants] || 'outline'}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            Loading permissions...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!permissions) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load file permissions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            File Permissions
          </CardTitle>
          {isOwner && (
            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Share File: {file.name}</DialogTitle>
                  <DialogDescription>
                    Manage who can access and edit this file within your collaboration group.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Group Members</Label>
                    <ScrollArea className="h-64 border rounded-md p-2">
                      <div className="space-y-2">
                        {groupMembers.map(member => {
                          const currentLevel = getPermissionLevel(member.userId);
                          const canModify = isOwner && member.userId !== currentUserId;
                          
                          return (
                            <div key={member.userId} className="flex items-center justify-between p-2 rounded-lg border">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={member.avatarUrl} />
                                  <AvatarFallback>
                                    {member.displayName.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-sm">{member.displayName}</div>
                                  <div className="text-xs text-muted-foreground">@{member.username}</div>
                                  {member.isOwner && (
                                    <Badge variant="outline" className="text-xs mt-1">
                                      Group Owner
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {getPermissionIcon(currentLevel)}
                                {getPermissionBadge(currentLevel)}
                                
                                {canModify && (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => updatePermissions(
                                        member.userId, 
                                        currentLevel === 'editor' ? 'viewer' : 'editor'
                                      )}
                                      className="h-6 px-2"
                                    >
                                      {currentLevel === 'editor' ? (
                                        <UserMinus className="h-3 w-3" />
                                      ) : (
                                        <UserPlus className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <Label className="text-sm font-medium">Permission Levels</Label>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3 text-red-500" />
                        <span className="font-medium">Owner:</span>
                        <span className="text-muted-foreground">Full access, can delete file and manage permissions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Edit3 className="h-3 w-3 text-blue-500" />
                        <span className="font-medium">Editor:</span>
                        <span className="text-muted-foreground">Can read and write file content</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-3 w-3 text-green-500" />
                        <span className="font-medium">Viewer:</span>
                        <span className="text-muted-foreground">Can only read file content</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button onClick={() => setShowShareDialog(false)}>
                    Done
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Your Permissions</Label>
            <div className="flex items-center gap-2">
              {getPermissionIcon(getPermissionLevel(currentUserId))}
              {getPermissionBadge(getPermissionLevel(currentUserId))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm">File Owner</Label>
            <div className="text-sm text-muted-foreground">
              {file.createdBy === currentUserId ? 'You' : 'Another user'}
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm">Access Summary</Label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Eye className="h-3 w-3" />
              <span>Can Read: {permissions.canRead ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Edit3 className="h-3 w-3" />
              <span>Can Write: {permissions.canWrite ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trash2 className="h-3 w-3" />
              <span>Can Delete: {permissions.canDelete ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Share2 className="h-3 w-3" />
              <span>Can Share: {permissions.canShare ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
        
        {permissions.sharedWith && permissions.sharedWith.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm">Shared With ({permissions.sharedWith.length})</Label>
            <div className="flex flex-wrap gap-1">
              {permissions.sharedWith.map(userId => {
                const member = groupMembers.find(m => m.userId === userId);
                return member ? (
                  <Badge key={userId} variant="secondary" className="text-xs">
                    {member.displayName}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}
        
        {!isOwner && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span>Only the file owner can modify permissions</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};