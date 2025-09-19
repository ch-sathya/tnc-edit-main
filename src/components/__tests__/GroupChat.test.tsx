import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GroupChat from '../GroupChat';
import { useAuth } from '@/hooks/useAuth';
import { useCommunityGroup } from '@/hooks/useCommunityGroups';
import { useGroupMessages, useSendGroupMessage, useGroupMessagesSubscription } from '@/hooks/useGroupMessages';

// Mock the hooks
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useCommunityGroups');
vi.mock('@/hooks/useGroupMessages');

const mockUseAuth = vi.mocked(useAuth);
const mockUseCommunityGroup = vi.mocked(useCommunityGroup);
const mockUseGroupMessages = vi.mocked(useGroupMessages);
const mockUseSendGroupMessage = vi.mocked(useSendGroupMessage);
const mockUseGroupMessagesSubscription = vi.mocked(useGroupMessagesSubscription);

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  user_metadata: {},
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockGroup = {
  id: 'group-1',
  name: 'Test Group',
  description: 'A test group',
  owner_id: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  member_count: 2,
  is_member: true,
  is_owner: true
};

const mockMessages = [
  {
    id: 'msg-1',
    group_id: 'group-1',
    user_id: 'user-2',
    content: 'Hello everyone!',
    created_at: '2024-01-01T10:00:00Z',
    user_profile: {
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: null
    }
  },
  {
    id: 'msg-2',
    group_id: 'group-1',
    user_id: 'user-1',
    content: 'Hi there!',
    created_at: '2024-01-01T10:01:00Z',
    user_profile: {
      username: 'currentuser',
      display_name: 'Current User',
      avatar_url: null
    }
  }
];

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('GroupChat', () => {
  const mockSendMessage = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: vi.fn(),
      signIn: vi.fn(),
      signUp: vi.fn(),
      resetPassword: vi.fn(),
      updateProfile: vi.fn(),
      isAuthenticated: true
    });

    mockUseCommunityGroup.mockReturnValue({
      data: mockGroup,
      isLoading: false,
      error: null,
      isError: false
    });

    mockUseGroupMessages.mockReturnValue({
      data: {
        messages: mockMessages,
        total: 2,
        hasMore: false
      },
      isLoading: false,
      error: null,
      isError: false
    });

    mockUseSendGroupMessage.mockReturnValue({
      mutateAsync: mockSendMessage,
      isPending: false,
      error: null,
      isError: false,
      data: undefined,
      isIdle: true,
      isSuccess: false,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      status: 'idle',
      variables: undefined,
      submittedAt: 0,
      mutate: vi.fn(),
      reset: vi.fn()
    });

    mockUseGroupMessagesSubscription.mockReturnValue({
      isSubscribed: true
    });
  });

  it('renders group chat interface correctly', () => {
    renderWithQueryClient(
      <GroupChat groupId="group-1" onBack={mockOnBack} />
    );

    expect(screen.getByText('Test Group')).toBeInTheDocument();
    expect(screen.getByText('2 members')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
  });

  it('displays messages correctly', () => {
    renderWithQueryClient(
      <GroupChat groupId="group-1" onBack={mockOnBack} />
    );

    expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('handles message sending', async () => {
    mockSendMessage.mockResolvedValue({
      id: 'msg-3',
      group_id: 'group-1',
      user_id: 'user-1',
      content: 'New message',
      created_at: '2024-01-01T10:02:00Z',
      user_profile: mockUser
    });

    renderWithQueryClient(
      <GroupChat groupId="group-1" onBack={mockOnBack} />
    );

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send message/i });

    fireEvent.change(input, { target: { value: 'New message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith({
        content: 'New message',
        group_id: 'group-1'
      });
    });
  });

  it('shows loading state when group is loading', () => {
    mockUseCommunityGroup.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false
    });

    renderWithQueryClient(
      <GroupChat groupId="group-1" onBack={mockOnBack} />
    );

    // Should show loading skeletons
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('shows access denied when user is not a member', () => {
    mockUseCommunityGroup.mockReturnValue({
      data: { ...mockGroup, is_member: false },
      isLoading: false,
      error: null,
      isError: false
    });

    renderWithQueryClient(
      <GroupChat groupId="group-1" onBack={mockOnBack} />
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/You must be a member of.*to view the chat/)).toBeInTheDocument();
  });

  it('shows empty state when no messages', () => {
    mockUseGroupMessages.mockReturnValue({
      data: {
        messages: [],
        total: 0,
        hasMore: false
      },
      isLoading: false,
      error: null,
      isError: false
    });

    renderWithQueryClient(
      <GroupChat groupId="group-1" onBack={mockOnBack} />
    );

    expect(screen.getByText('No messages yet. Start the conversation!')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    renderWithQueryClient(
      <GroupChat groupId="group-1" onBack={mockOnBack} />
    );

    const backButton = screen.getByRole('button', { name: /back to groups/i });
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('prevents sending empty messages', () => {
    renderWithQueryClient(
      <GroupChat groupId="group-1" onBack={mockOnBack} />
    );

    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).toBeDisabled();

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: '   ' } }); // Only whitespace

    expect(sendButton).toBeDisabled();
  });

  it('shows character count warning when approaching limit', () => {
    renderWithQueryClient(
      <GroupChat groupId="group-1" onBack={mockOnBack} />
    );

    const input = screen.getByPlaceholderText('Type your message...');
    const longMessage = 'a'.repeat(950); // 950 characters
    
    fireEvent.change(input, { target: { value: longMessage } });

    expect(screen.getByText('50 characters remaining')).toBeInTheDocument();
  });
});