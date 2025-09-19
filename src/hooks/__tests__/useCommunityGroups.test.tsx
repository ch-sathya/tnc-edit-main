import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCommunityGroups, useCreateCommunityGroup } from '../useCommunityGroups';
import * as communityGroupsLib from '@/lib/communityGroups';
import { useAuth } from '../useAuth';

// Mock the dependencies
vi.mock('../useAuth');
vi.mock('@/lib/communityGroups');
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUseAuth = useAuth as any;
const mockCommunityGroupsLib = communityGroupsLib as any;

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useCommunityGroups hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user1' },
      isAuthenticated: true,
    });
  });

  describe('useCommunityGroups', () => {
    it('should fetch community groups successfully', async () => {
      const mockGroups = [
        {
          id: '1',
          name: 'Test Group',
          description: 'Test Description',
          owner_id: 'user1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          member_count: 5,
          is_member: true,
          is_owner: true,
        },
      ];

      mockCommunityGroupsLib.fetchCommunityGroups.mockResolvedValue(mockGroups);

      const { result } = renderHook(() => useCommunityGroups(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockGroups);
      expect(mockCommunityGroupsLib.fetchCommunityGroups).toHaveBeenCalledWith('user1');
    });

    it('should handle fetch error', async () => {
      const mockError = new Error('Failed to fetch groups');
      mockCommunityGroupsLib.fetchCommunityGroups.mockRejectedValue(mockError);

      const { result } = renderHook(() => useCommunityGroups(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should fetch with undefined userId when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      const mockGroups = [];
      mockCommunityGroupsLib.fetchCommunityGroups.mockResolvedValue(mockGroups);

      const { result } = renderHook(() => useCommunityGroups(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockCommunityGroupsLib.fetchCommunityGroups).toHaveBeenCalledWith(undefined);
      expect(result.current.data).toEqual(mockGroups);
    });
  });

  describe('useCreateCommunityGroup', () => {
    it('should create a community group successfully', async () => {
      const mockNewGroup = {
        id: '2',
        name: 'New Group',
        description: 'New Description',
        owner_id: 'user1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        member_count: 1,
        is_member: true,
        is_owner: true,
      };

      mockCommunityGroupsLib.createCommunityGroup.mockResolvedValue(mockNewGroup);

      const { result } = renderHook(() => useCreateCommunityGroup(), {
        wrapper: createWrapper(),
      });

      const groupData = { name: 'New Group', description: 'New Description' };
      
      result.current.mutate(groupData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockNewGroup);
      expect(mockCommunityGroupsLib.createCommunityGroup).toHaveBeenCalledWith(groupData, 'user1');
    });

    it('should handle create error', async () => {
      const mockError = new Error('Failed to create group');
      mockCommunityGroupsLib.createCommunityGroup.mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateCommunityGroup(), {
        wrapper: createWrapper(),
      });

      const groupData = { name: 'New Group', description: 'New Description' };
      
      result.current.mutate(groupData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should throw error when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      const { result } = renderHook(() => useCreateCommunityGroup(), {
        wrapper: createWrapper(),
      });

      const groupData = { name: 'New Group', description: 'New Description' };
      
      result.current.mutate(groupData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('User must be authenticated to create a group');
    });
  });
});