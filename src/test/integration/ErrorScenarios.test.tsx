import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Community from '@/pages/Community';
import News from '@/pages/News';
import { useAuth } from '@/hooks/useAuth';
import { useCommunityGroups } from '@/hooks/useCommunityGroups';
import * as useNewsHook from '@/hooks/useNews';

// Mock the hooks
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useCommunityGroups');
vi.mock('@/hooks/useNews');

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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

describe('Error Scenarios Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Network Error Handling', () => {
    it('should handle network timeouts gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isLoading: false,
        error: null,
      } as any);

      mockUseCommunityGroups.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Request timeout'),
        isError: true
      });

      render(<Community />, { wrapper: createWrapper() });

      expect(screen.getByText('Failed to load community groups')).toBeInTheDocument();
      expect(screen.getByText('Network connection error. Please check your internet connection and try again.')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should handle server errors (500) appropriately', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isLoading: false,
        error: null,
      } as any);

      mockUseCommunityGroups.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Internal Server Error'),
        isError: true
      });

      render(<Community />, { wrapper: createWrapper() });

      expect(screen.getByText('Failed to load community groups')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should handle news API failures', () => {
      mockUseNewsStatus.mockReturnValue({
        articles: [],
        total: 0,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: new Error('API rate limit exceeded'),
        isError: true,
        isEmpty: false
      });

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

      render(<News />, { wrapper: createWrapper() });

      expect(screen.getByText('Failed to load news articles')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  describe('Authentication Error Scenarios', () => {
    it('should handle expired authentication tokens', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        error: new Error('Token expired'),
      } as any);

      mockUseCommunityGroups.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Should show sign-in prompt instead of create group button
      expect(screen.getByText('Sign in to create groups')).toBeInTheDocument();
    });

    it('should handle authentication loading states', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        error: null,
      } as any);

      mockUseCommunityGroups.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Should show loading state or disabled buttons
      expect(screen.getByText('Community')).toBeInTheDocument();
    });
  });

  describe('Data Consistency Error Scenarios', () => {
    it('should handle malformed community group data', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isLoading: false,
        error: null,
      } as any);

      // Mock malformed data
      const malformedGroups = [
        {
          id: 'group-1',
          name: null, // Invalid name
          description: 'Valid description',
          owner_id: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          member_count: 5,
          is_member: true,
          is_owner: true,
        }
      ];

      mockUseCommunityGroups.mockReturnValue({
        data: malformedGroups as any,
        isLoading: false,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Should handle gracefully, possibly showing error or filtering out invalid data
      expect(screen.getByText('Community')).toBeInTheDocument();
    });

    it('should handle malformed news article data', () => {
      const malformedArticles = [
        {
          id: '1',
          title: '', // Empty title
          summary: 'Valid summary',
          content: 'Valid content',
          author: null, // Invalid author
          published_at: 'invalid-date',
          source_url: 'not-a-url',
          category: 'tech',
          tags: ['react'],
          read_time: -1 // Invalid read time
        }
      ];

      mockUseNewsStatus.mockReturnValue({
        articles: malformedArticles as any,
        total: 1,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: null,
        isError: false,
        isEmpty: false
      });

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

      render(<News />, { wrapper: createWrapper() });

      // Should handle gracefully
      expect(screen.getByText('News')).toBeInTheDocument();
    });
  });

  describe('Concurrent Operation Error Scenarios', () => {
    it('should handle multiple simultaneous group operations', async () => {
      const user = userEvent.setup();
      
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isLoading: false,
        error: null,
      } as any);

      const mockGroups = [
        {
          id: 'group-1',
          name: 'Group 1',
          description: 'First group',
          owner_id: 'user-2',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          member_count: 5,
          is_member: false,
          is_owner: false,
        },
        {
          id: 'group-2',
          name: 'Group 2',
          description: 'Second group',
          owner_id: 'user-2',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          member_count: 3,
          is_member: false,
          is_owner: false,
        }
      ];

      mockUseCommunityGroups.mockReturnValue({
        data: mockGroups,
        isLoading: false,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Try to join multiple groups simultaneously
      const joinButtons = screen.getAllByText('Join Group');
      expect(joinButtons).toHaveLength(2);

      // This tests that the UI can handle multiple concurrent operations
      await user.click(joinButtons[0]);
      await user.click(joinButtons[1]);

      // Should handle both operations appropriately
      expect(screen.getByText('Group 1')).toBeInTheDocument();
      expect(screen.getByText('Group 2')).toBeInTheDocument();
    });
  });

  describe('Browser Compatibility Error Scenarios', () => {
    it('should handle missing Web APIs gracefully', () => {
      // Mock missing navigator.share
      const originalShare = navigator.share;
      delete (navigator as any).share;

      mockUseNewsStatus.mockReturnValue({
        articles: [{
          id: '1',
          title: 'Test Article',
          summary: 'Test summary',
          content: 'Test content',
          author: 'Test Author',
          published_at: '2024-01-01T00:00:00Z',
          source_url: 'https://example.com',
          category: 'tech',
          tags: ['test'],
          read_time: 5
        }],
        total: 1,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: null,
        isError: false,
        isEmpty: false
      });

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

      render(<News />, { wrapper: createWrapper() });

      // Should still render without the share API
      expect(screen.getByText('Test Article')).toBeInTheDocument();

      // Restore original
      if (originalShare) {
        (navigator as any).share = originalShare;
      }
    });

    it('should handle localStorage unavailability', () => {
      // Mock localStorage throwing errors
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => { throw new Error('localStorage not available'); }),
          setItem: vi.fn(() => { throw new Error('localStorage not available'); }),
          removeItem: vi.fn(() => { throw new Error('localStorage not available'); }),
          clear: vi.fn(() => { throw new Error('localStorage not available'); }),
        },
        writable: true
      });

      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isLoading: false,
        error: null,
      } as any);

      mockUseCommunityGroups.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Should still function without localStorage
      expect(screen.getByText('Community')).toBeInTheDocument();

      // Restore original
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    });
  });

  describe('Memory and Performance Error Scenarios', () => {
    it('should handle large datasets without crashing', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isLoading: false,
        error: null,
      } as any);

      // Create a large number of groups
      const largeGroupList = Array.from({ length: 1000 }, (_, i) => ({
        id: `group-${i}`,
        name: `Group ${i}`,
        description: `Description for group ${i}`,
        owner_id: 'user-2',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        member_count: Math.floor(Math.random() * 100),
        is_member: Math.random() > 0.5,
        is_owner: false,
      }));

      mockUseCommunityGroups.mockReturnValue({
        data: largeGroupList,
        isLoading: false,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Should handle large datasets gracefully
      expect(screen.getByText('Community')).toBeInTheDocument();
      // Should show at least some groups (virtualization or pagination might limit display)
      expect(screen.getByText('Group 0')).toBeInTheDocument();
    });
  });
});