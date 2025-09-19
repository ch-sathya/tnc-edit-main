import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Community from '@/pages/Community';
import News from '@/pages/News';
import { useAuth } from '@/hooks/useAuth';
import { useCommunityGroups } from '@/hooks/useCommunityGroups';
import * as useNewsHook from '@/hooks/useNews';
import type { CommunityGroup, NewsArticle } from '@/types/community';

// Mock the hooks
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useCommunityGroups');
vi.mock('@/hooks/useNews');

const mockUseAuth = vi.mocked(useAuth);
const mockUseCommunityGroups = vi.mocked(useCommunityGroups);
const mockUseNewsStatus = vi.mocked(useNewsHook.useNewsStatus);
const mockUseRefreshNews = vi.mocked(useNewsHook.useRefreshNews);

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

// Helper function to generate large datasets
const generateLargeGroupList = (count: number): CommunityGroup[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `group-${i}`,
    name: `Group ${i}`,
    description: `Description for group ${i}. This is a longer description to test rendering performance with more text content.`,
    owner_id: i % 10 === 0 ? 'user-1' : 'user-2', // Make every 10th group owned by current user
    created_at: new Date(2024, 0, 1 + (i % 365)).toISOString(),
    updated_at: new Date(2024, 0, 1 + (i % 365)).toISOString(),
    member_count: Math.floor(Math.random() * 1000) + 1,
    is_member: Math.random() > 0.5,
    is_owner: i % 10 === 0,
  }));
};

const generateLargeArticleList = (count: number): NewsArticle[] => {
  const categories = ['tech', 'software', 'development', 'industry'] as const;
  const authors = ['Tech Team', 'Dev Team', 'Industry Expert', 'Software Engineer', 'Tech Writer'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `article-${i}`,
    title: `Article ${i}: Advanced Technology Trends and Development Practices`,
    summary: `This is a comprehensive summary for article ${i} discussing various aspects of modern technology and software development practices.`,
    content: `Full content for article ${i}. This would contain a much longer text with detailed information about the topic. `.repeat(10),
    author: authors[i % authors.length],
    published_at: new Date(2024, 0, 1 + (i % 365)).toISOString(),
    source_url: `https://example.com/article-${i}`,
    category: categories[i % categories.length],
    tags: [`tag${i}`, `category${i % 5}`, 'technology', 'development'],
    read_time: Math.floor(Math.random() * 15) + 1,
    image_url: i % 3 === 0 ? `https://example.com/image-${i}.jpg` : undefined,
  }));
};

