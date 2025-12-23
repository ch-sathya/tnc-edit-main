import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewsStatus, useRefreshNews } from '@/hooks/useNews';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ExternalLink, Clock, User, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { NewsArticle } from '@/types/community';
import { NewsFeedSkeleton } from '@/components/LoadingSkeletons';
import RetryHandler from '@/components/RetryHandler';
import { useErrorHandler } from '@/hooks/useErrorHandler';
interface NewsFeedProps {
  limit?: number;
  category?: string;
  showRefreshButton?: boolean;
  onArticleClick?: (article: NewsArticle) => void;
}

/**
 * NewsFeed component that displays a responsive grid of news articles
 * Implements requirements 7.2, 7.3, and 9.4 for news display and sorting
 */
export const NewsFeed: React.FC<NewsFeedProps> = ({
  limit = 12,
  category,
  showRefreshButton = true,
  onArticleClick
}) => {
  const navigate = useNavigate();
  const {
    articles,
    isLoading,
    error,
    isEmpty,
    refetch
  } = useNewsStatus({
    limit,
    category
    // Articles are sorted by publication date (newest first) by the API
  });
  const refreshNews = useRefreshNews();
  const errorHandler = useErrorHandler({
    showToast: true,
    retryable: true,
    maxRetries: 3
  });
  const handleRefresh = () => {
    refreshNews.mutate();
  };
  const handleArticleClick = (article: NewsArticle) => {
    if (onArticleClick) {
      onArticleClick(article);
    } else {
      // Default behavior: navigate to article detail view
      navigate(`/news/${article.id}`);
    }
  };
  const getCategoryColor = (category: string) => {
    const colors = {
      tech: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      software: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      development: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      industry: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };
  const formatPublishedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    // Show relative time for recent articles (within 24 hours)
    if (diffInHours < 24) {
      return formatDistanceToNow(date, {
        addSuffix: true
      });
    }

    // Show formatted date for older articles
    return format(date, 'MMM d, yyyy');
  };
  if (error) {
    return <RetryHandler error={error} onRetry={async () => {
      await refetch();
    }} title="Failed to load news articles" description="There was an error fetching the latest news. This might be due to a network problem or the news service being temporarily unavailable." maxRetries={3} showNetworkStatus={true} />;
  }
  return <section className="space-y-6" aria-labelledby="news-feed-heading">
      {/* Header with refresh button */}
      {showRefreshButton && <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1">
            <h2 id="news-feed-heading" className="text-xl sm:text-2xl font-bold text-foreground">
              {category ? `${category.charAt(0).toUpperCase() + category.slice(1)} News` : 'Latest News'}
            </h2>
            
          </div>
          <Button onClick={handleRefresh} variant="outline" disabled={refreshNews.isPending} className="min-h-[44px] w-full sm:w-auto" aria-label={refreshNews.isPending ? "Refreshing news..." : "Refresh news articles"}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshNews.isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
            {refreshNews.isPending ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>}

      {/* Loading state */}
      {isLoading && <NewsFeedSkeleton count={limit > 6 ? 6 : limit} />}

      {/* Empty state */}
      {isEmpty && <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center" role="status">
          <div className="mb-4">
            <p className="text-muted-foreground text-base sm:text-lg mb-2">No news articles available</p>
            <p className="text-muted-foreground text-sm">
              {category ? `No articles found in the ${category} category.` : 'Check back later for the latest updates.'}
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline" className="min-h-[44px]" aria-label="Refresh to load news articles">
            <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
            Refresh
          </Button>
        </div>}

      {/* Articles grid - responsive layout */}
      {!isLoading && !isEmpty && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" role="feed" aria-label="News articles">
          {articles.map(article => <Card key={article.id} className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2" onClick={() => handleArticleClick(article)} role="article" aria-labelledby={`article-title-${article.id}`} aria-describedby={`article-summary-${article.id}`} tabIndex={0} onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleArticleClick(article);
        }
      }}>
              <CardHeader className="pb-3">
                {/* Category badge and read time */}
                <div className="flex justify-between items-start mb-3 gap-2">
                  <Badge className={getCategoryColor(article.category)}>
                    {article.category}
                  </Badge>
                  {article.read_time && <div className="flex items-center text-xs text-muted-foreground flex-shrink-0">
                      <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
                      <span aria-label={`${article.read_time} minute read`}>
                        {article.read_time} min
                      </span>
                    </div>}
                </div>
                
                {/* Article title */}
                <CardTitle id={`article-title-${article.id}`} className="text-base sm:text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                  {article.title}
                </CardTitle>
                
                {/* Article summary */}
                <CardDescription id={`article-summary-${article.id}`} className="line-clamp-3 text-sm">
                  {article.summary}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Author and date */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center min-w-0">
                    <User className="w-3 h-3 mr-1 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{article.author}</span>
                  </div>
                  <div className="flex items-center flex-shrink-0">
                    <Calendar className="w-3 h-3 mr-1" aria-hidden="true" />
                    <span>{formatPublishedDate(article.published_at)}</span>
                  </div>
                </div>
                
                {/* Tags */}
                {article.tags && article.tags.length > 0 && <div className="flex flex-wrap gap-1 mb-4" role="list" aria-label="Article tags">
                    {article.tags.slice(0, 3).map(tag => <Badge key={tag} variant="secondary" className="text-xs" role="listitem">
                        {tag}
                      </Badge>)}
                    {article.tags.length > 3 && <Badge variant="secondary" className="text-xs" role="listitem">
                        +{article.tags.length - 3}
                      </Badge>}
                  </div>}

                {/* Read article button */}
                <Button variant="outline" size="sm" className="w-full min-h-[44px] group-hover:bg-primary group-hover:text-primary-foreground transition-colors" onClick={e => {
            e.stopPropagation();
            handleArticleClick(article);
          }} aria-label={`Read full article: ${article.title}`}>
                  <ExternalLink className="w-3 h-3 mr-2" aria-hidden="true" />
                  Read Article
                </Button>
              </CardContent>
            </Card>)}
        </div>}
    </section>;
};
export default NewsFeed;