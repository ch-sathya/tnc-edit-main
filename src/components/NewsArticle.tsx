import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Clock, User, Calendar, Share2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useNewsArticle } from '@/hooks/useNews';
import { toast } from 'sonner';
import { NewsArticleSkeleton } from '@/components/LoadingSkeletons';
import RetryHandler from '@/components/RetryHandler';
import { useErrorHandler } from '@/hooks/useErrorHandler';

/**
 * NewsArticle component for displaying full article content
 * Implements requirements 8.1, 8.2, 8.3, 8.4 for article detail view
 */
export const NewsArticle: React.FC = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const { data: article, isLoading, error, refetch } = useNewsArticle(articleId || '');
  
  const errorHandler = useErrorHandler({
    showToast: true,
    retryable: true,
    maxRetries: 3
  });

  const handleBackToNews = () => {
    navigate('/news');
  };

  const handleShareArticle = async () => {
    if (!article) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: article.summary,
          url: window.location.href,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Article link copied to clipboard!');
      }
    } catch (error) {
      toast.error('Failed to share article');
    }
  };

  const handleOpenOriginal = () => {
    if (article?.source_url) {
      window.open(article.source_url, '_blank');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      tech: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      software: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      development: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      industry: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  const formatPublishedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    // Show relative time for recent articles (within 24 hours)
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    
    // Show formatted date for older articles
    return format(date, 'MMMM d, yyyy');
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={handleBackToNews}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to News
            </Button>
          </div>
          
          <RetryHandler
            error={error}
            onRetry={async () => {
              await refetch();
            }}
            title="Failed to load article"
            description="The article could not be found or there was an error loading it. This might be due to a network problem or the article being removed."
            maxRetries={3}
            showNetworkStatus={true}
          />
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={handleBackToNews}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to News
            </Button>
          </div>
          
          <NewsArticleSkeleton />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={handleBackToNews}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to News
            </Button>
          </div>
          
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <p className="text-muted-foreground text-lg">Article not found</p>
            <Button onClick={handleBackToNews} variant="outline" className="mt-4">
              Back to News
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background p-3 sm:p-6" role="main">
      <div className="max-w-4xl mx-auto">
        {/* Navigation header */}
        <nav className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6" role="navigation" aria-label="Article navigation">
          <Button 
            variant="ghost" 
            onClick={handleBackToNews}
            className="min-h-[44px] self-start"
            aria-label="Go back to news list"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to News</span>
            <span className="sm:hidden">Back</span>
          </Button>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={handleShareArticle}
              className="min-h-[44px]"
              aria-label="Share this article"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button 
              variant="outline" 
              onClick={handleOpenOriginal}
              className="min-h-[44px]"
              aria-label="View original article on external site"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">View Original</span>
              <span className="sm:hidden">Original</span>
            </Button>
          </div>
        </nav>

        {/* Article content */}
        <article>
          <Card>
            <CardHeader className="pb-6 p-4 sm:p-6">
              {/* Category badge and read time */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                <Badge className={getCategoryColor(article.category)}>
                  {article.category}
                </Badge>
                {article.read_time && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" aria-hidden="true" />
                    <span aria-label={`${article.read_time} minute read`}>
                      {article.read_time} min read
                    </span>
                  </div>
                )}
              </div>
              
              {/* Article title */}
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight mb-4">
                {article.title}
              </h1>
              
              {/* Article summary */}
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">
                {article.summary}
              </p>
              
              {/* Author and publication info */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm text-muted-foreground border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2" aria-hidden="true" />
                    <span className="font-medium">{article.author}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" aria-hidden="true" />
                    <time dateTime={article.published_at}>
                      {formatPublishedDate(article.published_at)}
                    </time>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 sm:p-6">
              {/* Article image if available */}
              {article.image_url && (
                <figure className="mb-6 sm:mb-8">
                  <img 
                    src={article.image_url} 
                    alt={`Illustration for ${article.title}`}
                    className="w-full h-auto rounded-lg shadow-sm"
                    onError={(e) => {
                      // Hide image if it fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </figure>
              )}
              
              {/* Article content */}
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <div 
                  className="text-foreground leading-relaxed"
                  style={{ 
                    lineHeight: '1.7',
                    fontSize: window.innerWidth < 640 ? '1rem' : '1.1rem'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: article.content.replace(/\n/g, '<br />') 
                  }}
                />
              </div>
              
              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <section className="mt-6 sm:mt-8 pt-6 border-t" aria-labelledby="article-tags-heading">
                  <h3 id="article-tags-heading" className="text-sm font-medium text-muted-foreground mb-3">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2" role="list" aria-label="Article tags">
                    {article.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-sm" role="listitem">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}
              
              {/* Footer actions */}
              <footer className="mt-6 sm:mt-8 pt-6 border-t">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <Button 
                    variant="outline" 
                    onClick={handleBackToNews}
                    className="min-h-[44px] w-full sm:w-auto"
                    aria-label="Go back to news list"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to News
                  </Button>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleShareArticle}
                      className="min-h-[44px]"
                      aria-label="Share this article"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Article
                    </Button>
                    <Button 
                      onClick={handleOpenOriginal}
                      className="min-h-[44px]"
                      aria-label={`Read original article on ${new URL(article.source_url).hostname}`}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">
                        Read on {new URL(article.source_url).hostname}
                      </span>
                      <span className="sm:hidden">
                        Original
                      </span>
                    </Button>
                  </div>
                </div>
              </footer>
            </CardContent>
          </Card>
        </article>
      </div>
    </main>
  );
};

export default NewsArticle;