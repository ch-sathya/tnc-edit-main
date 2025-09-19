import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

interface RetryHandlerProps {
  error: Error | null;
  onRetry: () => void | Promise<void>;
  maxRetries?: number;
  retryDelay?: number;
  title?: string;
  description?: string;
  showNetworkStatus?: boolean;
  children?: React.ReactNode;
}

/**
 * Component that handles retry logic for failed operations
 * Implements retry mechanisms for failed operations as per requirements
 */
export const RetryHandler: React.FC<RetryHandlerProps> = ({
  error,
  onRetry,
  maxRetries = 3,
  retryDelay = 1000,
  title = 'Something went wrong',
  description = 'An error occurred while loading data. Please try again.',
  showNetworkStatus = true,
  children
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor network status
  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      toast.error(`Maximum retry attempts (${maxRetries}) reached. Please refresh the page.`);
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // Add delay before retry
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
      }

      await onRetry();
      
      // Reset retry count on successful retry
      setRetryCount(0);
      toast.success('Successfully retried operation');
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      toast.error(`Retry ${retryCount + 1} failed. ${maxRetries - retryCount - 1} attempts remaining.`);
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, maxRetries, retryDelay, onRetry]);

  const getErrorType = (error: Error) => {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('unauthorized') || message.includes('403')) {
      return 'auth';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'notfound';
    }
    return 'generic';
  };

  const getErrorMessage = (error: Error) => {
    const errorType = getErrorType(error);
    
    switch (errorType) {
      case 'network':
        return 'Network connection error. Please check your internet connection and try again.';
      case 'timeout':
        return 'Request timed out. The server might be busy. Please try again in a moment.';
      case 'auth':
        return 'Authentication error. Please log in again and try again.';
      case 'notfound':
        return 'The requested resource was not found. It might have been moved or deleted.';
      default:
        return error.message || description;
    }
  };

  if (!error) {
    return <>{children}</>;
  }

  const errorType = getErrorType(error);
  const canRetry = retryCount < maxRetries && isOnline;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{getErrorMessage(error)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network status indicator */}
        {showNetworkStatus && (
          <div className="flex items-center justify-center gap-2 text-sm">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-green-600">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-red-600">Offline</span>
              </>
            )}
          </div>
        )}

        {/* Retry information */}
        {retryCount > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Retry attempt {retryCount} of {maxRetries}
          </div>
        )}

        {/* Error-specific suggestions */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Try these steps:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {errorType === 'network' && (
              <>
                <li>• Check your internet connection</li>
                <li>• Try refreshing the page</li>
                <li>• Disable VPN if you're using one</li>
              </>
            )}
            {errorType === 'timeout' && (
              <>
                <li>• Wait a moment and try again</li>
                <li>• Check if the server is experiencing high load</li>
                <li>• Try refreshing the page</li>
              </>
            )}
            {errorType === 'auth' && (
              <>
                <li>• Log out and log back in</li>
                <li>• Clear your browser cache</li>
                <li>• Check if your session has expired</li>
              </>
            )}
            {errorType === 'generic' && (
              <>
                <li>• Try refreshing the page</li>
                <li>• Check your internet connection</li>
                <li>• Contact support if the problem persists</li>
              </>
            )}
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 justify-center">
          <Button 
            onClick={handleRetry} 
            disabled={!canRetry || isRetrying}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : canRetry ? 'Try Again' : 'Max Retries Reached'}
          </Button>
          <Button onClick={() => window.location.reload()} variant="default">
            Refresh Page
          </Button>
        </div>

        {/* Development error details */}
        {process.env.NODE_ENV === 'development' && (
          <details className="bg-muted p-4 rounded-md text-sm">
            <summary className="cursor-pointer font-medium mb-2">
              Error Details (Development Only)
            </summary>
            <div className="space-y-2">
              <div><strong>Error:</strong> {error.message}</div>
              <div><strong>Type:</strong> {errorType}</div>
              <div><strong>Retry Count:</strong> {retryCount}/{maxRetries}</div>
              {error.stack && (
                <div>
                  <strong>Stack:</strong>
                  <pre className="mt-1 text-xs overflow-auto">{error.stack}</pre>
                </div>
              )}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
};

export default RetryHandler;