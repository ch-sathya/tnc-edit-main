import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import News from '@/pages/News';
import { NewsArticle } from '@/components/NewsArticle';
import * as useNewsHook from '@/hooks/useNews';
import type { NewsArticle as NewsArticleType } from '@/types/community';

// Mock the hooks
vi.mock('@/hooks/useNews');

const mockUseNewsStatus = vi.mocked(useNewsHook.useNewsStatus);
const mockUseRefreshNews = vi.mocked(useNewsHook.useRefreshNews);
const mockUseNewsArticle = vi.mocked(useNewsHook.useNewsArticle);

const mockArticles: NewsArticleType[] = [
  {
    id: '1',
    title: 'React 19 Released',
    summary: 'The latest version of React brings new features and improvements.',
    content: 'React 19 has been officially released with significant improvements...',
    author: 'React Team',
    published_at: '2024-01-15T10:00:00Z',
    source_url: 'https://react.dev/blog/react-19',
    category: 'software',
    tags: ['react', 'javascript', 'frontend'],
    read_time: 5
  },
  {
    id: '2',
    title: 'TypeScript 5.4 Features',
    summary: 'New TypeScript version includes better type inference.',
    content: 'TypeScript 5.4 introduces several new features...',
    author: 'TypeScript Team',
    published_at: '2024-01-14T15:30:00Z',
    source_url: 'https://devblogs.microsoft.com/typescript/',
    category: 'development',
    tags: ['typescript', 'javascript'],
    read_time: 3
  },
  {
    id: '3',
    title: 'Vue 3.4 Performance Improvements',
    summary: 'Vue.js 3.4 brings significant performance enhancements.',
    content: 'The latest Vue.js release focuses on performance...',
    author: 'Vue Team',
    published_at: '2024-01-13T09:00:00Z',
    source_url: 'https://vuejs.org/blog/vue-3-4',
    category: 'tech',
    tags: ['vue', 'javascript', 'performance'],
    read_time: 4
  }
];

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createWrapper = (initialEntries = ['/news']) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('News Integration Tests', () => {
  const mockRefreshMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseRefreshNews.mockReturnValue({
      mutate: mockRefreshMutate,
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      status: 'idle',
      variables: undefined,
      context: undefined,
      submittedAt: 0,
      mutateAsync: vi.fn(),
      reset: vi.fn()
    });
  });

  describe('News Feed Workflow', () => {
    it('should display news articles and handle refresh', async () => {
      const user = userEvent.setup();
      
      mockUseNewsStatus.mockReturnValue({
        articles: mockArticles,
        total: 3,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: null,
        isError: false,
        isEmpty: false
      });

      render(<News />, { wrapper: createWrapper() });

      // Should display all articles
      expect(screen.getByText('React 19 Released')).toBeInTheDocument();
      expect(screen.getByText('TypeScript 5.4 Features')).toBeInTheDocument();
      expect(screen.getByText('Vue 3.4 Performance Improvements')).toBeInTheDocument();

      // Should display article metadata
      expect(screen.getByText('React Team')).toBeInTheDocument();
      expect(screen.getByText('5 min')).toBeInTheDocument();
      expect(screen.getByText('software')).toBeInTheDocument();

      // Test refresh functionality
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockRefreshMutate).toHaveBeenCalledTimes(1);
    });

    it('should handle loading state', () => {
      mockUseNewsStatus.mockReturnValue({
        articles: [],
        total: 0,
        hasMore: false,
        isLoading: true,
        isFetching: true,
        error: null,
        isError: false,
        isEmpty: false
      });

      render(<News />, { wrapper: createWrapper() });

      // Should show loading skeletons
      const skeletonElements = document.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('should handle empty state', () => {
      mockUseNewsStatus.mockReturnValue({
        articles: [],
        total: 0,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: null,
        isError: false,
        isEmpty: true
      });

      render(<News />, { wrapper: createWrapper() });

      expect(screen.getByText('No news articles available')).toBeInTheDocument();
      expect(screen.getByText('Check back later for the latest updates.')).toBeInTheDocument();
    });

    it('should handle error state with retry', async () => {
      const user = userEvent.setup();
      
      mockUseNewsStatus.mockReturnValue({
        articles: [],
        total: 0,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: new Error('Failed to fetch news'),
        isError: true,
        isEmpty: false
      });

      render(<News />, { wrapper: createWrapper() });

      expect(screen.getByText('Failed to load news articles')).toBeInTheDocument();
      expect(screen.getByText('Network connection error. Please check your internet connection and try again.')).toBeInTheDocument();

      // Should have retry button
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      expect(mockRefreshMutate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Article Detail Workflow', () => {
    it('should display article details and handle navigation', async () => {
      const user = userEvent.setup();
      
      mockUseNewsArticle.mockReturnValue({
        data: mockArticles[0],
        isLoading: false,
        error: null,
        isError: false,
        isFetching: false,
        isSuccess: true,
        status: 'success',
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        fetchStatus: 'idle',
        isInitialLoading: false,
        isLoadingError: false,
        isPaused: false,
        isPending: false,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        refetch: vi.fn(),
      });

      render(<NewsArticle />, { wrapper: createWrapper(['/news/1']) });

      // Should display full article content
      expect(screen.getByText('React 19 Released')).toBeInTheDocument();
      expect(screen.getByText(/React 19 has been officially released/)).toBeInTheDocument();
      expect(screen.getByText('React Team')).toBeInTheDocument();
      expect(screen.getByText('5 min read')).toBeInTheDocument();

      // Test back navigation
      const backButton = screen.getAllByText('Back to News')[0];
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/news');
    });

    it('should handle article sharing', async () => {
      const user = userEvent.setup();
      
      // Mock navigator.share
      const mockShare = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true,
      });

      mockUseNewsArticle.mockReturnValue({
        data: mockArticles[0],
        isLoading: false,
        error: null,
        isError: false,
        isFetching: false,
        isSuccess: true,
        status: 'success',
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        fetchStatus: 'idle',
        isInitialLoading: false,
        isLoadingError: false,
        isPaused: false,
        isPending: false,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        refetch: vi.fn(),
      });

      render(<NewsArticle />, { wrapper: createWrapper(['/news/1']) });

      const shareButton = screen.getAllByText('Share')[0];
      await user.click(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: mockArticles[0].title,
          text: mockArticles[0].summary,
          url: expect.any(String),
        });
      });
    });

    it('should handle external link opening', async () => {
      const user = userEvent.setup();
      
      // Mock window.open
      const mockOpen = vi.fn();
      Object.defineProperty(window, 'open', {
        value: mockOpen,
        writable: true,
      });

      mockUseNewsArticle.mockReturnValue({
        data: mockArticles[0],
        isLoading: false,
        error: null,
        isError: false,
        isFetching: false,
        isSuccess: true,
        status: 'success',
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        fetchStatus: 'idle',
        isInitialLoading: false,
        isLoadingError: false,
        isPaused: false,
        isPending: false,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        refetch: vi.fn(),
      });

      render(<NewsArticle />, { wrapper: createWrapper(['/news/1']) });

      const viewOriginalButton = screen.getByText('View Original');
      await user.click(viewOriginalButton);

      expect(mockOpen).toHaveBeenCalledWith(mockArticles[0].source_url, '_blank');
    });

    it('should handle article not found', () => {
      mockUseNewsArticle.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        isError: false,
        isFetching: false,
        isSuccess: true,
        status: 'success',
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        fetchStatus: 'idle',
        isInitialLoading: false,
        isLoadingError: false,
        isPaused: false,
        isPending: false,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        refetch: vi.fn(),
      });

      render(<NewsArticle />, { wrapper: createWrapper(['/news/999']) });

      expect(screen.getByText('Article not found')).toBeInTheDocument();
    });

    it('should handle article loading error', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();
      
      mockUseNewsArticle.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load article'),
        isError: true,
        isFetching: false,
        isSuccess: false,
        status: 'error',
        dataUpdatedAt: 0,
        errorUpdatedAt: Date.now(),
        failureCount: 1,
        failureReason: new Error('Failed to load article'),
        fetchStatus: 'idle',
        isInitialLoading: false,
        isLoadingError: true,
        isPaused: false,
        isPending: false,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        refetch: mockRefetch,
      });

      render(<NewsArticle />, { wrapper: createWrapper(['/news/1']) });

      expect(screen.getAllByText('Failed to load article')[0]).toBeInTheDocument();
      
      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('News Category Filtering', () => {
    it('should filter articles by category', () => {
      const techArticles = mockArticles.filter(article => article.category === 'tech');
      
      mockUseNewsStatus.mockReturnValue({
        articles: techArticles,
        total: 1,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: null,
        isError: false,
        isEmpty: false
      });

      render(<News />, { wrapper: createWrapper() });

      // Should only show tech articles
      expect(screen.getByText('Vue 3.4 Performance Improvements')).toBeInTheDocument();
      expect(screen.queryByText('React 19 Released')).not.toBeInTheDocument();
      expect(screen.queryByText('TypeScript 5.4 Features')).not.toBeInTheDocument();
    });
  });

  describe('News Refresh Workflow', () => {
    it('should handle refresh with loading state', async () => {
      const user = userEvent.setup();
      
      // Start with articles loaded
      mockUseNewsStatus.mockReturnValue({
        articles: mockArticles,
        total: 3,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: null,
        isError: false,
        isEmpty: false
      });

      render(<News />, { wrapper: createWrapper() });

      // Click refresh
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Mock loading state during refresh
      mockUseRefreshNews.mockReturnValue({
        mutate: mockRefreshMutate,
        isPending: true,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
        failureCount: 0,
        failureReason: null,
        isIdle: false,
        isPaused: false,
        status: 'pending',
        variables: undefined,
        context: undefined,
        submittedAt: Date.now(),
        mutateAsync: vi.fn(),
        reset: vi.fn()
      });

      expect(mockRefreshMutate).toHaveBeenCalledTimes(1);
    });

    it('should handle refresh errors', async () => {
      const user = userEvent.setup();
      
      mockUseNewsStatus.mockReturnValue({
        articles: mockArticles,
        total: 3,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: null,
        isError: false,
        isEmpty: false
      });

      // Mock refresh error
      mockUseRefreshNews.mockReturnValue({
        mutate: mockRefreshMutate,
        isPending: false,
        isError: true,
        error: new Error('Refresh failed'),
        data: undefined,
        isSuccess: false,
        failureCount: 1,
        failureReason: new Error('Refresh failed'),
        isIdle: false,
        isPaused: false,
        status: 'error',
        variables: undefined,
        context: undefined,
        submittedAt: Date.now(),
        mutateAsync: vi.fn(),
        reset: vi.fn()
      });

      render(<News />, { wrapper: createWrapper() });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Should handle error gracefully (articles should still be visible)
      expect(screen.getByText('React 19 Released')).toBeInTheDocument();
    });
  });

  describe('Accessibility and Navigation', () => {
    it('should have proper keyboard navigation', async () => {
      const user = userEvent.setup();
      
      mockUseNewsStatus.mockReturnValue({
        articles: mockArticles,
        total: 3,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: null,
        isError: false,
        isEmpty: false
      });

      render(<News />, { wrapper: createWrapper() });

      // Test keyboard navigation on back button
      const backButton = screen.getByRole('button', { name: /go back to home page/i });
      backButton.focus();
      await user.keyboard('{Enter}');

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should have proper ARIA labels and roles', () => {
      mockUseNewsStatus.mockReturnValue({
        articles: mockArticles,
        total: 3,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: null,
        isError: false,
        isEmpty: false
      });

      render(<News />, { wrapper: createWrapper() });

      // Check for proper roles and labels
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: /page navigation/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go back to home page/i })).toBeInTheDocument();
    });
  });
});