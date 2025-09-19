import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Users, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CommunityErrorBoundaryProps {
  children: React.ReactNode;
  feature?: 'groups' | 'chat' | 'general';
}

/**
 * Specialized error boundary for community features
 * Implements requirements 2.5, 3.2, 4.2, 5.4, 6.4 for community error handling
 */
const CommunityErrorBoundary: React.FC<CommunityErrorBoundaryProps> = ({ 
  children, 
  feature = 'general' 
}) => {
  const getFeatureConfig = () => {
    switch (feature) {
      case 'groups':
        return {
          icon: <Users className="h-12 w-12 text-destructive" />,
          title: 'Community Groups Error',
          description: 'There was an issue loading community groups. This might be due to a network problem or server issue.',
        };
      case 'chat':
        return {
          icon: <MessageCircle className="h-12 w-12 text-destructive" />,
          title: 'Chat Error',
          description: 'There was an issue with the group chat. You may have lost connection or encountered a server error.',
        };
      default:
        return {
          icon: <Users className="h-12 w-12 text-destructive" />,
          title: 'Community Feature Error',
          description: 'There was an issue with the community feature. Please try again or contact support.',
        };
    }
  };

  const config = getFeatureConfig();

  const customFallback = (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          {config.icon}
        </div>
        <CardTitle className="text-xl">{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Try these steps to resolve the issue:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Check your internet connection</li>
            <li>• Refresh the page</li>
            <li>• Try logging out and back in</li>
            {feature === 'chat' && <li>• Check if you're still a member of the group</li>}
          </ul>
        </div>
        
        <div className="flex gap-2 justify-center">
          <Button onClick={() => window.location.reload()} variant="outline">
            Refresh Page
          </Button>
          <Button onClick={() => window.location.href = '/community'} variant="default">
            Back to Community
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <ErrorBoundary
      fallback={customFallback}
      title={config.title}
      description={config.description}
      showHomeButton={true}
      onError={(error, errorInfo) => {
        // Log community-specific errors
        console.error(`Community ${feature} error:`, error, errorInfo);
        
        // Could send to analytics service
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'exception', {
            description: `Community ${feature} error: ${error.message}`,
            fatal: false,
          });
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default CommunityErrorBoundary;