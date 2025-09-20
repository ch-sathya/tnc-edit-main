import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  fetchCommunityGroups,
  fetchCommunityGroup,
  createCommunityGroup,
  updateCommunityGroup,
  deleteCommunityGroup,
  joinCommunityGroup,
  leaveCommunityGroup
} from '@/lib/communityGroups';
import type { 
  CommunityGroup, 
  CreateGroupRequest, 
  UpdateGroupRequest 
} from '@/types/community';
import { toast } from 'sonner';

// Query keys
export const communityGroupsKeys = {
  all: ['communityGroups'] as const,
  lists: () => [...communityGroupsKeys.all, 'list'] as const,
  list: (userId?: string) => [...communityGroupsKeys.lists(), userId] as const,
  details: () => [...communityGroupsKeys.all, 'detail'] as const,
  detail: (id: string, userId?: string) => [...communityGroupsKeys.details(), id, userId] as const,
};

/**
 * Hook to fetch all community groups
 */
export const useCommunityGroups = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: communityGroupsKeys.list(user?.id),
    queryFn: () => fetchCommunityGroups(user?.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if it's a table/permission issue
      if (error?.code === '42P01' || error?.code === 'PGRST116' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
        return false;
      }
      // Retry on network errors and server errors
      if (error?.message?.includes('network') || error?.message?.includes('fetch') || error?.status >= 500) {
        return failureCount < 3;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Provide a fallback to prevent the error boundary from showing
    throwOnError: false,
  });
};

/**
 * Hook to fetch a single community group
 */
export const useCommunityGroup = (groupId: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: communityGroupsKeys.detail(groupId, user?.id),
    queryFn: () => fetchCommunityGroup(groupId, user?.id),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Retry on network errors and server errors
      if (error?.message?.includes('network') || error?.message?.includes('fetch') || error?.status >= 500) {
        return failureCount < 3;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook to create a new community group
 */
export const useCreateCommunityGroup = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupData: CreateGroupRequest) => {
      if (!user?.id) {
        throw new Error('User must be authenticated to create a group');
      }
      return createCommunityGroup(groupData, user.id);
    },
    onSuccess: (newGroup: CommunityGroup) => {
      // Invalidate and refetch groups list
      queryClient.invalidateQueries({ queryKey: communityGroupsKeys.lists() });
      
      // Add the new group to the cache
      queryClient.setQueryData(
        communityGroupsKeys.detail(newGroup.id, user?.id),
        newGroup
      );
      
      toast.success('Community group created successfully!');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to create community group';
      toast.error(message);
    },
  });
};

/**
 * Hook to update a community group
 */
export const useUpdateCommunityGroup = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, updates }: { groupId: string; updates: UpdateGroupRequest }) => {
      if (!user?.id) {
        throw new Error('User must be authenticated to update a group');
      }
      return updateCommunityGroup(groupId, updates, user.id);
    },
    onSuccess: (updatedGroup: CommunityGroup) => {
      // Update the specific group in cache
      queryClient.setQueryData(
        communityGroupsKeys.detail(updatedGroup.id, user?.id),
        updatedGroup
      );
      
      // Invalidate groups list to reflect changes
      queryClient.invalidateQueries({ queryKey: communityGroupsKeys.lists() });
      
      toast.success('Community group updated successfully!');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to update community group';
      toast.error(message);
    },
  });
};

/**
 * Hook to delete a community group
 */
export const useDeleteCommunityGroup = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => {
      if (!user?.id) {
        throw new Error('User must be authenticated to delete a group');
      }
      return deleteCommunityGroup(groupId, user.id);
    },
    onSuccess: (_, groupId: string) => {
      // Remove the group from cache
      queryClient.removeQueries({ queryKey: communityGroupsKeys.detail(groupId, user?.id) });
      
      // Invalidate groups list
      queryClient.invalidateQueries({ queryKey: communityGroupsKeys.lists() });
      
      toast.success('Community group deleted successfully!');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to delete community group';
      toast.error(message);
    },
  });
};

/**
 * Hook to join a community group
 */
export const useJoinCommunityGroup = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => {
      if (!user?.id) {
        throw new Error('User must be authenticated to join a group');
      }
      return joinCommunityGroup(groupId, user.id);
    },
    onSuccess: (_, groupId: string) => {
      // Invalidate both the specific group and the groups list
      queryClient.invalidateQueries({ queryKey: communityGroupsKeys.detail(groupId, user?.id) });
      queryClient.invalidateQueries({ queryKey: communityGroupsKeys.lists() });
      
      toast.success('Successfully joined the community group!');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to join community group';
      toast.error(message);
    },
  });
};

/**
 * Hook to leave a community group
 */
export const useLeaveCommunityGroup = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => {
      if (!user?.id) {
        throw new Error('User must be authenticated to leave a group');
      }
      return leaveCommunityGroup(groupId, user.id);
    },
    onSuccess: (_, groupId: string) => {
      // Invalidate both the specific group and the groups list
      queryClient.invalidateQueries({ queryKey: communityGroupsKeys.detail(groupId, user?.id) });
      queryClient.invalidateQueries({ queryKey: communityGroupsKeys.lists() });
      
      toast.success('Successfully left the community group!');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to leave community group';
      toast.error(message);
    },
  });
};

/**
 * Hook to get loading and error states for community group operations
 */
export const useCommunityGroupsStatus = () => {
  const { data: groups, isLoading, error, isError } = useCommunityGroups();
  
  return {
    groups: groups || [],
    isLoading,
    error,
    isError,
    isEmpty: !isLoading && (!groups || groups.length === 0)
  };
};