import { supabase } from '@/integrations/supabase/client';
import type { GroupMember, GroupRole, UpdateMemberRoleRequest, RemoveMemberRequest, TransferOwnershipRequest } from '@/types/groupRoles';
import { ROLE_HIERARCHY, canManageRole, canAssignRole } from '@/types/groupRoles';

class GroupRoleError extends Error {
  code?: string;
  details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'GroupRoleError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Fetch all members of a group with their roles and profiles
 */
export const fetchGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
  try {
    const { data, error } = await supabase
      .from('group_memberships')
      .select(`
        id,
        user_id,
        group_id,
        role,
        joined_at,
        profiles!group_memberships_user_id_fkey (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (error) {
      // Try alternative query without foreign key hint
      const { data: altData, error: altError } = await supabase
        .from('group_memberships')
        .select('id, user_id, group_id, role, joined_at')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (altError) {
        throw new GroupRoleError('Failed to fetch group members', 'FETCH_MEMBERS_ERROR', altError);
      }

      // Fetch profiles separately
      const userIds = altData?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (altData || []).map(member => ({
        ...member,
        role: (member.role as GroupRole) || 'member',
        user_profile: profileMap.get(member.user_id) ? {
          username: profileMap.get(member.user_id)?.username || null,
          display_name: profileMap.get(member.user_id)?.display_name || null,
          avatar_url: profileMap.get(member.user_id)?.avatar_url || null,
        } : undefined,
      }));
    }

    return (data || []).map(member => ({
      id: member.id,
      user_id: member.user_id,
      group_id: member.group_id,
      role: (member.role as GroupRole) || 'member',
      joined_at: member.joined_at,
      user_profile: member.profiles ? {
        username: (member.profiles as any).username,
        display_name: (member.profiles as any).display_name,
        avatar_url: (member.profiles as any).avatar_url,
      } : undefined,
    }));
  } catch (error) {
    if (error instanceof GroupRoleError) throw error;
    throw new GroupRoleError('An unexpected error occurred while fetching members', 'UNEXPECTED_ERROR', error);
  }
};

/**
 * Get the current user's role in a group
 */
export const getUserGroupRole = async (groupId: string, userId: string): Promise<GroupRole | null> => {
  try {
    const { data, error } = await supabase
      .from('group_memberships')
      .select('role')
      .match({ group_id: groupId, user_id: userId })
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not a member
      throw new GroupRoleError('Failed to get user role', 'GET_ROLE_ERROR', error);
    }

    return (data?.role as GroupRole) || 'member';
  } catch (error) {
    if (error instanceof GroupRoleError) throw error;
    throw new GroupRoleError('An unexpected error occurred', 'UNEXPECTED_ERROR', error);
  }
};

/**
 * Update a member's role (only owners and admins can do this)
 */
export const updateMemberRole = async (
  request: UpdateMemberRoleRequest,
  actorUserId: string
): Promise<void> => {
  const { groupId, targetUserId, newRole } = request;

  try {
    // Get actor's role
    const actorRole = await getUserGroupRole(groupId, actorUserId);
    if (!actorRole) {
      throw new GroupRoleError('You are not a member of this group', 'NOT_MEMBER');
    }

    // Check if actor can manage roles
    if (!['owner', 'admin'].includes(actorRole)) {
      throw new GroupRoleError('You do not have permission to manage roles', 'PERMISSION_DENIED');
    }

    // Get target's current role
    const targetCurrentRole = await getUserGroupRole(groupId, targetUserId);
    if (!targetCurrentRole) {
      throw new GroupRoleError('Target user is not a member of this group', 'TARGET_NOT_MEMBER');
    }

    // Cannot change owner's role (must transfer ownership instead)
    if (targetCurrentRole === 'owner') {
      throw new GroupRoleError('Cannot change the owner\'s role. Transfer ownership instead.', 'CANNOT_CHANGE_OWNER');
    }

    // Check if actor can manage the target's role
    if (!canManageRole(actorRole, targetCurrentRole)) {
      throw new GroupRoleError('You cannot manage users with equal or higher roles', 'CANNOT_MANAGE_ROLE');
    }

    // Check if actor can assign the new role
    if (!canAssignRole(actorRole, newRole)) {
      throw new GroupRoleError(`You cannot assign the ${newRole} role`, 'CANNOT_ASSIGN_ROLE');
    }

    // Update the role
    const { error } = await supabase
      .from('group_memberships')
      .update({ role: newRole })
      .match({ group_id: groupId, user_id: targetUserId });

    if (error) {
      throw new GroupRoleError('Failed to update member role', 'UPDATE_ROLE_ERROR', error);
    }
  } catch (error) {
    if (error instanceof GroupRoleError) throw error;
    throw new GroupRoleError('An unexpected error occurred', 'UNEXPECTED_ERROR', error);
  }
};

/**
 * Remove a member from a group (only owners and admins can do this)
 */
export const removeMemberFromGroup = async (
  request: RemoveMemberRequest,
  actorUserId: string
): Promise<void> => {
  const { groupId, targetUserId } = request;

  try {
    // Can't remove yourself this way
    if (targetUserId === actorUserId) {
      throw new GroupRoleError('Use the leave group function instead', 'CANNOT_REMOVE_SELF');
    }

    // Get actor's role
    const actorRole = await getUserGroupRole(groupId, actorUserId);
    if (!actorRole) {
      throw new GroupRoleError('You are not a member of this group', 'NOT_MEMBER');
    }

    // Check if actor can manage members
    if (!['owner', 'admin'].includes(actorRole)) {
      throw new GroupRoleError('You do not have permission to remove members', 'PERMISSION_DENIED');
    }

    // Get target's role
    const targetRole = await getUserGroupRole(groupId, targetUserId);
    if (!targetRole) {
      throw new GroupRoleError('Target user is not a member of this group', 'TARGET_NOT_MEMBER');
    }

    // Cannot remove owner
    if (targetRole === 'owner') {
      throw new GroupRoleError('Cannot remove the owner from the group', 'CANNOT_REMOVE_OWNER');
    }

    // Check if actor can manage the target
    if (!canManageRole(actorRole, targetRole)) {
      throw new GroupRoleError('You cannot remove users with equal or higher roles', 'CANNOT_REMOVE_ROLE');
    }

    // Remove the member
    const { error } = await supabase
      .from('group_memberships')
      .delete()
      .match({ group_id: groupId, user_id: targetUserId });

    if (error) {
      throw new GroupRoleError('Failed to remove member', 'REMOVE_MEMBER_ERROR', error);
    }
  } catch (error) {
    if (error instanceof GroupRoleError) throw error;
    throw new GroupRoleError('An unexpected error occurred', 'UNEXPECTED_ERROR', error);
  }
};

/**
 * Transfer group ownership to another member (only owner can do this)
 */
export const transferGroupOwnership = async (
  request: TransferOwnershipRequest,
  actorUserId: string
): Promise<void> => {
  const { groupId, newOwnerId } = request;

  try {
    // Verify actor is the current owner
    const actorRole = await getUserGroupRole(groupId, actorUserId);
    if (actorRole !== 'owner') {
      throw new GroupRoleError('Only the owner can transfer ownership', 'NOT_OWNER');
    }

    // Verify new owner is a member
    const newOwnerRole = await getUserGroupRole(groupId, newOwnerId);
    if (!newOwnerRole) {
      throw new GroupRoleError('New owner must be a member of the group', 'NEW_OWNER_NOT_MEMBER');
    }

    // Update new owner's role to owner
    const { error: newOwnerError } = await supabase
      .from('group_memberships')
      .update({ role: 'owner' })
      .match({ group_id: groupId, user_id: newOwnerId });

    if (newOwnerError) {
      throw new GroupRoleError('Failed to set new owner', 'SET_NEW_OWNER_ERROR', newOwnerError);
    }

    // Demote current owner to admin
    const { error: demoteError } = await supabase
      .from('group_memberships')
      .update({ role: 'admin' })
      .match({ group_id: groupId, user_id: actorUserId });

    if (demoteError) {
      // Rollback the new owner change
      await supabase
        .from('group_memberships')
        .update({ role: newOwnerRole })
        .match({ group_id: groupId, user_id: newOwnerId });
      
      throw new GroupRoleError('Failed to demote previous owner', 'DEMOTE_OWNER_ERROR', demoteError);
    }

    // Update the community_groups table to reflect new owner
    const { error: groupError } = await supabase
      .from('community_groups')
      .update({ created_by: newOwnerId })
      .eq('id', groupId);

    if (groupError) {
      // Rollback changes
      await supabase
        .from('group_memberships')
        .update({ role: 'owner' })
        .match({ group_id: groupId, user_id: actorUserId });
      await supabase
        .from('group_memberships')
        .update({ role: newOwnerRole })
        .match({ group_id: groupId, user_id: newOwnerId });
      
      throw new GroupRoleError('Failed to update group ownership', 'UPDATE_GROUP_ERROR', groupError);
    }
  } catch (error) {
    if (error instanceof GroupRoleError) throw error;
    throw new GroupRoleError('An unexpected error occurred', 'UNEXPECTED_ERROR', error);
  }
};
