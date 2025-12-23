import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  fetchGroupMembers,
  getUserGroupRole,
  updateMemberRole,
  removeMemberFromGroup,
  transferGroupOwnership,
} from '@/lib/groupRoleManagement';
import type { GroupRole, UpdateMemberRoleRequest, RemoveMemberRequest, TransferOwnershipRequest } from '@/types/groupRoles';
import { toast } from 'sonner';
import { communityGroupsKeys } from './useCommunityGroups';

// Query keys for group members
export const groupMembersKeys = {
  all: ['groupMembers'] as const,
  lists: () => [...groupMembersKeys.all, 'list'] as const,
  list: (groupId: string) => [...groupMembersKeys.lists(), groupId] as const,
  role: (groupId: string, userId: string) => [...groupMembersKeys.all, 'role', groupId, userId] as const,
};

/**
 * Hook to fetch all members of a group
 */
export const useGroupMembers = (groupId: string) => {
  return useQuery({
    queryKey: groupMembersKeys.list(groupId),
    queryFn: () => fetchGroupMembers(groupId),
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get the current user's role in a group
 */
export const useUserGroupRole = (groupId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: groupMembersKeys.role(groupId, user?.id || ''),
    queryFn: () => getUserGroupRole(groupId, user!.id),
    enabled: !!groupId && !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook to update a member's role
 */
export const useUpdateMemberRole = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateMemberRoleRequest) => {
      if (!user?.id) {
        throw new Error('User must be authenticated');
      }
      return updateMemberRole(request, user.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupMembersKeys.list(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: communityGroupsKeys.lists() });
      toast.success('Member role updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update member role');
    },
  });
};

/**
 * Hook to remove a member from a group
 */
export const useRemoveMember = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RemoveMemberRequest) => {
      if (!user?.id) {
        throw new Error('User must be authenticated');
      }
      return removeMemberFromGroup(request, user.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupMembersKeys.list(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: communityGroupsKeys.lists() });
      toast.success('Member removed from group');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to remove member');
    },
  });
};

/**
 * Hook to transfer group ownership
 */
export const useTransferOwnership = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: TransferOwnershipRequest) => {
      if (!user?.id) {
        throw new Error('User must be authenticated');
      }
      return transferGroupOwnership(request, user.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupMembersKeys.list(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: communityGroupsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: communityGroupsKeys.details() });
      toast.success('Ownership transferred successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to transfer ownership');
    },
  });
};
