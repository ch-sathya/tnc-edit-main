import React from 'react';
import { CollaborationUser } from '@/types/collaboration';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Circle, Wifi, WifiOff } from 'lucide-react';
import ActiveUsersList from './ActiveUsersList';
import TypingIndicator from './TypingIndicator';

interface TypingUser {
  userId: string;
  userName: string;
}

interface PresenceStatusProps {
  users: CollaborationUser[];
  currentUserId: string;
  typingUsers: TypingUser[];
  isConnected: boolean;
  className?: string;
  showDetails?: boolean;
}

export const PresenceStatus: React.FC<PresenceStatusProps> = ({
  users,
  currentUserId,
  typingUsers,
  isConnected,
  className = '',
  showDetails = true
}) => {
  const onlineUsers = users.filter(u => u.status === 'online');
  const awayUsers = users.filter(u => u.status === 'away');
  const offlineUsers = users.filter(u => u.status === 'offline');

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4 space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-700">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">Disconnected</span>
              </>
            )}
          </div>
          
          <Badge variant="outline" className="text-xs">
            {users.length} user{users.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <Separator />

        {/* Active Users List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Active Users</h4>
          <ActiveUsersList 
            users={users}
            currentUserId={currentUserId}
            showUserCount={false}
          />
        </div>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <>
            <Separator />
            <TypingIndicator typingUsers={typingUsers} />
          </>
        )}

        {/* Detailed Status Breakdown */}
        {showDetails && users.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Status Breakdown</h4>
              <div className="space-y-1 text-xs">
                {onlineUsers.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                    <span>{onlineUsers.length} online</span>
                  </div>
                )}
                
                {awayUsers.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Circle className="h-2 w-2 fill-yellow-500 text-yellow-500" />
                    <span>{awayUsers.length} away</span>
                  </div>
                )}
                
                {offlineUsers.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Circle className="h-2 w-2 fill-gray-400 text-gray-400" />
                    <span>{offlineUsers.length} offline</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Current File Information */}
        {showDetails && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Files</h4>
              <div className="space-y-1 text-xs">
                {Object.entries(
                  users
                    .filter(u => u.currentFile && u.status === 'online')
                    .reduce((acc, user) => {
                      const file = user.currentFile!;
                      if (!acc[file]) acc[file] = [];
                      acc[file].push(user);
                      return acc;
                    }, {} as Record<string, CollaborationUser[]>)
                ).map(([file, fileUsers]) => (
                  <div key={file} className="flex items-center justify-between">
                    <span className="font-mono text-muted-foreground truncate max-w-[120px]">
                      {file}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {fileUsers.length}
                    </Badge>
                  </div>
                ))}
                
                {users.filter(u => u.currentFile && u.status === 'online').length === 0 && (
                  <span className="text-muted-foreground">No active files</span>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PresenceStatus;