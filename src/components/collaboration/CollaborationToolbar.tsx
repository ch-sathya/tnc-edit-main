import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Share2, 
  Settings, 
  Users, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Download, 
  Upload, 
  Copy,
  MoreHorizontal,
  UserPlus,
  Shield,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { CollaborationUser } from '@/types/collaboration';

interface CollaborationToolbarProps {
  groupId: string;
  currentFile?: string;
  users: CollaborationUser[];
  currentUserId: string;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  permissions?: {
    canShare: boolean;
    canManageUsers: boolean;
    canChangeSettings: boolean;
    isOwner: boolean;
  };
  settings?: {
    showCursors: boolean;
    showTypingIndicators: boolean;
    autoSave: boolean;
    soundNotifications: boolean;
  };
  onShareSession?: () => void;
  onInviteUsers?: () => void;
  onManagePermissions?: () => void;
  onExportSession?: () => void;
  onImportFiles?: () => void;
  onCopySessionLink?: () => void;
  onSettingsChange?: (settings: any) => void;
  onLeaveSession?: () => void;
  className?: string;
}

const getConnectionStatusInfo = (status: string, isConnected: boolean) => {
  if (!isConnected || status === 'disconnected') {
    return { icon: WifiOff, color: 'text-red-500', text: 'Disconnected' };
  }
  
  switch (status) {
    case 'connecting':
    case 'reconnecting':
      return { icon: Wifi, color: 'text-yellow-500', text: 'Connecting...' };
    case 'connected':
      return { icon: Wifi, color: 'text-green-500', text: 'Connected' };
    default:
      return { icon: WifiOff, color: 'text-gray-500', text: 'Unknown' };
  }
};

export const CollaborationToolbar: React.FC<CollaborationToolbarProps> = ({
  groupId,
  currentFile,
  users,
  currentUserId,
  isConnected,
  connectionStatus,
  permissions = {
    canShare: true,
    canManageUsers: false,
    canChangeSettings: true,
    isOwner: false
  },
  settings = {
    showCursors: true,
    showTypingIndicators: true,
    autoSave: true,
    soundNotifications: false
  },
  onShareSession,
  onInviteUsers,
  onManagePermissions,
  onExportSession,
  onImportFiles,
  onCopySessionLink,
  onSettingsChange,
  onLeaveSession,
  className = ''
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  const connectionInfo = getConnectionStatusInfo(connectionStatus, isConnected);
  const onlineUsers = users.filter(u => u.status === 'online');
  
  const handleSettingChange = (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    onSettingsChange?.(newSettings);
  };

  return (
    <TooltipProvider>
      <div className={`flex items-center justify-between p-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}>
        {/* Left section - Session info and connection status */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <connectionInfo.icon className={`h-4 w-4 ${connectionInfo.color}`} />
            <span className="text-sm font-medium">{connectionInfo.text}</span>
          </div>
          
          <Separator orientation="vertical" className="h-4" />
          
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary" className="text-xs">
              {onlineUsers.length} online
            </Badge>
          </div>
          
          {currentFile && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Editing:</span>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">{currentFile}</code>
              </div>
            </>
          )}
        </div>

        {/* Right section - Actions and controls */}
        <div className="flex items-center space-x-2">
          {/* Quick actions */}
          {permissions.canShare && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCopySessionLink}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <span>Copy session link</span>
              </TooltipContent>
            </Tooltip>
          )}

          {permissions.canManageUsers && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onInviteUsers}
                  className="h-8 w-8 p-0"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <span>Invite users</span>
              </TooltipContent>
            </Tooltip>
          )}

          <Separator orientation="vertical" className="h-4" />

          {/* Share menu */}
          {permissions.canShare && (
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Share Collaboration Session</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Session Link</label>
                    <div className="flex items-center space-x-2">
                      <input
                        readOnly
                        value={`${window.location.origin}/collaborate/${groupId}`}
                        className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                      />
                      <Button
                        size="sm"
                        onClick={onCopySessionLink}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Anyone with the link can join</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onManagePermissions}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Manage Access
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Settings menu */}
          <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm font-semibold">
                Collaboration Settings
              </div>
              <DropdownMenuSeparator />
              
              <DropdownMenuCheckboxItem
                checked={settings.showCursors}
                onCheckedChange={(checked) => handleSettingChange('showCursors', checked)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Show user cursors
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuCheckboxItem
                checked={settings.showTypingIndicators}
                onCheckedChange={(checked) => handleSettingChange('showTypingIndicators', checked)}
              >
                <Users className="h-4 w-4 mr-2" />
                Show typing indicators
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuCheckboxItem
                checked={settings.autoSave}
                onCheckedChange={(checked) => handleSettingChange('autoSave', checked)}
              >
                <Clock className="h-4 w-4 mr-2" />
                Auto-save changes
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuCheckboxItem
                checked={settings.soundNotifications}
                onCheckedChange={(checked) => handleSettingChange('soundNotifications', checked)}
              >
                Sound notifications
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuSeparator />
              
              {permissions.canChangeSettings && (
                <>
                  <DropdownMenuItem onClick={onManagePermissions}>
                    <Shield className="h-4 w-4 mr-2" />
                    Manage permissions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              <DropdownMenuItem onClick={onExportSession}>
                <Download className="h-4 w-4 mr-2" />
                Export session
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={onImportFiles}>
                <Upload className="h-4 w-4 mr-2" />
                Import files
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.open(`/groups/${groupId}`, '_blank')}>
                View group page
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={onShareSession}>
                <Share2 className="h-4 w-4 mr-2" />
                Share session
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={onLeaveSession}
                className="text-red-600 focus:text-red-600"
              >
                Leave session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CollaborationToolbar;