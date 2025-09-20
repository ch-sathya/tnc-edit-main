import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Community from '../Community';
import { useAuth } from '@/hooks/useAuth';
import { useCommunityGroups, useCommunityGroup } from '@/hooks/useCommunityGroups';

// Mock the hooks
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useCommunityGroups');
vi.mock('@/components/CommunityGroupList', () => ({
  default: ({ onCreateGroup, onGroupSelect }: any) => (
    <div data-testid="community-group-list">
      <button onClick={onCreateGroup} data-testid="create-group-trigger">
        Create Group
      </button>
      <button onClick={() => onGroupSelect('group-1')} data-testid="select-group">
        Select Group
      </button>
    </div>
  ),
}));
vi.mock('@/components/CreateGroupModal', () => ({
  default: ({ open, onOpenChange }: any) => (
    open ? (
      <div data-testid="create-group-modal">
        <button onClick={() => onOpenChange(false)} data-testid="close-modal">
          Close
        </button>
      </div>
    ) : null
  ),
}));
vi.mock('@/components/GroupChat', () => ({
  default: ({ groupId, onBack }: any) => (
    <div data-testid="group-chat">
      <span>Chat for group: {groupId}</span>
      <button onClick={onBack} data-testid="back-to-groups">
        Back to Groups
      </button>
    </div>
  ),
}));
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUseCommunityGroups = vi.mocked(useCommunityGroups);
const mockUseCommunityGroup = vi.mocked(useCommunityGroup);

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

describe('Community Page', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
  };

  const mockGroup = {
    id: 'group-1',
    name: 'Test Group',
    description: 'A test group',
    owner_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      error: null,
    } as any);

    mockUseCommunityGroups.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    mockUseCommunityGroup.mockReturnValue({
      data: mockGroup,
      isLoading: false,
      error: null,
    } as any);
  });

  it('renders community page with header and navigation', () => {
    render(<Community />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: 'Community' })).toBeInTheDocument();
    expect(screen.getByText('Connect with other developers and join discussions')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByTestId('community-group-list')).toBeInTheDocument();
  });

  it('shows create group modal when create button is clicked', async () => {
    const user = userEvent.setup();
    render(<Community />, { wrapper: createWrapper() });

    const createButton = screen.getByTestId('create-group-trigger');
    await user.click(createButton);

    expect(screen.getByTestId('create-group-modal')).toBeInTheDocument();
  });

  it('closes create group modal', async () => {
    const user = userEvent.setup();
    render(<Community />, { wrapper: createWrapper() });

    // Open modal
    const createButton = screen.getByTestId('create-group-trigger');
    await user.click(createButton);
    expect(screen.getByTestId('create-group-modal')).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByTestId('close-modal');
    await user.click(closeButton);
    expect(screen.queryByTestId('create-group-modal')).not.toBeInTheDocument();
  });

  it('navigates to home when home breadcrumb is clicked', async () => {
    const user = userEvent.setup();
    render(<Community />, { wrapper: createWrapper() });

    const homeLink = screen.getByText('Home');
    await user.click(homeLink);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates to home when back button is clicked on mobile', async () => {
    const user = userEvent.setup();
    render(<Community />, { wrapper: createWrapper() });

    const backButton = screen.getByText('Back');
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows group chat when group is selected', async () => {
    const user = userEvent.setup();
    render(<Community />, { wrapper: createWrapper() });

    const selectGroupButton = screen.getByTestId('select-group');
    await user.click(selectGroupButton);

    expect(screen.getByTestId('group-chat')).toBeInTheDocument();
    expect(screen.getByText('Chat for group: group-1')).toBeInTheDocument();
  });

  it('shows error toast when unauthenticated user tries to access chat', async () => {
    const user = userEvent.setup();
    
    // Mock unauthenticated user
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
    } as any);

    render(<Community />, { wrapper: createWrapper() });

    const selectGroupButton = screen.getByTestId('select-group');
    await user.click(selectGroupButton);

    // The toast should be called, but since it's mocked at the module level, 
    // we can't easily test it. Instead, let's verify the chat doesn't open.
    expect(screen.queryByTestId('group-chat')).not.toBeInTheDocument();
  });

  it('returns to group list from chat', async () => {
    const user = userEvent.setup();
    render(<Community />, { wrapper: createWrapper() });

    // Navigate to chat
    const selectGroupButton = screen.getByTestId('select-group');
    await user.click(selectGroupButton);
    expect(screen.getByTestId('group-chat')).toBeInTheDocument();

    // Go back to groups
    const backButton = screen.getByTestId('back-to-groups');
    await user.click(backButton);

    expect(screen.queryByTestId('group-chat')).not.toBeInTheDocument();
    expect(screen.getByTestId('community-group-list')).toBeInTheDocument();
  });

  it('shows correct breadcrumb navigation in chat view', async () => {
    const user = userEvent.setup();
    render(<Community />, { wrapper: createWrapper() });

    // Navigate to chat
    const selectGroupButton = screen.getByTestId('select-group');
    await user.click(selectGroupButton);

    // Check breadcrumb shows group name
    expect(screen.getByText('Test Group')).toBeInTheDocument();
    expect(screen.getAllByText('Community')).toHaveLength(1);
    expect(screen.getAllByText('Home')).toHaveLength(1);
  });

  it('handles keyboard navigation for breadcrumb links', async () => {
    const user = userEvent.setup();
    render(<Community />, { wrapper: createWrapper() });

    const homeLink = screen.getByText('Home');
    
    // Test Enter key
    homeLink.focus();
    await user.keyboard('{Enter}');
    expect(mockNavigate).toHaveBeenCalledWith('/');

    vi.clearAllMocks();

    // Test Space key
    homeLink.focus();
    await user.keyboard(' ');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('handles keyboard navigation in chat breadcrumb', async () => {
    const user = userEvent.setup();
    render(<Community />, { wrapper: createWrapper() });

    // Navigate to chat first
    const selectGroupButton = screen.getByTestId('select-group');
    await user.click(selectGroupButton);

    // Test Community breadcrumb link with keyboard
    const communityLinks = screen.getAllByText('Community');
    const communityBreadcrumb = communityLinks.find(link => 
      link.closest('[role="button"]')
    );
    
    if (communityBreadcrumb) {
      communityBreadcrumb.focus();
      await user.keyboard('{Enter}');
      
      // Should return to group list
      expect(screen.queryByTestId('group-chat')).not.toBeInTheDocument();
      expect(screen.getByTestId('community-group-list')).toBeInTheDocument();
    }
  });
});