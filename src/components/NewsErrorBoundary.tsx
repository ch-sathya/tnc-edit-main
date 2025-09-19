import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Newspaper, Rss } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface NewsErrorBoundaryProps {
  children: React.ReactNode;
  feature?: 'feed' | 'article' | 'general';
}

/**
 * Specialized error boundary for news features
 * Implements requirements 7.2, 9.2 for news error handling
 */
const NewsErrorBoundary: React.FC<NewsErrorBoundaryProps> = ({ 
  children, 
  feature = 'general' 
}) => {
  const getFeatureConfig = () => {
    switch (feature) {
      case 'feed':
        return {
          icon: <Rss className="h-12 w-12 text-destructive" />,
          title: 'News Feed Error',
          description: 'There was an issue loading the news feed. This might be due to a network problem or the news service being temporarily unavailable.',
        };
      case 'article':
        return {
          icon: <Newspaper className="h-12 w-12 text-destructive" />,
          title: 'Article Loading Error',
          description: 'There was an issue loading this news article. The article might have been removed or there could be a connection problem.',
        };
      default:
        return {
          icon: <Newspaper className="h-12 w-12 text-destructive" />,
          title: 'News Feature Error',
          description: 'There was an issue with the news feature. Please try again or contact support.',
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
            <li>• Refresh the page to reload the news</li>
            <li>• Try again in a few minutes</li>
            {feature === 'article' && <li>• Go back to the news feed and try another article</li>}
          </ul>
        </div>
        
        <div className="flex gap-2 justify-center">
          <Button onClick={() => window.location.reload()} variant="outline">
            Refresh Page
          </Button>
          <Button onClick={() => window.location.href = '/news'} variant="default">
            Back to News
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
        // Log news-specific errors
        console.error(`News ${feature} error:`, error, errorInfo);
        
        // Could send to analytics service
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'exception', {
            description: `News ${feature} error: ${error.message}`,
            fatal: false,
          });
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default NewsErrorBoundary;