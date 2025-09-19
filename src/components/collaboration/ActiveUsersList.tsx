import React from 'react';
import { CollaborationUser } from '@/types/collaboration';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Circle } from 'lucide-react';

interface ActiveUsersListProps {
  users: CollaborationUser[];
  currentUserId: string;
  className?: string;
  showUserCount?: boolean;
  maxDisplayUsers?: number;
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
  maxDisplayUsers = 8
}) => {
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

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showUserCount && (
        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{onlineCount} online</span>
          {users.length > onlineCount && (
            <span className="text-xs">({users.length} total)</span>
          )}
        </div>
      )}
      
      <div className="flex items-center -space-x-2">
        <TooltipProvider>
          {displayUsers.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-8 w-8 border-2 border-background hover:z-10 transition-transform hover:scale-110">
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
                  
                  {/* Current user indicator */}
                  {user.id === currentUserId && (
                    <div className="absolute -top-1 -right-1">
                      <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                        You
                      </Badge>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{user.name}</span>
                    <Badge 
                      variant={user.status === 'online' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {getStatusText(user.status)}
                    </Badge>
                  </div>
                  
                  {user.email && (
                    <div className="text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  )}
                  
                  {user.currentFile && (
                    <div className="text-xs text-muted-foreground">
                      Working on: <span className="font-mono">{user.currentFile}</span>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Last active: {formatLastActivity(user.lastActivity)}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted border-2 border-background text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors">
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="text-sm">
                  {remainingCount} more user{remainingCount > 1 ? 's' : ''}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
};

export default ActiveUsersList;