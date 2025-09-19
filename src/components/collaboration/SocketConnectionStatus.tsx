import React from 'react';
import { useSocket } from '../../hooks/useSocket';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Wifi, WifiOff, RotateCcw } from 'lucide-react';

interface SocketConnectionStatusProps {
  className?: string;
}

export const SocketConnectionStatus: React.FC<SocketConnectionStatusProps> = ({ 
  className = '' 
}) => {
  const { isConnected, connectionStatus, connect, disconnect } = useSocket();

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4" />;
      case 'connecting':
      case 'reconnecting':
        return <RotateCcw className="h-4 w-4 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4" />;
      default:
        return <WifiOff className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant="outline" 
        className={`${getStatusColor()} text-white border-none`}
      >
        {getStatusIcon()}
        <span className="ml-1">{getStatusText()}</span>
      </Badge>
      
      {!isConnected && (
        <Button
          size="sm"
          variant="outline"
          onClick={connect}
          className="h-6 px-2 text-xs"
        >
          Reconnect
        </Button>
      )}
      
      {isConnected && (
        <Button
          size="sm"
          variant="outline"
          onClick={disconnect}
          className="h-6 px-2 text-xs"
        >
          Disconnect
        </Button>
      )}
    </div>
  );
};