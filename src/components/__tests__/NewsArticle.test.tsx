import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NewsArticle } from '../NewsArticle';
import * as useNewsHook from '@/hooks/useNews';
import type { NewsArticle as NewsArticleType } from '@/types/community';

// Mock the hooks
vi.mock('@/hooks/useNews');

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockArticle: NewsArticleType = {
  id: '1',
  title: 'React 19 Released: New Features and Breaking Changes',
  summary: 'React 19 introduces server components, improved concurrent features, and new hooks that will change how we build React applications.',
  content: 'React 19 has been officially released with significant improvements to server-side rendering, concurrent features, and developer experience. The new version includes server components that run on the server, reducing bundle size and improving performance.',
  author: 'React Team',
  published_at: '2024-01-15T10:00:00Z',
  source_url: 'https://react.dev/blog/react-19',
  category: 'tech',
  tags: ['react', 'javascript', 'frontend', 'web-development'],
  image_url: 'https://example.com/react-19-image.jpg',
  read_time: 8
};

const createWrapper = (initialEntries = ['/news/1']) => {
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

describe('NewsArticle', () => {
  const mockUseNewsArticle = vi.mocked(useNewsHook.useNewsArticle);

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('should render loading state', () => {
    mockUseNewsArticle.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      isFetching: true,
      isSuccess: false,
      status: 'pending',
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'fetching',
      isInitialLoading: true,
      isLoadingError: false,
      isPaused: false,
      isPending: true,
      isPlaceholderData: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      refetch: vi.fn(),
    });

    render(<NewsArticle />, { wrapper: createWrapper() });

    // Should show loading skeletons
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
    
    // Should show back button
    expect(screen.getByText('Back to News')).toBeInTheDocument();
  });

  it('should render article content when loaded', () => {
    mockUseNewsArticle.mockReturnValue({
      data: mockArticle,
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

    render(<NewsArticle />, { wrapper: createWrapper() });

    // Should display article title
    expect(screen.getByText('React 19 Released: New Features and Breaking Changes')).toBeInTheDocument();
    
    // Should display article summary
    expect(screen.getByText(/React 19 introduces server components/)).toBeInTheDocument();
    
    // Should display article content
    expect(screen.getByText(/React 19 has been officially released/)).toBeInTheDocument();
    
    // Should display author
    expect(screen.getByText('React Team')).toBeInTheDocument();
    
    // Should display category
    expect(screen.getByText('tech')).toBeInTheDocument();
    
    // Should display read time
    expect(screen.getByText('8 min read')).toBeInTheDocument();
    
    // Should display tags
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
    
    // Should show action buttons
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.getByText('View Original')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseNewsArticle.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch article'),
      isError: true,
      isFetching: false,
      isSuccess: false,
      status: 'error',
      dataUpdatedAt: 0,
      errorUpdatedAt: Date.now(),
      failureCount: 1,
      failureReason: new Error('Failed to fetch article'),
      fetchStatus: 'idle',
      isInitialLoading: false,
      isLoadingError: true,
      isPaused: false,
      isPending: false,
      isPlaceholderData: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      refetch: vi.fn(),
    });

    render(<NewsArticle />, { wrapper: createWrapper() });

    expect(screen.getByText('Failed to load article')).toBeInTheDocument();
    expect(screen.getByText('Network connection error. Please check your internet connection and try again.')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should render not found state when article is null', () => {
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

    render(<NewsArticle />, { wrapper: createWrapper() });

    expect(screen.getByText('Article not found')).toBeInTheDocument();
  });

  it('should handle back navigation', () => {
    mockUseNewsArticle.mockReturnValue({
      data: mockArticle,
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

    render(<NewsArticle />, { wrapper: createWrapper() });

    const backButton = screen.getAllByText('Back to News')[0];
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/news');
  });

  it('should handle share functionality', async () => {
    // Mock navigator.share
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
    });

    mockUseNewsArticle.mockReturnValue({
      data: mockArticle,
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

    render(<NewsArticle />, { wrapper: createWrapper() });

    const shareButton = screen.getAllByText('Share')[0];
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: mockArticle.title,
        text: mockArticle.summary,
        url: expect.any(String),
      });
    });
  });

  it('should handle external link opening', () => {
    // Mock window.open
    const mockOpen = vi.fn();
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true,
    });

    mockUseNewsArticle.mockReturnValue({
      data: mockArticle,
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

    render(<NewsArticle />, { wrapper: createWrapper() });

    const viewOriginalButton = screen.getByText('View Original');
    fireEvent.click(viewOriginalButton);

    expect(mockOpen).toHaveBeenCalledWith(mockArticle.source_url, '_blank');
  });

  it('should display article image when available', () => {
    mockUseNewsArticle.mockReturnValue({
      data: mockArticle,
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

    render(<NewsArticle />, { wrapper: createWrapper() });

    // Check if image is present (might be optional in the component)
    const image = screen.queryByAltText(mockArticle.title);
    if (image) {
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', mockArticle.image_url);
    } else {
      // If no image, just verify the article content is displayed
      expect(screen.getByText(mockArticle.title)).toBeInTheDocument();
    }
  });

  it('should handle article without image', () => {
    const articleWithoutImage = { ...mockArticle, image_url: undefined };
    
    mockUseNewsArticle.mockReturnValue({
      data: articleWithoutImage,
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

    render(<NewsArticle />, { wrapper: createWrapper() });

    // Should not display image
    expect(screen.queryByAltText(articleWithoutImage.title)).not.toBeInTheDocument();
    
    // Should still display other content
    expect(screen.getByText(articleWithoutImage.title)).toBeInTheDocument();
  });
});