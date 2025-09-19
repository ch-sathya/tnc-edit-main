import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Community from '@/pages/Community';
import { useAuth } from '@/hooks/useAuth';
import { 
  useCommunityGroups, 
  useCommunityGroup,
  useCreateCommunityGroup,
  useJoinCommunityGroup,
  useDeleteCommunityGroup 
} from '@/hooks/useCommunityGroups';
import { useGroupMessages, useSendGroupMessage } from '@/hooks/useGroupMessages';
import type { CommunityGroup, GroupMessage } from '@/types/community';

// Mock all the hooks
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useCommunityGroups');
vi.mock('@/hooks/useGroupMessages');
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUseCommunityGroups = vi.mocked(useCommunityGroups);
const mockUseCommunityGroup = vi.mocked(useCommunityGroup);
const mockUseCreateCommunityGroup = vi.mocked(useCreateCommunityGroup);
const mockUseJoinCommunityGroup = vi.mocked(useJoinCommunityGroup);
const mockUseDeleteCommunityGroup = vi.mocked(useDeleteCommunityGroup);
const mockUseGroupMessages = vi.mocked(useGroupMessages);
const mockUseSendGroupMessage = vi.mocked(useSendGroupMessage);

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  user_metadata: {},
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockGroups: CommunityGroup[] = [
  {
    id: 'group-1',
    name: 'React Developers',
    description: 'A community for React developers',
    owner_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    member_count: 5,
    is_member: true,
    is_owner: true,
  },
];

