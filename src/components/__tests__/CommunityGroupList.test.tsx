import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CommunityGroupList from '../CommunityGroupList';
import { useAuth } from '@/hooks/useAuth';
import { 
  useCommunityGroups, 
  useJoinCommunityGroup, 
  useLeaveCommunityGroup, 
  useDeleteCommunityGroup 
} from '@/hooks/useCommunityGroups';
import type { CommunityGroup } from '@/types/community';

// Mock the hooks
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useCommunityGroups');

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUseCommunityGroups = vi.mocked(useCommunityGroups);
const mockUseJoinCommunityGroup = vi.mocked(useJoinCommunityGroup);
const mockUseLeaveCommunityGroup = vi.mocked(useLeaveCommunityGroup);
const mockUseDeleteCommunityGroup = vi.mocked(useDeleteCommunityGroup);

const mockGroups: CommunityGroup[] = [
  {
    id: 'group-1',
    name: 'React Developers',
    description: 'A community for React developers to share knowledge and discuss best practices.',
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
    description: 'Learn and discuss TypeScript features, patterns, and best practices.',
    owner_id: 'user-2',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    member_count: 18,
    is_member: false,
    is_owner: false,
  },
  {
    id: 'group-3',
    name: 'Vue.js Community',
    description: 'Everything about Vue.js development and ecosystem.',
    owner_id: 'user-3',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    member_count: 12,
    is_member: true,
    is_owner: false,
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('CommunityGroupList', () => {
  const mockOnCreateGroup = vi.fn();
  const mockOnGroupSelect = vi.fn();
  const mockJoinMutate = vi.fn();
  const mockLeaveMutate = vi.fn();
  const mockDeleteMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      isLoading: false,
      error: null,
    } as any);

    mockUseCommunityGroups.mockReturnValue({
      data: mockGroups,
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    mockUseJoinCommunityGroup.mockReturnValue({
      mutate: mockJoinMutate,
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      error: null,
    } as any);

    mockUseLeaveCommunityGroup.mockReturnValue({
      mutate: mockLeaveMutate,
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      error: null,
    } as any);

    mockUseDeleteCommunityGroup.mockReturnValue({
      mutate: mockDeleteMutate,
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      error: null,
    } as any);
  });

  it('renders group list with create button', () => {
    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Create New Group')).toBeInTheDocument();
    expect(screen.getByText('React Developers')).toBeInTheDocument();
    expect(screen.getByText('TypeScript Enthusiasts')).toBeInTheDocument();
    expect(screen.getByText('Vue.js Community')).toBeInTheDocument();
  });

  it('displays group information correctly', () => {
    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    // Check group descriptions
    expect(screen.getByText('A community for React developers to share knowledge and discuss best practices.')).toBeInTheDocument();
    expect(screen.getByText('Learn and discuss TypeScript features, patterns, and best practices.')).toBeInTheDocument();

    // Check member counts
    expect(screen.getByText('25 members')).toBeInTheDocument();
    expect(screen.getByText('18 members')).toBeInTheDocument();
    expect(screen.getByText('12 members')).toBeInTheDocument();
  });

  it('shows correct membership status and actions', () => {
    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    // Group 1: User is owner and member
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Delete Group')).toBeInTheDocument();

    // Group 2: User is not a member
    expect(screen.getByText('Join Group')).toBeInTheDocument();

    // Group 3: User is member but not owner
    expect(screen.getByText('Leave Group')).toBeInTheDocument();
  });

  it('calls onCreateGroup when create button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    const createButton = screen.getByText('Create New Group');
    await user.click(createButton);

    expect(mockOnCreateGroup).toHaveBeenCalledTimes(1);
  });

  it('calls onGroupSelect when group is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    // Click on a group the user is a member of
    const groupCard = screen.getByText('React Developers').closest('[role="button"]');
    if (groupCard) {
      await user.click(groupCard);
      expect(mockOnGroupSelect).toHaveBeenCalledWith('group-1');
    }
  });

  it('does not allow group selection for non-members', async () => {
    const user = userEvent.setup();
    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    // Try to click on a group the user is not a member of
    const groupCard = screen.getByText('TypeScript Enthusiasts').closest('[role="button"]');
    if (groupCard) {
      await user.click(groupCard);
      expect(mockOnGroupSelect).not.toHaveBeenCalled();
    }
  });

  it('handles join group action', async () => {
    const user = userEvent.setup();
    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    const joinButton = screen.getByText('Join Group');
    await user.click(joinButton);

    expect(mockJoinMutate).toHaveBeenCalledWith('group-2');
  });

  it('handles leave group action', async () => {
    const user = userEvent.setup();
    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    const leaveButton = screen.getByText('Leave Group');
    await user.click(leaveButton);

    expect(mockLeaveMutate).toHaveBeenCalledWith('group-3');
  });

  it('handles delete group action with confirmation', async () => {
    const user = userEvent.setup();
    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    const deleteButton = screen.getByText('Delete Group');
    await user.click(deleteButton);

    // Should show confirmation dialog
    expect(screen.getByText('Delete Group')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete "React Developers"? This action cannot be undone and will remove all messages and members.')).toBeInTheDocument();

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    expect(mockDeleteMutate).toHaveBeenCalledWith('group-1');
  });

  it('shows loading state', () => {
    mockUseCommunityGroups.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
    } as any);

    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    // Should show loading skeletons
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no groups', () => {
    mockUseCommunityGroups.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('No community groups yet')).toBeInTheDocument();
    expect(screen.getByText('Be the first to create a community group and start connecting with other developers!')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseCommunityGroups.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch groups'),
      isError: true,
    } as any);

    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Failed to load community groups')).toBeInTheDocument();
    expect(screen.getByText('Network connection error. Please check your internet connection and try again.')).toBeInTheDocument();
  });

  it('shows loading states for individual actions', () => {
    mockUseJoinCommunityGroup.mockReturnValue({
      mutate: mockJoinMutate,
      isPending: true,
      error: null,
    } as any);

    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    // Join button should show loading state
    const joinButton = screen.getByText('Joining...');
    expect(joinButton).toBeInTheDocument();
    expect(joinButton).toBeDisabled();
  });

  it('prevents actions when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
    } as any);

    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    // Create button should be disabled or show login prompt
    expect(screen.getByText('Sign in to create groups')).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    const groupCard = screen.getByText('React Developers').closest('[role="button"]');
    if (groupCard) {
      groupCard.focus();
      await user.keyboard('{Enter}');
      expect(mockOnGroupSelect).toHaveBeenCalledWith('group-1');
    }
  });

  it('shows proper accessibility attributes', () => {
    render(
      <CommunityGroupList 
        onCreateGroup={mockOnCreateGroup}
        onGroupSelect={mockOnGroupSelect}
      />,
      { wrapper: createWrapper() }
    );

    // Check for proper ARIA labels
    const createButton = screen.getByRole('button', { name: /create new group/i });
    expect(createButton).toBeInTheDocument();

    // Check for proper button roles
    const joinButton = screen.getByRole('button', { name: /join group/i });
    expect(joinButton).toBeInTheDocument();
  });
});