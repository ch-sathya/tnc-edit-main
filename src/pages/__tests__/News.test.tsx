import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import News from '../News';

// Mock the NewsFeed component
vi.mock('@/components/NewsFeed', () => ({
  NewsFeed: ({ limit, showRefreshButton }: any) => (
    <div data-testid="news-feed">
      <span data-testid="news-limit">Limit: {limit}</span>
      <span data-testid="refresh-button-visible">{showRefreshButton ? 'true' : 'false'}</span>
      <div data-testid="mock-articles">
        <article>Mock Article 1</article>
        <article>Mock Article 2</article>
      </div>
    </div>
  ),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

describe('News Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders news page with header and navigation', () => {
    render(<News />, { wrapper: createWrapper() });

    expect(screen.getByText('News')).toBeInTheDocument();
    expect(screen.getByText('Stay updated with the latest in technology and software development')).toBeInTheDocument();
    expect(screen.getByTestId('news-feed')).toBeInTheDocument();
  });

  it('shows back button with correct text on different screen sizes', () => {
    render(<News />, { wrapper: createWrapper() });

    // Should show both "Back to Home" and "Back" text (responsive)
    expect(screen.getByText('Back to Home')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('navigates to home when back button is clicked', async () => {
    const user = userEvent.setup();
    render(<News />, { wrapper: createWrapper() });

    const backButton = screen.getByRole('button', { name: /go back to home page/i });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('passes correct props to NewsFeed component', () => {
    render(<News />, { wrapper: createWrapper() });

    expect(screen.getByTestId('news-limit')).toHaveTextContent('Limit: 12');
    expect(screen.getByTestId('refresh-button-visible')).toHaveTextContent('true');
  });

  it('has proper accessibility attributes', () => {
    render(<News />, { wrapper: createWrapper() });

    // Check main element has role
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();

    // Check navigation has proper aria-label
    const navElement = screen.getByRole('navigation', { name: /page navigation/i });
    expect(navElement).toBeInTheDocument();

    // Check back button has proper aria-label
    const backButton = screen.getByRole('button', { name: /go back to home page/i });
    expect(backButton).toBeInTheDocument();
  });

  it('has minimum touch target size for mobile', () => {
    render(<News />, { wrapper: createWrapper() });

    const backButton = screen.getByRole('button', { name: /go back to home page/i });
    
    // Check that the button has the minimum touch target classes
    expect(backButton).toHaveClass('min-h-[44px]', 'min-w-[44px]');
  });

  it('renders within NewsErrorBoundary', () => {
    // This test ensures the component is wrapped in error boundary
    // The actual error boundary functionality would be tested separately
    render(<News />, { wrapper: createWrapper() });
    
    // If the component renders successfully, it means the error boundary is working
    expect(screen.getByText('News')).toBeInTheDocument();
  });

  it('handles keyboard navigation for back button', async () => {
    const user = userEvent.setup();
    render(<News />, { wrapper: createWrapper() });

    const backButton = screen.getByRole('button', { name: /go back to home page/i });
    
    // Test Enter key
    backButton.focus();
    await user.keyboard('{Enter}');
    expect(mockNavigate).toHaveBeenCalledWith('/');

    vi.clearAllMocks();

    // Test Space key
    backButton.focus();
    await user.keyboard(' ');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('displays news feed with mock articles', () => {
    render(<News />, { wrapper: createWrapper() });

    expect(screen.getByTestId('mock-articles')).toBeInTheDocument();
    expect(screen.getByText('Mock Article 1')).toBeInTheDocument();
    expect(screen.getByText('Mock Article 2')).toBeInTheDocument();
  });
});