const mockMessages: GroupMessage[] = [
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

describe('Community Integration Tests', () => {
  const mockCreateMutate = vi.fn();
  const mockJoinMutate = vi.fn();
  const mockDeleteMutate = vi.fn();
  const mockSendMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
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

    mockUseCommunityGroups.mockReturnValue({
      data: mockGroups,
      isLoading: false,
      error: null,
      isError: false
    });

    mockUseCommunityGroup.mockReturnValue({
      data: mockGroups[0],
      isLoading: false,
      error: null,
      isError: false
    });

    mockUseCreateCommunityGroup.mockReturnValue({
      mutateAsync: mockCreateMutate,
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

    mockUseJoinCommunityGroup.mockReturnValue({
      mutate: mockJoinMutate,
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

    mockUseGroupMessages.mockReturnValue({
      data: {
        messages: mockMessages,
        total: 1,
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
  });

  describe('Group Creation Workflow', () => {
    it('should complete full group creation workflow', async () => {
      const user = userEvent.setup();
      
      // Mock successful group creation
      const newGroup = {
        id: 'group-2',
        name: 'New Test Group',
        description: 'A new test group',
        owner_id: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        member_count: 1,
        is_member: true,
        is_owner: true,
      };
      mockCreateMutate.mockResolvedValue(newGroup);

      render(<Community />, { wrapper: createWrapper() });

      // 1. Click create group button
      const createButton = screen.getByText('Create New Group');
      await user.click(createButton);

      // 2. Fill out the form
      const nameInput = screen.getByPlaceholderText('Enter group name...');
      const descriptionInput = screen.getByPlaceholderText('Describe what this group is about...');
      
      await user.type(nameInput, 'New Test Group');
      await user.type(descriptionInput, 'A new test group for testing purposes');

      // 3. Submit the form
      const submitButton = screen.getByRole('button', { name: 'Create Group' });
      await user.click(submitButton);

      // 4. Verify the API call
      await waitFor(() => {
        expect(mockCreateMutate).toHaveBeenCalledWith({
          name: 'New Test Group',
          description: 'A new test group for testing purposes',
        });
      });
    });

    it('should handle group creation errors', async () => {
      const user = userEvent.setup();
      
      // Mock failed group creation
      mockCreateMutate.mockRejectedValue(new Error('Group name already exists'));
      mockUseCreateCommunityGroup.mockReturnValue({
        mutateAsync: mockCreateMutate,
        isPending: false,
        error: new Error('Group name already exists'),
        isError: true,
        data: undefined,
        isIdle: false,
        isSuccess: false,
        failureCount: 1,
        failureReason: new Error('Group name already exists'),
        isPaused: false,
        status: 'error',
        variables: undefined,
        submittedAt: 0,
        mutate: vi.fn(),
        reset: vi.fn()
      });

      render(<Community />, { wrapper: createWrapper() });

      // Try to create a group
      const createButton = screen.getByText('Create New Group');
      await user.click(createButton);

      const nameInput = screen.getByPlaceholderText('Enter group name...');
      const descriptionInput = screen.getByPlaceholderText('Describe what this group is about...');
      
      await user.type(nameInput, 'Existing Group');
      await user.type(descriptionInput, 'This group already exists');

      const submitButton = screen.getByRole('button', { name: 'Create Group' });
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Group name already exists')).toBeInTheDocument();
      });
    });
  });

  describe('Group Chat Workflow', () => {
    it('should complete full chat workflow', async () => {
      const user = userEvent.setup();
      
      // Mock successful message sending
      const newMessage = {
        id: 'msg-2',
        group_id: 'group-1',
        user_id: 'user-1',
        content: 'Hello from integration test!',
        created_at: '2024-01-01T10:01:00Z',
        user_profile: {
          username: 'currentuser',
          display_name: 'Current User',
          avatar_url: null
        }
      };
      mockSendMessage.mockResolvedValue(newMessage);

      render(<Community />, { wrapper: createWrapper() });

      // 1. Click on a group to enter chat
      const groupCard = screen.getByText('React Developers').closest('[role="button"]');
      if (groupCard) {
        await user.click(groupCard);
      }

      // 2. Verify we're in the chat interface
      await waitFor(() => {
        expect(screen.getByText('React Developers')).toBeInTheDocument();
        expect(screen.getByText('5 members')).toBeInTheDocument();
        expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
      });

      // 3. Send a message
      const messageInput = screen.getByPlaceholderText('Type your message...');
      await user.type(messageInput, 'Hello from integration test!');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // 4. Verify the message was sent
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          content: 'Hello from integration test!',
          group_id: 'group-1'
        });
      });
    });

    it('should handle navigation between group list and chat', async () => {
      const user = userEvent.setup();
      
      render(<Community />, { wrapper: createWrapper() });

      // Start in group list
      expect(screen.getByText('Connect with other developers and join discussions')).toBeInTheDocument();

      // Navigate to chat
      const groupCard = screen.getByText('React Developers').closest('[role="button"]');
      if (groupCard) {
        await user.click(groupCard);
      }

      // Should be in chat view
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
      });

      // Navigate back to group list
      const backButton = screen.getByRole('button', { name: /back to groups/i });
      await user.click(backButton);

      // Should be back in group list
      await waitFor(() => {
        expect(screen.getByText('Connect with other developers and join discussions')).toBeInTheDocument();
      });
    });

    it('should prevent chat access for non-members', async () => {
      const user = userEvent.setup();
      
      // Mock group where user is not a member
      const nonMemberGroup = {
        ...mockGroups[0],
        is_member: false,
        is_owner: false,
      };
      
      mockUseCommunityGroups.mockReturnValue({
        data: [nonMemberGroup],
        isLoading: false,
        error: null,
        isError: false
      });

      mockUseCommunityGroup.mockReturnValue({
        data: nonMemberGroup,
        isLoading: false,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Try to click on the group
      const groupCard = screen.getByText('React Developers').closest('[role="button"]');
      if (groupCard) {
        await user.click(groupCard);
      }

      // Should not navigate to chat (no message input should appear)
      expect(screen.queryByPlaceholderText('Type your message...')).not.toBeInTheDocument();
    });
  });

  describe('Group Management Workflow', () => {
    it('should complete group deletion workflow', async () => {
      const user = userEvent.setup();
      
      mockDeleteMutate.mockImplementation(() => {
        // Simulate successful deletion by updating the groups list
        mockUseCommunityGroups.mockReturnValue({
          data: [],
          isLoading: false,
          error: null,
          isError: false
        });
      });

      render(<Community />, { wrapper: createWrapper() });

      // 1. Find and click delete button
      const deleteButton = screen.getByText('Delete Group');
      await user.click(deleteButton);

      // 2. Confirm deletion in dialog
      await waitFor(() => {
        expect(screen.getByText('Are you sure you want to delete "React Developers"?')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // 3. Verify deletion API call
      await waitFor(() => {
        expect(mockDeleteMutate).toHaveBeenCalledWith('group-1');
      });
    });

    it('should handle join group workflow', async () => {
      const user = userEvent.setup();
      
      // Mock a group the user is not a member of
      const joinableGroup = {
        ...mockGroups[0],
        is_member: false,
        is_owner: false,
      };
      
      mockUseCommunityGroups.mockReturnValue({
        data: [joinableGroup],
        isLoading: false,
        error: null,
        isError: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Click join button
      const joinButton = screen.getByText('Join Group');
      await user.click(joinButton);

      // Verify join API call
      await waitFor(() => {
        expect(mockJoinMutate).toHaveBeenCalledWith('group-1');
      });
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle authentication errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock unauthenticated user
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signOut: vi.fn(),
        signIn: vi.fn(),
        signUp: vi.fn(),
        resetPassword: vi.fn(),
        updateProfile: vi.fn(),
        isAuthenticated: false
      });

      render(<Community />, { wrapper: createWrapper() });

      // Try to access chat
      const groupCard = screen.getByText('React Developers').closest('[role="button"]');
      if (groupCard) {
        await user.click(groupCard);
      }

      // Should show error toast and not navigate to chat
      expect(screen.queryByPlaceholderText('Type your message...')).not.toBeInTheDocument();
    });

    it('should handle network errors in group loading', () => {
      mockUseCommunityGroups.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        isError: true
      });

      render(<Community />, { wrapper: createWrapper() });

      expect(screen.getByText('Failed to load community groups')).toBeInTheDocument();
      expect(screen.getByText('Network connection error. Please check your internet connection and try again.')).toBeInTheDocument();
    });

    it('should handle message sending errors', async () => {
      const user = userEvent.setup();
      
      // Mock message sending failure
      mockSendMessage.mockRejectedValue(new Error('Failed to send message'));
      mockUseSendGroupMessage.mockReturnValue({
        mutateAsync: mockSendMessage,
        isPending: false,
        error: new Error('Failed to send message'),
        isError: true,
        data: undefined,
        isIdle: false,
        isSuccess: false,
        failureCount: 1,
        failureReason: new Error('Failed to send message'),
        isPaused: false,
        status: 'error',
        variables: undefined,
        submittedAt: 0,
        mutate: vi.fn(),
        reset: vi.fn()
      });

      render(<Community />, { wrapper: createWrapper() });

      // Navigate to chat
      const groupCard = screen.getByText('React Developers').closest('[role="button"]');
      if (groupCard) {
        await user.click(groupCard);
      }

      // Try to send a message
      const messageInput = screen.getByPlaceholderText('Type your message...');
      await user.type(messageInput, 'This message will fail');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Should handle the error gracefully
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalled();
      });
    });
  });
});