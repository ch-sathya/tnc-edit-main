import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { 
  useNews, 
  useNewsArticle, 
  useFeaturedNews, 
  useSearchNews,
  useNewsByCategory,
  useNewsStatus,
  useInfiniteNewsStatus
} from '../useNews';
import { clearNewsCache } from '@/lib/news';

// Create a wrapper component for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('News Hooks', () => {
  beforeEach(() => {
    clearNewsCache();
  });

  describe('useNews', () => {
    it('should fetch news articles', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useNews(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.articles).toBeInstanceOf(Array);
      expect(result.current.error).toBeNull();
    });

    it('should fetch news with options', async () => {
      const wrapper = createWrapper();
      const options = { limit: 3, category: 'tech' as const };
      const { result } = renderHook(() => useNews(options), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.articles.length).toBeLessThanOrEqual(3);
      result.current.data?.articles.forEach(article => {
        expect(article.category).toBe('tech');
      });
    });
  });

  describe('useNewsArticle', () => {
    it('should fetch a single article', async () => {
      const wrapper = createWrapper();
      const articleId = '1';
      const { result } = renderHook(() => useNewsArticle(articleId), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.id).toBe(articleId);
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when articleId is empty', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useNewsArticle(''), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useFeaturedNews', () => {
    it('should fetch featured articles', async () => {
      const wrapper = createWrapper();
      const limit = 3;
      const { result } = renderHook(() => useFeaturedNews(limit), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeInstanceOf(Array);
      expect(result.current.data?.length).toBeLessThanOrEqual(limit);
      expect(result.current.error).toBeNull();
    });
  });

  describe('useSearchNews', () => {
    it('should search articles', async () => {
      const wrapper = createWrapper();
      const query = 'React';
      const { result } = renderHook(() => useSearchNews(query), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.articles).toBeInstanceOf(Array);
      expect(result.current.error).toBeNull();
    });

    it('should not search with short query', () => {
      const wrapper = createWrapper();
      const query = 'R'; // Too short
      const { result } = renderHook(() => useSearchNews(query), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should not search with empty query', () => {
      const wrapper = createWrapper();
      const query = '';
      const { result } = renderHook(() => useSearchNews(query), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useNewsByCategory', () => {
    it('should fetch articles by category', async () => {
      const wrapper = createWrapper();
      const category = 'tech';
      const { result } = renderHook(() => useNewsByCategory(category), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      result.current.data?.articles.forEach(article => {
        expect(article.category).toBe(category);
      });
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when category is empty', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useNewsByCategory(''), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useNewsStatus', () => {
    it('should provide status information', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useNewsStatus(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.articles).toEqual([]);
      expect(result.current.isEmpty).toBe(false); // Not empty while loading

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.articles).toBeInstanceOf(Array);
      expect(result.current.total).toBeGreaterThanOrEqual(0);
      expect(result.current.hasMore).toBeDefined();
      expect(result.current.isEmpty).toBe(result.current.articles.length === 0);
    });
  });

  describe('useInfiniteNewsStatus', () => {
    it('should provide infinite scroll status', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useInfiniteNewsStatus(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.articles).toEqual([]);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.articles).toBeInstanceOf(Array);
      expect(result.current.total).toBeGreaterThanOrEqual(0);
      expect(result.current.hasMore).toBeDefined();
      expect(result.current.fetchNextPage).toBeInstanceOf(Function);
    });
  });
});