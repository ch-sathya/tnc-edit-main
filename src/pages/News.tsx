import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NewsFeed } from '@/components/NewsFeed';
import NewsErrorBoundary from '@/components/NewsErrorBoundary';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
const News = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState('all');
  const categories = [
    { value: 'all', label: 'All news' },
    { value: 'ai', label: 'AI industry' },
    { value: 'tech', label: 'Technology' },
    { value: 'software', label: 'Software' },
    { value: 'development', label: 'Development' },
  ];
  return <>
      <Navigation />
      <NewsErrorBoundary feature="feed">
        <main className="min-h-screen bg-transparent p-3 sm:p-6" role="main">
        <div className="max-w-7xl mx-auto">
          
          
          <header className="mb-6 sm:mb-8">
            <h1 className="text-3xl font-semibold">Technology & AI News</h1>
            <p className="mt-2 text-muted-foreground">Latest stories from technology, software, and AI sources.</p>
          </header>

          <Tabs value={category} onValueChange={setCategory} className="mb-6">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
              {categories.map(item => (
                <TabsTrigger key={item.value} value={item.value} className="min-h-10">
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* News feed component */}
          <NewsFeed limit={12} category={category} showRefreshButton={true} />
        </div>
      </main>
      </NewsErrorBoundary>
    </>;
};
export default News;