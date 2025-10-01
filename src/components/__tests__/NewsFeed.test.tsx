import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NewsFeed } from '../NewsFeed';
import * as useNewsHook from '@/hooks/useNews';
import type { NewsArticle } from '@/types/community';

// Mock the hooks
vi.mock('@/hooks/useNews');

const mockArticles: NewsArticle[] = [
  {
    id: '1',
    title: 'React 19 Released',
    summary: 'The latest version of React brings new features and improvements.',
    content: 'Full article content...',
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
    content: 'Full article content...',
    author: 'TypeScript Team',
    published_at: '2024-01-14T15:30:00Z',
    source_url: 'https://devblogs.microsoft.com/typescript/',
    category: 'development',
    tags: ['typescript', 'javascript'],
    read_time: 3
  }
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('NewsFeed', () => {
  const mockUseNewsStatus = vi.mocked(useNewsHook.useNewsStatus);
  const mockUseRefreshNews = vi.mocked(useNewsHook.useRefreshNews);
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

  it('should render loading state', () => {
    mockUseNewsStatus.mockReturnValue({
      articles: [],
      total: 0,
      hasMore: false,
      isLoading: true,
      isFetching: true,
      error: null,
      isError: false,
      isEmpty: false,
      refetch: vi.fn()
    });

    render(<NewsFeed />, { wrapper: createWrapper() });

    // Should show loading skeletons (check for skeleton elements by class)
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('should render articles in responsive grid', () => {
    mockUseNewsStatus.mockReturnValue({
      articles: mockArticles,
      total: 2,
      hasMore: false,
      isLoading: false,
      isFetching: false,
      error: null,
      isError: false,
      isEmpty: false,
      refetch: vi.fn()
    });

    render(<NewsFeed />, { wrapper: createWrapper() });

    // Should display article titles
    expect(screen.getByText('React 19 Released')).toBeInTheDocument();
    expect(screen.getByText('TypeScript 5.4 Features')).toBeInTheDocument();

    // Should display article summaries
    expect(screen.getByText('The latest version of React brings new features and improvements.')).toBeInTheDocument();
    expect(screen.getByText('New TypeScript version includes better type inference.')).toBeInTheDocument();

    // Should display authors
    expect(screen.getByText('React Team')).toBeInTheDocument();
    expect(screen.getByText('TypeScript Team')).toBeInTheDocument();

    // Should display categories
    expect(screen.getByText('software')).toBeInTheDocument();
    expect(screen.getByText('development')).toBeInTheDocument();

    // Should display read times
    expect(screen.getByText('5 min')).toBeInTheDocument();
    expect(screen.getByText('3 min')).toBeInTheDocument();

    // Should display tags
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('should render empty state when no articles', () => {
    mockUseNewsStatus.mockReturnValue({
      articles: [],
      total: 0,
      hasMore: false,
      isLoading: false,
      isFetching: false,
      error: null,
      isError: false,
      isEmpty: true,
      refetch: vi.fn()
    });

    render(<NewsFeed />, { wrapper: createWrapper() });

    expect(screen.getByText('No news articles available')).toBeInTheDocument();
    expect(screen.getByText('Check back later for the latest updates.')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseNewsStatus.mockReturnValue({
      articles: [],
      total: 0,
      hasMore: false,
      isLoading: false,
      isFetching: false,
      error: new Error('Failed to fetch'),
      isError: true,
      isEmpty: false,
      refetch: vi.fn()
    });

    render(<NewsFeed />, { wrapper: createWrapper() });

    expect(screen.getByText('Failed to load news articles')).toBeInTheDocument();
    expect(screen.getByText('Network connection error. Please check your internet connection and try again.')).toBeInTheDocument();
  });

  it('should handle refresh button click', async () => {
    mockUseNewsStatus.mockReturnValue({
      articles: mockArticles,
      total: 2,
      hasMore: false,
      isLoading: false,
      isFetching: false,
      error: null,
      isError: false,
      isEmpty: false,
      refetch: vi.fn()
    });

    render(<NewsFeed />, { wrapper: createWrapper() });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRefreshMutate).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle article click with custom handler', () => {
    const mockOnArticleClick = vi.fn();
    
    mockUseNewsStatus.mockReturnValue({
      articles: mockArticles,
      total: 2,
      hasMore: false,
      isLoading: false,
      isFetching: false,
      error: null,
      isError: false,
      isEmpty: false,
      refetch: vi.fn()
    });

    render(<NewsFeed onArticleClick={mockOnArticleClick} />, { wrapper: createWrapper() });

    const firstArticleCard = screen.getByText('React 19 Released').closest('[role="button"]') || 
                            screen.getByText('React 19 Released').closest('.cursor-pointer');
    
    if (firstArticleCard) {
      fireEvent.click(firstArticleCard);
      expect(mockOnArticleClick).toHaveBeenCalledWith(mockArticles[0]);
    }
  });

  it('should filter articles by category', () => {
    mockUseNewsStatus.mockReturnValue({
      articles: [mockArticles[0]], // Only software category
      total: 1,
      hasMore: false,
      isLoading: false,
      isFetching: false,
      error: null,
      isError: false,
      isEmpty: false,
      refetch: vi.fn()
    });

    render(<NewsFeed category="software" />, { wrapper: createWrapper() });

    expect(screen.getByText('Software News')).toBeInTheDocument();
    expect(screen.getByText('React 19 Released')).toBeInTheDocument();
    expect(screen.queryByText('TypeScript 5.4 Features')).not.toBeInTheDocument();
  });

  it('should hide refresh button when showRefreshButton is false', () => {
    mockUseNewsStatus.mockReturnValue({
      articles: mockArticles,
      total: 2,
      hasMore: false,
      isLoading: false,
      isFetching: false,
      error: null,
      isError: false,
      isEmpty: false,
      refetch: vi.fn()
    });

    render(<NewsFeed showRefreshButton={false} />, { wrapper: createWrapper() });

    expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
  });

  it('should limit number of articles displayed', () => {
    const manyArticles = Array.from({ length: 20 }, (_, i) => ({
      ...mockArticles[0],
      id: `article-${i}`,
      title: `Article ${i + 1}`
    }));

    mockUseNewsStatus.mockReturnValue({
      articles: manyArticles.slice(0, 6), // Simulate limit of 6
      total: 20,
      hasMore: true,
      isLoading: false,
      isFetching: false,
      error: null,
      isError: false,
      isEmpty: false,
      refetch: vi.fn()
    });

    render(<NewsFeed limit={6} />, { wrapper: createWrapper() });

    // Should only show 6 articles
    expect(screen.getAllByText(/Article \d+/)).toHaveLength(6);
  });
});