import React, { useState } from 'react';
import { CollaborationUser } from '@/types/collaboration';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, Circle, Eye, MessageCircle, MoreHorizontal, UserCheck, FileText } from 'lucide-react';

interface ActiveUsersListProps {
  users: CollaborationUser[];
  currentUserId: string;
  className?: string;
  showUserCount?: boolean;
  maxDisplayUsers?: number;
  onFollowUser?: (userId: string) => void;
  onUnfollowUser?: (userId: string) => void;
  onMessageUser?: (userId: string) => void;
  onViewUserFile?: (userId: string, fileId: string) => void;
  followedUsers?: string[];
  compact?: boolean;
}

const getStatusColor = (status: CollaborationUser['status']) => {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'away':
      return 'bg-yellow-500';
    case 'offline':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
};

const getStatusText = (status: CollaborationUser['status']) => {
  switch (status) {
    case 'online':
      return 'Online';
    case 'away':
      return 'Away';
    case 'offline':
      return 'Offline';
    default:
      return 'Unknown';
  }
};

const formatLastActivity = (lastActivity: Date) => {
  const now = new Date();
  const diff = now.getTime() - lastActivity.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const ActiveUsersList: React.FC<ActiveUsersListProps> = ({
  users,
  currentUserId,
  className = '',
  showUserCount = true,
  maxDisplayUsers = 8,
  onFollowUser,
  onUnfollowUser,
  onMessageUser,
  onViewUserFile,
  followedUsers = [],
  compact = false
}) => {
  const [expandedView, setExpandedView] = useState(false);
  const sortedUsers = [...users].sort((a, b) => {
    // Current user first
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    
    // Then by status (online first)
    const statusOrder = { online: 0, away: 1, offline: 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    
    // Then by last activity (most recent first)
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
  });

  const displayUsers = sortedUsers.slice(0, maxDisplayUsers);
  const remainingCount = Math.max(0, users.length - maxDisplayUsers);
  const onlineCount = users.filter(u => u.status === 'online').length;

  const renderUserActions = (user: CollaborationUser) => {
    if (user.id === currentUserId) return null;
    
    const isFollowed = followedUsers.includes(user.id);
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {user.currentFile && onViewUserFile && (
            <DropdownMenuItem onClick={() => onViewUserFile(user.id, user.currentFile!)}>
              <FileText className="h-4 w-4 mr-2" />
              View their file
            </DropdownMenuItem>
          )}
          
          {isFollowed ? (
            <DropdownMenuItem onClick={() => onUnfollowUser?.(user.id)}>
              <UserCheck className="h-4 w-4 mr-2" />
              Unfollow user
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onFollowUser?.(user.id)}>
              <Eye className="h-4 w-4 mr-2" />
              Follow user
            </DropdownMenuItem>
          )}
          
          {onMessageUser && (
            <DropdownMenuItem onClick={() => onMessageUser(user.id)}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Send message
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showUserCount && (
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{onlineCount}</span>
          </div>
        )}
        
        <div className="flex items-center -space-x-2">
          <TooltipProvider>
            {displayUsers.slice(0, 4).map((user) => (
              <Tooltip key={user.id}>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Avatar className="h-6 w-6 border-2 border-background hover:z-10 transition-transform hover:scale-110">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback 
                        className="text-xs font-medium"
                        style={{ backgroundColor: user.cursorColor + '20', color: user.cursorColor }}
                      >
                        {user.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <Circle 
                        className={`h-2 w-2 ${getStatusColor(user.status)} rounded-full border border-background`}
                        fill="currentColor"
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                
                <TooltipContent side="bottom">
                  <span className="text-sm">{user.name}</span>
                </TooltipContent>
              </Tooltip>
            ))}
            
            {users.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-xs"
                onClick={() => setExpandedView(true)}
              >
                +{users.length - 4}
              </Button>
            )}
          </TooltipProvider>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {showUserCount && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{onlineCount} online</span>
            {users.length > onlineCount && (
              <span className="text-xs">({users.length} total)</span>
            )}
          </div>
          
          {users.length > maxDisplayUsers && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedView(!expandedView)}
              className="text-xs"
            >
              {expandedView ? 'Show less' : 'Show all'}
            </Button>
          )}
        </div>
      )}
      
      <div className="space-y-2">
        <TooltipProvider>
          {(expandedView ? sortedUsers : displayUsers).map((user) => (
            <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback 
                    className="text-xs font-medium"
                    style={{ backgroundColor: user.cursorColor + '20', color: user.cursorColor }}
                  >
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Status indicator */}
                <div className="absolute -bottom-0.5 -right-0.5">
                  <Circle 
                    className={`h-3 w-3 ${getStatusColor(user.status)} rounded-full border-2 border-background`}
                    fill="currentColor"
                  />
                </div>
                
                {/* Following indicator */}
                {followedUsers.includes(user.id) && (
                  <div className="absolute -top-1 -right-1">
                    <Eye className="h-3 w-3 text-blue-500" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm truncate">{user.name}</span>
                  {user.id === currentUserId && (
                    <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                      You
                    </Badge>
                  )}
                  <Badge 
                    variant={user.status === 'online' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {getStatusText(user.status)}
                  </Badge>
                </div>
                
                {user.currentFile && (
                  <div className="text-xs text-muted-foreground truncate">
                    <FileText className="h-3 w-3 inline mr-1" />
                    {user.currentFile}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  {formatLastActivity(user.lastActivity)}
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                {user.currentFile && onViewUserFile && user.id !== currentUserId && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onViewUserFile(user.id, user.currentFile!)}
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span>View their file</span>
                    </TooltipContent>
                  </Tooltip>
                )}
                
                {renderUserActions(user)}
              </div>
            </div>
          ))}
        </TooltipProvider>
        
        {!expandedView && remainingCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedView(true)}
            className="w-full text-xs text-muted-foreground"
          >
            Show {remainingCount} more user{remainingCount > 1 ? 's' : ''}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ActiveUsersList;