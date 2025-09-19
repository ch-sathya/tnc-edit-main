# News Integration Guide

This guide explains how to use the news data integration system that was implemented for the community and news pages feature.

## Overview

The news integration provides:
- **Caching Strategy**: Automatic caching with 5-minute TTL to reduce API calls
- **React Query Integration**: Full integration with TanStack Query for state management
- **Error Handling**: Comprehensive error handling with retry mechanisms
- **TypeScript Support**: Full type safety with detailed interfaces
- **Mock Data**: Development-ready with realistic mock data
- **Testing**: Complete test coverage for all functions and hooks

## Architecture

```
src/
├── lib/
│   ├── news.ts              # Core API functions
│   └── __tests__/
│       └── news.test.ts     # API function tests
├── hooks/
│   ├── useNews.tsx          # React Query hooks
│   └── __tests__/
│       └── useNews.test.tsx # Hook tests
├── types/
│   └── community.ts         # News-related TypeScript interfaces
└── components/
    └── NewsExample.tsx      # Example usage component
```

## Core API Functions

### `fetchNews(options?: NewsQueryOptions)`
Fetches news articles with optional filtering and pagination.

```typescript
import { fetchNews } from '@/lib/news';

// Basic usage
const news = await fetchNews();

// With options
const techNews = await fetchNews({
  category: 'tech',
  limit: 10,
  offset: 0
});
```

### `fetchNewsArticle(articleId: string)`
Fetches a single news article by ID.

```typescript
import { fetchNewsArticle } from '@/lib/news';

const article = await fetchNewsArticle('article-id');
```

### `searchNews(query: string, options?)`
Searches news articles by title, summary, or tags.

```typescript
import { searchNews } from '@/lib/news';

const results = await searchNews('React', { limit: 5 });
```

### `fetchFeaturedNews(limit?: number)`
Fetches featured news articles.

```typescript
import { fetchFeaturedNews } from '@/lib/news';

const featured = await fetchFeaturedNews(5);
```

## React Query Hooks

### `useNews(options?: NewsQueryOptions)`
Hook for fetching news with automatic caching and error handling.

```typescript
import { useNews } from '@/hooks/useNews';

function NewsComponent() {
  const { data, isLoading, error } = useNews({
    category: 'tech',
    limit: 10
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.articles.map(article => (
        <div key={article.id}>{article.title}</div>
      ))}
    </div>
  );
}
```

### `useInfiniteNews(options?)`
Hook for infinite scroll functionality.

```typescript
import { useInfiniteNews } from '@/hooks/useNews';

function InfiniteNewsComponent() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteNews({ limit: 10 });

  const articles = data?.pages.flatMap(page => page.articles) || [];

  return (
    <div>
      {articles.map(article => (
        <div key={article.id}>{article.title}</div>
      ))}
      
      {hasNextPage && (
        <button 
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### `useNewsStatus(options?)`
Convenience hook that provides flattened status information.

```typescript
import { useNewsStatus } from '@/hooks/useNews';

function NewsStatusComponent() {
  const { 
    articles, 
    isLoading, 
    error, 
    isEmpty, 
    total, 
    hasMore 
  } = useNewsStatus();

  return (
    <div>
      <p>Total articles: {total}</p>
      <p>Has more: {hasMore ? 'Yes' : 'No'}</p>
      {isEmpty && <p>No articles found</p>}
    </div>
  );
}
```

### `useSearchNews(query: string, options?)`
Hook for searching news articles.

```typescript
import { useSearchNews } from '@/hooks/useNews';
import { useState } from 'react';

function SearchComponent() {
  const [query, setQuery] = useState('');
  const { data, isLoading } = useSearchNews(query, { limit: 5 });

  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search news..."
      />
      
      {isLoading && <div>Searching...</div>}
      
      {data?.articles.map(article => (
        <div key={article.id}>{article.title}</div>
      ))}
    </div>
  );
}
```

### `useRefreshNews()`
Hook for manually refreshing news cache.

```typescript
import { useRefreshNews } from '@/hooks/useNews';

