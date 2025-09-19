import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { SocketConnectionStatus } from './SocketConnectionStatus';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { CollaborationUser } from '../../../server/types';

export const CollaborationDemo: React.FC = () => {
  const {
    isConnected,
    connect,
    disconnect,
    joinCollaboration,
    leaveCollaboration,
    updateCursor,
    startTyping,
    stopTyping,
    onUserJoined,
    onUserLeft,
    onCursorUpdated,
    onUserTyping
  } = useSocket();

  const [groupId, setGroupId] = useState('demo-group-1');
  const [userId, setUserId] = useState('demo-user-1');
  const [userName, setUserName] = useState('Demo User');
  const [isInRoom, setIsInRoom] = useState(false);
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const [cursors, setCursors] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Set up event listeners
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    cleanupFunctions.push(
      onUserJoined((user) => {
        console.log('User joined:', user);
        setActiveUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
      })
    );

    cleanupFunctions.push(
      onUserLeft((userId) => {
        console.log('User left:', userId);
        setActiveUsers(prev => prev.filter(u => u.id !== userId));
        setCursors(prev => prev.filter(c => c.userId !== userId));
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      })
    );

    cleanupFunctions.push(
      onCursorUpdated((data) => {
        console.log('Cursor updated:', data);
        setCursors(prev => [
          ...prev.filter(c => c.userId !== data.cursor.userId),
          data.cursor
        ]);
      })
    );

    cleanupFunctions.push(
      onUserTyping((data) => {
        console.log('User typing:', data);
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });
      })
    );

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [onUserJoined, onUserLeft, onCursorUpdated, onUserTyping]);

  const handleJoinRoom = () => {
    if (!isConnected) {
      connect();
      return;
    }

    const user: CollaborationUser = {
      id: userId,
      name: userName,
      status: 'online',
      lastActivity: new Date(),
      cursorColor: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };

    joinCollaboration(groupId, user);
    setIsInRoom(true);
  };

  const handleLeaveRoom = () => {
    leaveCollaboration(groupId, userId);
    setIsInRoom(false);
    setActiveUsers([]);
    setCursors([]);
    setTypingUsers(new Set());
  };

  const handleUpdateCursor = () => {
    const cursor = {
      line: Math.floor(Math.random() * 20) + 1,
      column: Math.floor(Math.random() * 50) + 1,
      userId,
      userName,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      timestamp: Date.now()
    };

    updateCursor(groupId, 'demo-file-1', cursor);
  };

  const handleStartTyping = () => {
    startTyping(groupId, 'demo-file-1', userId);
  };

  const handleStopTyping = () => {
    stopTyping(groupId, 'demo-file-1', userId);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Socket.IO Collaboration Demo
            <SocketConnectionStatus />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Group ID</label>
              <Input
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                disabled={isInRoom}
              />
            </div>
            <div>
              <label className="text-sm font-medium">User ID</label>
              <Input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={isInRoom}
              />
            </div>
            <div>
              <label className="text-sm font-medium">User Name</label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                disabled={isInRoom}
              />
            </div>
          </div>

          <div className="flex gap-2">
            {!isInRoom ? (
              <Button onClick={handleJoinRoom} disabled={!isConnected && !groupId}>
                {!isConnected ? 'Connect & Join Room' : 'Join Room'}
              </Button>
            ) : (
              <Button onClick={handleLeaveRoom} variant="destructive">
                Leave Room
              </Button>
            )}
          </div>

          {isInRoom && (
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleUpdateCursor} size="sm">
                Update Cursor
              </Button>
              <Button onClick={handleStartTyping} size="sm">
                Start Typing
              </Button>
              <Button onClick={handleStopTyping} size="sm">
                Stop Typing
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isInRoom && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Active Users ({activeUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {activeUsers.map(user => (
                  <Badge 
                    key={user.id} 
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <div 
                      className="w-3 h-3 rounded-full" 
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

          <Card>
            <CardHeader>
              <CardTitle>Cursors ({cursors.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cursors.map(cursor => (
                  <div key={cursor.userId} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cursor.color }}
                    />
                    <span className="font-medium">{cursor.userName}</span>
                    <span className="text-gray-500">
                      Line {cursor.line}, Column {cursor.column}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Typing Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              {typingUsers.size > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from(typingUsers).map(userId => (
                    <Badge key={userId} className="animate-pulse">
                      {activeUsers.find(u => u.id === userId)?.name || userId} is typing...
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No one is typing</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};