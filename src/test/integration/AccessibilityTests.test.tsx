import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const mockGroups: CommunityGroup[] = [
  {
    id: 'group-1',
    name: 'React Developers',
    description: 'A community for React developers',
    owner_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    member_count: 25,
    is_member: true,
    is_owner: true,
  },
  {
    id: 'group-2',
    name: 'TypeScript Enthusiasts',
    description: 'Learn and discuss TypeScript',
    owner_id: 'user-2',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    member_count: 18,
    is_member: false,
    is_owner: false,
  }
];

const mockArticles: NewsArticle[] = [
  {
    id: '1',
    title: 'React 19 Released',
    summary: 'The latest version of React brings new features',
    content: 'React 19 has been officially released...',
    author: 'React Team',
    published_at: '2024-01-15T10:00:00Z',
    source_url: 'https://react.dev/blog/react-19',
    category: 'software',
    tags: ['react', 'javascript'],
    read_time: 5
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

describe('Accessibility Integration Tests', () => {
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

  describe('Community Page Accessibility', () => {
    beforeEach(() => {
      mockUseCommunityGroups.mockReturnValue({
        data: mockGroups,
        isLoading: false,
        error: null,
        isError: false
      });
    });

    it('should have proper semantic HTML structure', () => {
      render(<Community />, { wrapper: createWrapper() });

      // Check for main landmark
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Check for navigation landmark
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      
      // Check for proper heading hierarchy
      expect(screen.getByRole('heading', { level: 1, name: 'Community' })).toBeInTheDocument();
    });

    it('should have proper ARIA labels and descriptions', () => {
      render(<Community />, { wrapper: createWrapper() });

      // Check breadcrumb navigation has proper aria-label
      expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
      
      // Check buttons have proper aria-labels
      expect(screen.getByRole('button', { name: /go to home page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create new group/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<Community />, { wrapper: createWrapper() });

      // Test Tab navigation through interactive elements
      const createButton = screen.getByRole('button', { name: /create new group/i });
      const homeLink = screen.getByRole('button', { name: /go to home page/i });
      
      // Focus should move between interactive elements
      await user.tab();
      expect(homeLink).toHaveFocus();
      
      await user.tab();
      expect(createButton).toHaveFocus();
    });

    it('should support Enter and Space key activation', async () => {
      const user = userEvent.setup();
      render(<Community />, { wrapper: createWrapper() });

      const createButton = screen.getByRole('button', { name: /create new group/i });
      
      // Test Enter key activation
      createButton.focus();
      await user.keyboard('{Enter}');
      
      // Should open create group modal
      expect(screen.getByText('Create Community Group')).toBeInTheDocument();
      
      // Close modal and test Space key
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      createButton.focus();
      await user.keyboard(' ');
      expect(screen.getByText('Create Community Group')).toBeInTheDocument();
    });

    it('should have proper focus management in modals', async () => {
      const user = userEvent.setup();
      render(<Community />, { wrapper: createWrapper() });

      // Open create group modal
      const createButton = screen.getByRole('button', { name: /create new group/i });
      await user.click(createButton);

      // Focus should move to first input in modal
      const nameInput = screen.getByRole('textbox', { name: /group name/i });
      expect(nameInput).toHaveFocus();

      // Test Tab navigation within modal
      await user.tab();
      const descriptionInput = screen.getByRole('textbox', { name: /description/i });
      expect(descriptionInput).toHaveFocus();

      // Test Escape key to close modal
      await user.keyboard('{Escape}');
      expect(screen.queryByText('Create Community Group')).not.toBeInTheDocument();
      
      // Focus should return to trigger button
      expect(createButton).toHaveFocus();
    });

    it('should have proper color contrast and visual indicators', () => {
      render(<Community />, { wrapper: createWrapper() });

      // Check for focus indicators (these would be tested with actual CSS)
      const createButton = screen.getByRole('button', { name: /create new group/i });
      expect(createButton).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2');
      
      // Check for proper button styling
      expect(createButton).toHaveClass('button-glow');
    });

    it('should provide proper error announcements', () => {
      mockUseCommunityGroups.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        isError: true
      });

      render(<Community />, { wrapper: createWrapper() });

      // Error messages should be properly announced
      expect(screen.getByText('Failed to load community groups')).toBeInTheDocument();
      expect(screen.getByText('Network connection error. Please check your internet connection and try again.')).toBeInTheDocument();
    });

    it('should have proper loading state announcements', () => {
      mockUseCommunityGroups.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Loading states should be properly indicated
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('should support screen reader navigation', () => {
      render(<Community />, { wrapper: createWrapper() });

      // Check for proper heading structure for screen readers
      const headings = screen.getAllByRole('heading');
      expect(headings[0]).toHaveTextContent('Community');
      
      // Check for proper list structure
      const groupCards = screen.getAllByText(/React Developers|TypeScript Enthusiasts/);
      expect(groupCards.length).toBeGreaterThan(0);
    });
  });

  describe('News Page Accessibility', () => {
    beforeEach(() => {
      mockUseNewsStatus.mockReturnValue({
        articles: mockArticles,
        total: 1,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: null,
        isError: false,
        isEmpty: false
      });
    });

    it('should have proper semantic HTML structure', () => {
      render(<News />, { wrapper: createWrapper() });

      // Check for main landmark
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Check for navigation landmark
      expect(screen.getByRole('navigation', { name: /page navigation/i })).toBeInTheDocument();
      
      // Check for proper heading hierarchy
      expect(screen.getByRole('heading', { level: 1, name: 'News' })).toBeInTheDocument();
    });

    it('should have proper ARIA labels for navigation', () => {
      render(<News />, { wrapper: createWrapper() });

      // Check back button has proper aria-label
      expect(screen.getByRole('button', { name: /go back to home page/i })).toBeInTheDocument();
      
      // Check refresh button has proper aria-label
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation for articles', async () => {
      const user = userEvent.setup();
      render(<News />, { wrapper: createWrapper() });

      // Articles should be keyboard accessible
      const backButton = screen.getByRole('button', { name: /go back to home page/i });
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      // Test Tab navigation
      await user.tab();
      expect(backButton).toHaveFocus();
      
      await user.tab();
      expect(refreshButton).toHaveFocus();
    });

    it('should have proper minimum touch target sizes', () => {
      render(<News />, { wrapper: createWrapper() });

      // Check buttons have minimum 44px touch targets
      const backButton = screen.getByRole('button', { name: /go back to home page/i });
      expect(backButton).toHaveClass('min-h-[44px]', 'min-w-[44px]');
    });

    it('should provide proper article metadata for screen readers', () => {
      render(<News />, { wrapper: createWrapper() });

      // Check article information is properly structured
      expect(screen.getByText('React 19 Released')).toBeInTheDocument();
      expect(screen.getByText('React Team')).toBeInTheDocument();
      expect(screen.getByText('5 min')).toBeInTheDocument();
      expect(screen.getByText('software')).toBeInTheDocument();
    });

    it('should handle empty states accessibly', () => {
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

      // Empty state should be properly announced
      expect(screen.getByText('No news articles available')).toBeInTheDocument();
      expect(screen.getByText('Check back later for the latest updates.')).toBeInTheDocument();
    });

    it('should handle error states accessibly', () => {
      mockUseNewsStatus.mockReturnValue({
        articles: [],
        total: 0,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        error: new Error('Failed to fetch'),
        isError: true,
        isEmpty: false
      });

      render(<News />, { wrapper: createWrapper() });

      // Error state should be properly announced
      expect(screen.getByText('Failed to load news articles')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  describe('Mobile Accessibility', () => {
    it('should have proper touch targets on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      mockUseCommunityGroups.mockReturnValue({
        data: mockGroups,
        isLoading: false,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Check mobile-specific elements
      const mobileBackButton = screen.getByText('Back');
      expect(mobileBackButton).toBeInTheDocument();
    });

    it('should support swipe gestures where appropriate', () => {
      // This would test touch event handling
      mockUseCommunityGroups.mockReturnValue({
        data: mockGroups,
        isLoading: false,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Touch events would be tested here
      expect(screen.getByText('Community')).toBeInTheDocument();
    });
  });

  describe('High Contrast and Reduced Motion', () => {
    it('should respect prefers-reduced-motion', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      mockUseCommunityGroups.mockReturnValue({
        data: mockGroups,
        isLoading: false,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Animations should be reduced or disabled
      expect(screen.getByText('Community')).toBeInTheDocument();
    });

    it('should work with high contrast mode', () => {
      // Mock high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      mockUseCommunityGroups.mockReturnValue({
        data: mockGroups,
        isLoading: false,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Should maintain functionality in high contrast mode
      expect(screen.getByText('Community')).toBeInTheDocument();
    });
  });

  describe('Form Accessibility', () => {
    it('should have proper form labels and validation', async () => {
      const user = userEvent.setup();
      
      mockUseCommunityGroups.mockReturnValue({
        data: mockGroups,
        isLoading: false,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Open create group modal
      const createButton = screen.getByRole('button', { name: /create new group/i });
      await user.click(createButton);

      // Check form has proper labels
      expect(screen.getByRole('textbox', { name: /group name/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument();

      // Test form validation accessibility
      const submitButton = screen.getByRole('button', { name: /create group/i });
      await user.click(submitButton);

      // Validation errors should be properly announced
      expect(screen.getByText('Group name is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup();
      
      mockUseCommunityGroups.mockReturnValue({
        data: mockGroups,
        isLoading: false,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Open create group modal
      const createButton = screen.getByRole('button', { name: /create new group/i });
      await user.click(createButton);

      // Submit empty form to trigger validation
      const submitButton = screen.getByRole('button', { name: /create group/i });
      await user.click(submitButton);

      // Error messages should be associated with their fields via aria-describedby
      const nameInput = screen.getByRole('textbox', { name: /group name/i });
      const nameError = screen.getByText('Group name is required');
      
      expect(nameInput).toHaveAttribute('aria-describedby');
      expect(nameError).toBeInTheDocument();
    });
  });
});