function RefreshButton() {
  const refreshNews = useRefreshNews();

  return (
    <button 
      onClick={() => refreshNews.mutate()}
      disabled={refreshNews.isPending}
    >
      {refreshNews.isPending ? 'Refreshing...' : 'Refresh News'}
    </button>
  );
}
```

## TypeScript Interfaces

### `NewsArticle`
```typescript
interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  published_at: string;
  source_url: string;
  category: 'tech' | 'software' | 'development' | 'industry';
  tags?: string[];
  image_url?: string;
  read_time?: number;
}
```

### `NewsQueryOptions`
```typescript
interface NewsQueryOptions {
  category?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
  tags?: string[];
  cursor?: string;
}
```

### `NewsResponse`
```typescript
interface NewsResponse {
  articles: NewsArticle[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}
```

## Caching Strategy

The news integration includes automatic caching:

- **Cache Duration**: 5 minutes for regular news, 10 minutes for individual articles
- **Cache Keys**: Based on query parameters for efficient invalidation
- **Manual Cache Control**: Use `clearNewsCache()` to clear all cached data

```typescript
import { clearNewsCache, getNewsCacheStats } from '@/lib/news';

// Clear all cached news data
clearNewsCache();

// Get cache statistics (for debugging)
const stats = getNewsCacheStats();
console.log(`Cache size: ${stats.size} entries`);
```

## Error Handling

All functions and hooks include comprehensive error handling:

```typescript
import { useNews } from '@/hooks/useNews';

function NewsWithErrorHandling() {
  const { data, error, isError } = useNews();

  if (isError) {
    return (
      <div className="error">
        <h3>Failed to load news</h3>
        <p>{error?.message}</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  // ... rest of component
}
```

## Integration with Real News APIs

To replace the mock data with a real news API:

1. **Update `fetchNews` function** in `src/lib/news.ts`:
```typescript
export const fetchNews = async (options: NewsQueryOptions = {}): Promise<NewsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (options.category) queryParams.set('category', options.category);
    if (options.limit) queryParams.set('limit', options.limit.toString());
    // ... add other parameters

    const response = await fetch(`${NEWS_API_URL}/articles?${queryParams}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return transformApiResponse(data); // Transform to match NewsResponse interface
  } catch (error) {
    throw new NewsErrorClass({
      message: 'Failed to fetch news articles',
      code: 'FETCH_NEWS_ERROR',
      details: error
    });
  }
};
```

2. **Add environment variables** for API configuration:
```env
VITE_NEWS_API_URL=https://api.example.com/v1
VITE_NEWS_API_KEY=your-api-key
```

3. **Update other functions** similarly to use real API endpoints.

## Popular News APIs

Consider these APIs for real news integration:

- **NewsAPI**: General news with category filtering
- **Hacker News API**: Tech-focused news and discussions
- **Dev.to API**: Developer community articles
- **Reddit API**: Programming subreddits
- **GitHub API**: Repository releases and trending projects

## Performance Considerations

- **Caching**: Automatic caching reduces API calls and improves performance
- **Pagination**: Use `limit` and `offset` for large datasets
- **Infinite Scroll**: Use `useInfiniteNews` for better UX with large lists
- **Prefetching**: Use `usePrefetchNews` to preload data
- **Error Boundaries**: Implement error boundaries for graceful error handling

## Testing

The integration includes comprehensive tests:

```bash
# Run news API tests
npm test src/lib/__tests__/news.test.ts

# Run news hooks tests  
npm test src/hooks/__tests__/useNews.test.tsx

# Run all tests
npm test
```

## Example Usage

See `src/components/NewsExample.tsx` for a complete example of how to use the news integration in a React component with proper loading states, error handling, and user interactions.