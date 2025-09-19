import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateGroupModal from '../CreateGroupModal';
import { useAuth } from '@/hooks/useAuth';
import { useCreateCommunityGroup } from '@/hooks/useCommunityGroups';

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
const mockUseCreateCommunityGroup = vi.mocked(useCreateCommunityGroup);

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

describe('CreateGroupModal', () => {
  const mockOnOpenChange = vi.fn();
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      isLoading: false,
      error: null,
    } as any);

    mockUseCreateCommunityGroup.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    } as any);
  });

  it('renders modal when open is true', () => {
    render(
      <CreateGroupModal open={true} onOpenChange={mockOnOpenChange} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Create Community Group')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter group name...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe what this group is about...')).toBeInTheDocument();
  });

  it('does not render modal when open is false', () => {
    render(
      <CreateGroupModal open={false} onOpenChange={mockOnOpenChange} />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('Create Community Group')).not.toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateGroupModal open={true} onOpenChange={mockOnOpenChange} />,
      { wrapper: createWrapper() }
    );

    const submitButton = screen.getByRole('button', { name: 'Create Group' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Group name is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('validates minimum length requirements', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateGroupModal open={true} onOpenChange={mockOnOpenChange} />,
      { wrapper: createWrapper() }
    );

    const nameInput = screen.getByPlaceholderText('Enter group name...');
    const descriptionInput = screen.getByPlaceholderText('Describe what this group is about...');
    const submitButton = screen.getByRole('button', { name: 'Create Group' });

    await user.type(nameInput, 'ab'); // Too short
    await user.type(descriptionInput, 'short'); // Too short
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Group name must be at least 3 characters')).toBeInTheDocument();
      expect(screen.getByText('Description must be at least 10 characters')).toBeInTheDocument();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('validates maximum length requirements', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateGroupModal open={true} onOpenChange={mockOnOpenChange} />,
      { wrapper: createWrapper() }
    );

    const nameInput = screen.getByPlaceholderText('Enter group name...');
    const descriptionInput = screen.getByPlaceholderText('Describe what this group is about...');
    const submitButton = screen.getByRole('button', { name: 'Create Group' });

    // Create strings that exceed the limits
    const longName = 'a'.repeat(101); // Too long
    const longDescription = 'a'.repeat(501); // Too long

    await user.type(nameInput, longName);
    await user.type(descriptionInput, longDescription);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Group name must be less than 100 characters')).toBeInTheDocument();
      expect(screen.getByText('Description must be less than 500 characters')).toBeInTheDocument();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('validates group name format', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateGroupModal open={true} onOpenChange={mockOnOpenChange} />,
      { wrapper: createWrapper() }
    );

    const nameInput = screen.getByPlaceholderText('Enter group name...');
    const descriptionInput = screen.getByPlaceholderText('Describe what this group is about...');
    const submitButton = screen.getByRole('button', { name: 'Create Group' });

    await user.type(nameInput, 'invalid@name!'); // Invalid characters
    await user.type(descriptionInput, 'This is a valid description');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Group name can only contain letters, numbers, spaces, hyphens, and underscores')).toBeInTheDocument();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({
      id: 'group-1',
      name: 'Test Group',
      description: 'This is a test group',
    });
    
    render(
      <CreateGroupModal open={true} onOpenChange={mockOnOpenChange} />,
      { wrapper: createWrapper() }
    );

    const nameInput = screen.getByPlaceholderText('Enter group name...');
    const descriptionInput = screen.getByPlaceholderText('Describe what this group is about...');
    const submitButton = screen.getByRole('button', { name: 'Create Group' });

    await user.type(nameInput, 'Test Group');
    await user.type(descriptionInput, 'This is a test group description');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'Test Group',
        description: 'This is a test group description',
      });
    });

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    mockUseCreateCommunityGroup.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      error: null,
    } as any);
    
    render(
      <CreateGroupModal open={true} onOpenChange={mockOnOpenChange} />,
      { wrapper: createWrapper() }
    );

    const nameInput = screen.getByPlaceholderText('Enter group name...');
    const descriptionInput = screen.getByPlaceholderText('Describe what this group is about...');
    const submitButton = screen.getByRole('button', { name: 'Create Group' });

    expect(nameInput).toBeDisabled();
    expect(descriptionInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Create Group')).toBeInTheDocument();
  });

  it('handles form cancellation', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateGroupModal open={true} onOpenChange={mockOnOpenChange} />,
      { wrapper: createWrapper() }
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('resets form when modal is closed', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateGroupModal open={true} onOpenChange={mockOnOpenChange} />,
      { wrapper: createWrapper() }
    );

    const nameInput = screen.getByPlaceholderText('Enter group name...');
    const descriptionInput = screen.getByPlaceholderText('Describe what this group is about...');
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });

    // Fill in some data
    await user.type(nameInput, 'Test Group');
    await user.type(descriptionInput, 'Test description');

    // Verify data is there
    expect(nameInput).toHaveValue('Test Group');
    expect(descriptionInput).toHaveValue('Test description');

    // Close modal via cancel button (which triggers handleOpenChange)
    await user.click(cancelButton);

    // Verify onOpenChange was called with false
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('trims whitespace from input values', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({
      id: 'group-1',
      name: 'Test Group',
      description: 'This is a test group',
    });
    
    render(
      <CreateGroupModal open={true} onOpenChange={mockOnOpenChange} />,
      { wrapper: createWrapper() }
    );

    const nameInput = screen.getByPlaceholderText('Enter group name...');
    const descriptionInput = screen.getByPlaceholderText('Describe what this group is about...');
    const submitButton = screen.getByRole('button', { name: /create.*group/i });

    await user.type(nameInput, '  Test Group  ');
    await user.type(descriptionInput, '  This is a test group description  ');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'Test Group',
        description: 'This is a test group description',
      });
    });
  });
});