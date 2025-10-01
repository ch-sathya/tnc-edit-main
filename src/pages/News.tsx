import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NewsFeed } from '@/components/NewsFeed';
import NewsErrorBoundary from '@/components/NewsErrorBoundary';

const News = () => {
  const navigate = useNavigate();

  return (
    <NewsErrorBoundary feature="feed">
      <main className="min-h-screen bg-background p-3 sm:p-6" role="main">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-4 mb-6" role="navigation" aria-label="Page navigation">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              aria-label="Go back to home page"
              className="min-h-[44px] min-w-[44px]" // Ensure minimum touch target size
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </nav>
          
          <header className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">News</h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Stay updated with the latest in technology and software development
            </p>
          </header>
          
          {/* News feed component */}
          <NewsFeed 
            limit={12}
            showRefreshButton={true}
          />
        </div>
      </main>
    </NewsErrorBoundary>
  );
};

export default News;