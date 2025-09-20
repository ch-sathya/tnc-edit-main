import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  Crown, 
  Edit, 
  Eye, 
  UserX, 
  Copy,
  Globe,
  Lock,
  Users
} from 'lucide-react';
import { CollaborationUser } from '@/types/collaboration';

interface UserPermission {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  canInvite: boolean;
  canManageFiles: boolean;
  canChangeSettings: boolean;
}

interface SessionSettings {
  isPublic: boolean;
  allowAnonymous: boolean;
  requireApproval: boolean;
  maxUsers: number;
}

interface PermissionsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: CollaborationUser[];
  currentUserId: string;
  groupId: string;
  permissions: UserPermission[];
  sessionSettings: SessionSettings;
  onUpdatePermissions?: (userId: string, permissions: Partial<UserPermission>) => void;
  onRemoveUser?: (userId: string) => void;
  onUpdateSessionSettings?: (settings: Partial<SessionSettings>) => void;
  onCopyInviteLink?: () => void;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'owner':
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case 'editor':
      return <Edit className="h-4 w-4 text-blue-500" />;
    case 'viewer':
      return <Eye className="h-4 w-4 text-gray-500" />;
    default:
      return <Users className="h-4 w-4" />;
  }
};

const getRoleDescription = (role: string) => {
  switch (role) {
    case 'owner':
      return 'Full access to all features and settings';
    case 'editor':
      return 'Can edit files and collaborate in real-time';
    case 'viewer':
      return 'Can view files but cannot make changes';
    default:
      return 'Unknown role';
  }
};

export const PermissionsManager: React.FC<PermissionsManagerProps> = ({
  open,
  onOpenChange,
  users,
  currentUserId,
  groupId,
  permissions,
  sessionSettings,
  onUpdatePermissions,
  onRemoveUser,
  onUpdateSessionSettings,
  onCopyInviteLink
}) => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  
  const getUserPermission = (userId: string): UserPermission => {
    return permissions.find(p => p.userId === userId) || {
      userId,
      role: 'viewer',
      canInvite: false,
      canManageFiles: false,
      canChangeSettings: false
    };
  };

  const currentUserPermission = getUserPermission(currentUserId);
  const canManagePermissions = currentUserPermission.role === 'owner' || currentUserPermission.canChangeSettings;

  const handleRoleChange = (userId: string, newRole: 'owner' | 'editor' | 'viewer') => {
    if (!canManagePermissions) return;
    
    const basePermissions = {
      role: newRole,
      canInvite: newRole === 'owner',
      canManageFiles: newRole !== 'viewer',
      canChangeSettings: newRole === 'owner'
    };
    
    onUpdatePermissions?.(userId, basePermissions);
  };

  const handlePermissionToggle = (userId: string, permission: keyof UserPermission, value: boolean) => {
    if (!canManagePermissions) return;
    onUpdatePermissions?.(userId, { [permission]: value });
  };

  const handleSessionSettingChange = (setting: keyof SessionSettings, value: any) => {
    if (!canManagePermissions) return;
    onUpdateSessionSettings?.({ [setting]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Manage Permissions</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Settings */}
          {canManagePermissions && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Session Settings</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="public-session">Public Session</Label>
                  <Switch
                    id="public-session"
                    checked={sessionSettings.isPublic}
                    onCheckedChange={(checked) => handleSessionSettingChange('isPublic', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-anonymous">Allow Anonymous</Label>
                  <Switch
                    id="allow-anonymous"
                    checked={sessionSettings.allowAnonymous}
                    onCheckedChange={(checked) => handleSessionSettingChange('allowAnonymous', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-approval">Require Approval</Label>
                  <Switch
                    id="require-approval"
                    checked={sessionSettings.requireApproval}
                    onCheckedChange={(checked) => handleSessionSettingChange('requireApproval', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="max-users">Max Users: {sessionSettings.maxUsers}</Label>
                  <Select
                    value={sessionSettings.maxUsers.toString()}
                    onValueChange={(value) => handleSessionSettingChange('maxUsers', parseInt(value))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                <Globe className="h-4 w-4" />
                <span className="text-sm flex-1">
                  Invite Link: <code className="text-xs">/collaborate/{groupId}</code>
                </span>
                <Button size="sm" variant="outline" onClick={onCopyInviteLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* User Permissions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">User Permissions</h3>
            
            <div className="space-y-3">
              {users.map((user) => {
                const userPermission = getUserPermission(user.id);
                const isCurrentUser = user.id === currentUserId;
                
                return (
                  <div key={user.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium truncate">{user.name}</span>
                        {isCurrentUser && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                        <Badge 
                          variant={user.status === 'online' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {user.status}
                        </Badge>
                      </div>
                      
                      {user.email && (
                        <div className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Role selector */}
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(userPermission.role)}
                        <Select
                          value={userPermission.role}
                          onValueChange={(value: 'owner' | 'editor' | 'viewer') => 
                            handleRoleChange(user.id, value)
                          }
                          disabled={!canManagePermissions || isCurrentUser}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Advanced permissions toggle */}
                      {selectedUser === user.id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(null)}
                        >
                          Less
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(user.id)}
                        >
                          More
                        </Button>
                      )}
                      
                      {/* Remove user */}
                      {canManagePermissions && !isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveUser?.(user.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {/* Expanded permissions */}
                    {selectedUser === user.id && (
                      <div className="col-span-full mt-3 p-3 bg-muted rounded-lg space-y-3">
                        <div className="text-sm text-muted-foreground">
                          {getRoleDescription(userPermission.role)}
                        </div>
                        
                        {canManagePermissions && !isCurrentUser && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">Can invite users</Label>
                              <Switch
                                checked={userPermission.canInvite}
                                onCheckedChange={(checked) => 
                                  handlePermissionToggle(user.id, 'canInvite', checked)
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">Can manage files</Label>
                              <Switch
                                checked={userPermission.canManageFiles}
                                onCheckedChange={(checked) => 
                                  handlePermissionToggle(user.id, 'canManageFiles', checked)
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">Can change settings</Label>
                              <Switch
                                checked={userPermission.canChangeSettings}
                                onCheckedChange={(checked) => 
                                  handlePermissionToggle(user.id, 'canChangeSettings', checked)
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionsManager;