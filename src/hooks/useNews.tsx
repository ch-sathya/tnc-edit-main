import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchNews,
  fetchNewsArticle,
  fetchFeaturedNews,
  searchNews,
  clearNewsCache
} from '@/lib/news';
import type { 
  NewsArticle, 
  NewsResponse,
  NewsQueryOptions
} from '@/types/community';
import { toast } from 'sonner';

// Query keys
export const newsKeys = {
  all: ['news'] as const,
  lists: () => [...newsKeys.all, 'list'] as const,
  list: (options?: NewsQueryOptions) => [...newsKeys.lists(), options] as const,
  infinite: (options?: NewsQueryOptions) => [...newsKeys.all, 'infinite', options] as const,
  details: () => [...newsKeys.all, 'detail'] as const,
  detail: (id: string) => [...newsKeys.details(), id] as const,
  featured: () => [...newsKeys.all, 'featured'] as const,
  search: (query: string, options?: NewsQueryOptions) => [...newsKeys.all, 'search', query, options] as const,
};

/**
 * Hook to fetch news articles with pagination
 */
export const useNews = (options: NewsQueryOptions = {}) => {
  return useQuery({
    queryKey: newsKeys.list(options),
    queryFn: () => fetchNews(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on client errors (4xx), but retry on server errors (5xx)
      if (error?.code === 'FETCH_NEWS_ERROR' && failureCount < 3) {
        return true;
      }
      // Retry on network errors
      if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        return failureCount < 3;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

/**
 * Hook to fetch news articles with infinite scroll
 */
export const useInfiniteNews = (options: Omit<NewsQueryOptions, 'offset'> = {}) => {
  return useInfiniteQuery({
    queryKey: newsKeys.infinite(options),
    queryFn: ({ pageParam = 0 }) => {
      return fetchNews({ ...options, offset: pageParam });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * (options.limit || 10);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.code === 'FETCH_NEWS_ERROR' && failureCount < 3) {
        return true;
      }
      return false;
    },
  });
};

/**
 * Hook to fetch a single news article
 */
export const useNewsArticle = (articleId: string) => {
  return useQuery({
    queryKey: newsKeys.detail(articleId),
    queryFn: () => fetchNewsArticle(articleId),
    enabled: !!articleId,
    staleTime: 10 * 60 * 1000, // 10 minutes (articles don't change often)
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error: any) => {
      if (error?.code === 'FETCH_ARTICLE_ERROR' && failureCount < 2) {
        return true;
      }
      return false;
    },
  });
};

/**
 * Hook to fetch featured news articles
 */
export const useFeaturedNews = (limit: number = 5) => {
  return useQuery({
    queryKey: newsKeys.featured(),
    queryFn: () => fetchFeaturedNews(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
    retry: (failureCount, error: any) => {
      if (error?.code === 'FETCH_FEATURED_ERROR' && failureCount < 2) {
        return true;
      }
      return false;
    },
  });
};

/**
 * Hook to search news articles
 */
export const useSearchNews = (query: string, options: Omit<NewsQueryOptions, 'search'> = {}) => {
  return useQuery({
    queryKey: newsKeys.search(query, options),
    queryFn: () => searchNews(query, options),
    enabled: !!query && query.length >= 2, // Only search if query is at least 2 characters
    staleTime: 2 * 60 * 1000, // 2 minutes (search results can be more dynamic)
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.code === 'SEARCH_NEWS_ERROR' && failureCount < 2) {
        return true;
      }
      return false;
    },
  });
};

/**
 * Hook to refresh news cache
 */
export const useRefreshNews = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      clearNewsCache();
      return Promise.resolve();
    },
    onSuccess: () => {
      // Invalidate all news queries to force refetch
      queryClient.invalidateQueries({ queryKey: newsKeys.all });
      toast.success('News feed refreshed successfully!');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to refresh news feed';
      toast.error(message);
    },
  });
};

/**
 * Hook to get news by category
 */
export const useNewsByCategory = (category: string, options: Omit<NewsQueryOptions, 'category'> = {}) => {
  return useQuery({
    queryKey: newsKeys.list({ ...options, category }),
    queryFn: () => fetchNews({ ...options, category }),
    enabled: !!category,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.code === 'FETCH_NEWS_ERROR' && failureCount < 3) {
        return true;
      }
      return false;
    },
  });
};

/**
 * Hook to get loading and error states for news
 */
export const useNewsStatus = (options: NewsQueryOptions = {}) => {
  const { data, isLoading, error, isError, isFetching } = useNews(options);
  
  return {
    articles: data?.articles || [],
    total: data?.total || 0,
    hasMore: data?.hasMore || false,
    isLoading,
    isFetching,
    error,
    isError,
    isEmpty: !isLoading && (!data?.articles || data.articles.length === 0)
  };
};

/**
 * Hook to get loading and error states for infinite news
 */
export const useInfiniteNewsStatus = (options: Omit<NewsQueryOptions, 'offset'> = {}) => {
  const { 
    data, 
    isLoading, 
    error, 
    isError, 
    isFetching, 
    isFetchingNextPage, 
    hasNextPage,
    fetchNextPage 
  } = useInfiniteNews(options);
  
  // Flatten all pages into a single array
  const articles = data?.pages.flatMap(page => page.articles) || [];
  const total = data?.pages[0]?.total || 0;
  
  return {
    articles,
    total,
    hasMore: hasNextPage,
    isLoading,
    isFetching,
    isFetchingNextPage,
    error,
    isError,
    isEmpty: !isLoading && articles.length === 0,
    fetchNextPage
  };
};

/**
 * Hook for prefetching news data (useful for preloading)
 */
export const usePrefetchNews = () => {
  const queryClient = useQueryClient();

  const prefetchNews = (options: NewsQueryOptions = {}) => {
    return queryClient.prefetchQuery({
      queryKey: newsKeys.list(options),
      queryFn: () => fetchNews(options),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchArticle = (articleId: string) => {
    return queryClient.prefetchQuery({
      queryKey: newsKeys.detail(articleId),
      queryFn: () => fetchNewsArticle(articleId),
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchFeatured = (limit: number = 5) => {
    return queryClient.prefetchQuery({
      queryKey: newsKeys.featured(),
      queryFn: () => fetchFeaturedNews(limit),
      staleTime: 10 * 60 * 1000,
    });
  };

  return {
    prefetchNews,
    prefetchArticle,
    prefetchFeatured
  };
};