import React from 'react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NewsFeed } from '@/components/NewsFeed';
import NewsErrorBoundary from '@/components/NewsErrorBoundary';
const News = () => {
  const navigate = useNavigate();
  return <>
      <Navigation />
      <NewsErrorBoundary feature="feed">
        <main className="min-h-screen bg-background p-3 sm:p-6" role="main">
        <div className="max-w-7xl mx-auto">
          
          
          <header className="mb-6 sm:mb-8">
            
            
          </header>
          
          {/* News feed component */}
          <NewsFeed limit={12} showRefreshButton={true} />
        </div>
      </main>
      </NewsErrorBoundary>
    </>;
};
export default News;