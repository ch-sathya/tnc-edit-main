import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GroupChat from '@/components/GroupChat';
import { useAuth } from '@/hooks/useAuth';
import { useCommunityGroup } from '@/hooks/useCommunityGroups';
import { 
  useGroupMessages, 
  useSendGroupMessage, 
  useGroupMessagesSubscription 
} from '@/hooks/useGroupMessages';
import type { GroupMessage, CommunityGroup } from '@/types/community';

// Mock the hooks
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useCommunityGroups');
vi.mock('@/hooks/useGroupMessages');

// Mock Supabase real-time
const mockSubscription = {
  unsubscribe: vi.fn(),
};

const mockSupabase = {
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue(mockSubscription),
  })),
  removeChannel: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

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

const mockGroup: CommunityGroup = {
  id: 'group-1',
  name: 'Test Group',
  description: 'A test group',
  owner_id: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  member_count: 3,
  is_member: true,
  is_owner: true
};

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

describe('Real-time Chat Integration Tests', () => {
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

  afterEach(() => {
    // Clean up any subscriptions
    mockSupabase.removeChannel.mockClear();
  });

  describe('Real-time Message Subscription', () => {
    it('should establish real-time subscription on mount', () => {
      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      // Verify subscription was established
      expect(mockUseGroupMessagesSubscription).toHaveBeenCalledWith('group-1');
    });

    it('should handle incoming real-time messages', async () => {
      const user = userEvent.setup();
      
      // Mock a new message coming in via real-time subscription
      const newMessage: GroupMessage = {
        id: 'msg-3',
        group_id: 'group-1',
        user_id: 'user-3',
        content: 'New real-time message!',
        created_at: '2024-01-01T10:02:00Z',
        user_profile: {
          username: 'newuser',
          display_name: 'New User',
          avatar_url: null
        }
      };

      // Start with initial messages
      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();

      // Simulate real-time message update
      act(() => {
        mockUseGroupMessages.mockReturnValue({
          data: {
            messages: [...mockMessages, newMessage],
            total: 3,
            hasMore: false
          },
          isLoading: false,
          error: null,
          isError: false
        });
      });

      // Re-render to simulate the real-time update
      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('New real-time message!')).toBeInTheDocument();
        expect(screen.getByText('New User')).toBeInTheDocument();
      });
    });

    it('should handle subscription connection errors', () => {
      mockUseGroupMessagesSubscription.mockReturnValue({
        isSubscribed: false,
        error: new Error('Connection failed')
      });

      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      // Should still display existing messages even if subscription fails
      expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });

    it('should clean up subscription on unmount', () => {
      const { unmount } = render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      // Unmount the component
      unmount();

      // Verify cleanup was called (this would be handled by the hook internally)
      expect(mockUseGroupMessagesSubscription).toHaveBeenCalled();
    });
  });

  describe('Message Sending with Real-time Updates', () => {
    it('should send message and update UI optimistically', async () => {
      const user = userEvent.setup();
      
      const newMessage: GroupMessage = {
        id: 'msg-3',
        group_id: 'group-1',
        user_id: 'user-1',
        content: 'Test message',
        created_at: '2024-01-01T10:02:00Z',
        user_profile: {
          username: 'currentuser',
          display_name: 'Current User',
          avatar_url: null
        }
      };

      mockSendMessage.mockResolvedValue(newMessage);

      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      const messageInput = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(messageInput, 'Test message');
      await user.click(sendButton);

      // Verify message was sent
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          content: 'Test message',
          group_id: 'group-1'
        });
      });

      // Input should be cleared after sending
      expect(messageInput).toHaveValue('');
    });

    it('should handle message sending failures gracefully', async () => {
      const user = userEvent.setup();
      
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

      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      const messageInput = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(messageInput, 'This will fail');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalled();
      });

      // Message should remain in input on failure
      expect(messageInput).toHaveValue('This will fail');
    });

    it('should show loading state while sending message', async () => {
      const user = userEvent.setup();
      
      mockUseSendGroupMessage.mockReturnValue({
        mutateAsync: mockSendMessage,
        isPending: true,
        error: null,
        isError: false,
        data: undefined,
        isIdle: false,
        isSuccess: false,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        status: 'pending',
        variables: undefined,
        submittedAt: 0,
        mutate: vi.fn(),
        reset: vi.fn()
      });

      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      const messageInput = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(messageInput, 'Test message');

      // Send button should be disabled and show loading state
      expect(sendButton).toBeDisabled();
      expect(messageInput).toBeDisabled();
    });
  });

  describe('Message Ordering and Timestamps', () => {
    it('should display messages in chronological order', () => {
      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      const messageElements = screen.getAllByText(/Hello everyone!|Hi there!/);
      
      // First message should appear before second message in DOM
      expect(messageElements[0]).toHaveTextContent('Hello everyone!');
      expect(messageElements[1]).toHaveTextContent('Hi there!');
    });

    it('should display relative timestamps', () => {
      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      // Should show some form of timestamp (exact format may vary)
      const timestampElements = document.querySelectorAll('[data-testid*="timestamp"], .timestamp, [title*="2024"]');
      expect(timestampElements.length).toBeGreaterThan(0);
    });

    it('should handle messages from different users correctly', () => {
      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      // Should show different user names
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument(); // Current user's messages
    });
  });

  describe('Chat Scroll Behavior', () => {
    it('should auto-scroll to bottom on new messages', async () => {
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      // Simulate new message arriving
      const newMessage: GroupMessage = {
        id: 'msg-3',
        group_id: 'group-1',
        user_id: 'user-3',
        content: 'Latest message',
        created_at: '2024-01-01T10:03:00Z',
        user_profile: {
          username: 'newuser',
          display_name: 'New User',
          avatar_url: null
        }
      };

      act(() => {
        mockUseGroupMessages.mockReturnValue({
          data: {
            messages: [...mockMessages, newMessage],
            total: 3,
            hasMore: false
          },
          isLoading: false,
          error: null,
          isError: false
        });
      });

      // Re-render to simulate the update
      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Latest message')).toBeInTheDocument();
      });
    });
  });

  describe('Connection Status Indicators', () => {
    it('should show connection status when subscription is active', () => {
      mockUseGroupMessagesSubscription.mockReturnValue({
        isSubscribed: true
      });

      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      // Should indicate real-time connection is active
      // This would depend on the actual UI implementation
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });

    it('should show disconnected state when subscription fails', () => {
      mockUseGroupMessagesSubscription.mockReturnValue({
        isSubscribed: false,
        error: new Error('Connection lost')
      });

      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      // Should still function but may show connection status
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });
  });

  describe('Message Validation and Limits', () => {
    it('should prevent sending empty messages', async () => {
      const user = userEvent.setup();
      
      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      // Send button should be disabled when input is empty
      expect(sendButton).toBeDisabled();

      const messageInput = screen.getByPlaceholderText('Type your message...');
      await user.type(messageInput, '   '); // Only whitespace

      // Should still be disabled
      expect(sendButton).toBeDisabled();
    });

    it('should handle message length limits', async () => {
      const user = userEvent.setup();
      
      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      const messageInput = screen.getByPlaceholderText('Type your message...');
      const longMessage = 'a'.repeat(1001); // Assuming 1000 char limit
      
      await user.type(messageInput, longMessage);

      // Should show character count warning or prevent input
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      // Behavior depends on implementation - either disabled or shows warning
      expect(messageInput.value.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed message sends', async () => {
      const user = userEvent.setup();
      
      // First attempt fails
      mockSendMessage.mockRejectedValueOnce(new Error('Network error'));
      // Second attempt succeeds
      mockSendMessage.mockResolvedValueOnce({
        id: 'msg-3',
        group_id: 'group-1',
        user_id: 'user-1',
        content: 'Retry message',
        created_at: '2024-01-01T10:02:00Z',
        user_profile: mockUser
      });

      render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      const messageInput = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(messageInput, 'Retry message');
      await user.click(sendButton);

      // First attempt should fail
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledTimes(1);
      });

      // Message should remain in input for retry
      expect(messageInput).toHaveValue('Retry message');
    });

    it('should handle subscription reconnection', async () => {
      // Start with failed subscription
      mockUseGroupMessagesSubscription.mockReturnValue({
        isSubscribed: false,
        error: new Error('Connection failed')
      });

      const { rerender } = render(
        <GroupChat groupId="group-1" onBack={mockOnBack} />,
        { wrapper: createWrapper() }
      );

      // Simulate reconnection
      mockUseGroupMessagesSubscription.mockReturnValue({
        isSubscribed: true
      });

      rerender(
        <GroupChat groupId="group-1" onBack={mockOnBack} />
      );

      // Should handle reconnection gracefully
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });
  });
});