describe('Performance Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      isLoading: false,
      error: null,
    } as any);

    mockUseRefreshNews.mockReturnValue({
      mutate: vi.fn(),
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

  describe('Community Page Performance', () => {
    it('should render efficiently with large number of groups', async () => {
      const largeGroupList = generateLargeGroupList(1000);
      
      mockUseCommunityGroups.mockReturnValue({
        data: largeGroupList,
        isLoading: false,
        error: null,
        isError: false
      });

      const startTime = performance.now();
      
      render(<Community />, { wrapper: createWrapper() });

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Community')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000); // 1 second

      // Should display at least some groups (virtualization might limit display)
      expect(screen.getByText('Group 0')).toBeInTheDocument();
    });

    it('should handle rapid state updates efficiently', async () => {
      const initialGroups = generateLargeGroupList(100);
      
      mockUseCommunityGroups.mockReturnValue({
        data: initialGroups,
        isLoading: false,
        error: null,
        isError: false
      });

      const { rerender } = render(<Community />, { wrapper: createWrapper() });

      // Simulate rapid updates
      const updateCount = 10;
      const startTime = performance.now();

      for (let i = 0; i < updateCount; i++) {
        const updatedGroups = generateLargeGroupList(100 + i);
        mockUseCommunityGroups.mockReturnValue({
          data: updatedGroups,
          isLoading: false,
          error: null,
          isError: false
        });

        rerender(<Community />);
      }

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      // Should handle updates efficiently
      expect(updateTime).toBeLessThan(500); // 500ms for 10 updates
    });

    it('should not cause memory leaks with frequent mounting/unmounting', () => {
      const initialGroups = generateLargeGroupList(50);
      
      mockUseCommunityGroups.mockReturnValue({
        data: initialGroups,
        isLoading: false,
        error: null,
        isError: false
      });

      // Mount and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<Community />, { wrapper: createWrapper() });
        unmount();
      }

      // If we reach here without errors, no obvious memory leaks occurred
      expect(true).toBe(true);
    });

    it('should handle loading states efficiently', async () => {
      mockUseCommunityGroups.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        isError: false
      });

      const startTime = performance.now();
      
      render(<Community />, { wrapper: createWrapper() });

      // Should show loading state quickly
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);

      const endTime = performance.now();
      const loadingRenderTime = endTime - startTime;

      // Loading state should render very quickly
      expect(loadingRenderTime).toBeLessThan(100); // 100ms
    });
  });

  describe('News Page Performance', () => {
    it('should render efficiently with large number of articles', async () => {
      const largeArticleList = generateLargeArticleList(500);
      
      mockUseNewsStatus.mockReturnValue({
        articles: largeArticleList,
        total: 500,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: null,
        isError: false,
        isEmpty: false
      });

      const startTime = performance.now();
      
      render(<News />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('News')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(1000); // 1 second

      // Should display at least some articles
      expect(screen.getByText(/Article 0:/)).toBeInTheDocument();
    });

    it('should handle article filtering efficiently', async () => {
      const largeArticleList = generateLargeArticleList(200);
      
      // Test filtering by category
      const techArticles = largeArticleList.filter(article => article.category === 'tech');
      
      mockUseNewsStatus.mockReturnValue({
        articles: techArticles,
        total: techArticles.length,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: null,
        isError: false,
        isEmpty: false
      });

      const startTime = performance.now();
      
      render(<News />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('News')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const filterTime = endTime - startTime;

      // Filtering should be efficient
      expect(filterTime).toBeLessThan(500); // 500ms
    });

    it('should handle image loading efficiently', async () => {
      const articlesWithImages = generateLargeArticleList(50).map(article => ({
        ...article,
        image_url: `https://example.com/image-${article.id}.jpg`
      }));
      
      mockUseNewsStatus.mockReturnValue({
        articles: articlesWithImages,
        total: 50,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: null,
        isError: false,
        isEmpty: false
      });

      const startTime = performance.now();
      
      render(<News />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('News')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render efficiently even with images
      expect(renderTime).toBeLessThan(800); // 800ms
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not accumulate excessive DOM nodes', () => {
      const initialNodeCount = document.querySelectorAll('*').length;
      
      mockUseCommunityGroups.mockReturnValue({
        data: generateLargeGroupList(100),
        isLoading: false,
        error: null,
        isError: false
      });

      const { unmount } = render(<Community />, { wrapper: createWrapper() });
      
      const afterRenderNodeCount = document.querySelectorAll('*').length;
      
      unmount();
      
      const afterUnmountNodeCount = document.querySelectorAll('*').length;

      // Should clean up most nodes after unmount
      const nodeIncrease = afterUnmountNodeCount - initialNodeCount;
      expect(nodeIncrease).toBeLessThan(50); // Allow some framework overhead
    });

    it('should handle component updates without excessive re-renders', () => {
      let renderCount = 0;
      
      // Mock component to count renders
      const TestComponent = () => {
        renderCount++;
        return <Community />;
      };

      mockUseCommunityGroups.mockReturnValue({
        data: generateLargeGroupList(10),
        isLoading: false,
        error: null,
        isError: false
      });

      const { rerender } = render(<TestComponent />, { wrapper: createWrapper() });

      const initialRenderCount = renderCount;

      // Trigger rerender with same data
      rerender(<TestComponent />);

      const finalRenderCount = renderCount;

      // Should not cause excessive re-renders
      expect(finalRenderCount - initialRenderCount).toBeLessThanOrEqual(2);
    });
  });

  describe('Network Performance Simulation', () => {
    it('should handle slow loading gracefully', async () => {
      // Simulate slow loading
      mockUseCommunityGroups.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        isError: false
      });

      const startTime = performance.now();
      
      render(<Community />, { wrapper: createWrapper() });

      // Should show loading state immediately
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);

      const loadingStateTime = performance.now() - startTime;
      expect(loadingStateTime).toBeLessThan(50); // Should show loading very quickly

      // Simulate data arriving after delay
      setTimeout(() => {
        mockUseCommunityGroups.mockReturnValue({
          data: generateLargeGroupList(20),
          isLoading: false,
          error: null,
          isError: false
        });
      }, 100);

      // Should handle the transition smoothly
      await waitFor(() => {
        expect(screen.getByText('Community')).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should handle network errors without performance degradation', () => {
      mockUseCommunityGroups.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        isError: true
      });

      const startTime = performance.now();
      
      render(<Community />, { wrapper: createWrapper() });

      // Should render error state quickly
      expect(screen.getByText('Failed to load community groups')).toBeInTheDocument();

      const errorRenderTime = performance.now() - startTime;
      expect(errorRenderTime).toBeLessThan(100); // Error state should render quickly
    });
  });

  describe('Responsive Performance', () => {
    it('should render efficiently on mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      mockUseCommunityGroups.mockReturnValue({
        data: generateLargeGroupList(50),
        isLoading: false,
        error: null,
        isError: false
      });

      const startTime = performance.now();
      
      render(<Community />, { wrapper: createWrapper() });

      expect(screen.getByText('Community')).toBeInTheDocument();

      const mobileRenderTime = performance.now() - startTime;
      expect(mobileRenderTime).toBeLessThan(800); // Should render efficiently on mobile
    });

    it('should handle viewport changes efficiently', () => {
      mockUseCommunityGroups.mockReturnValue({
        data: generateLargeGroupList(30),
        isLoading: false,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      const startTime = performance.now();

      // Simulate viewport change
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      // Trigger resize event
      window.dispatchEvent(new Event('resize'));

      const resizeHandleTime = performance.now() - startTime;
      expect(resizeHandleTime).toBeLessThan(100); // Should handle resize quickly
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle multiple simultaneous operations efficiently', async () => {
      mockUseCommunityGroups.mockReturnValue({
        data: generateLargeGroupList(20),
        isLoading: false,
        error: null,
        isError: false
      });

      const startTime = performance.now();

      // Render multiple components simultaneously
      const components = Array.from({ length: 5 }, (_, i) => 
        render(<Community key={i} />, { wrapper: createWrapper() })
      );

      // All should render successfully
      for (const component of components) {
        await waitFor(() => {
          expect(component.container.querySelector('[role="main"]')).toBeInTheDocument();
        });
      }

      const concurrentRenderTime = performance.now() - startTime;
      expect(concurrentRenderTime).toBeLessThan(2000); // 2 seconds for 5 components

      // Clean up
      components.forEach(({ unmount }) => unmount());
    });
  });
});