import { supabase } from '@/integrations/supabase/client';
import { ensureUserProfile } from './profileUtils';
import type { 
  CommunityGroup, 
  CommunityGroupUpdate,
  CreateGroupRequest,
  UpdateGroupRequest,
  CommunityGroupError
} from '@/types/community';

class CommunityGroupErrorClass extends Error implements CommunityGroupError {
  code?: string;
  details?: any;

  constructor(error: CommunityGroupError) {
    super(error.message);
    this.name = 'CommunityGroupError';
    this.code = error.code;
    this.details = error.details;
  }
}

/**
 * Fetch all community groups with membership information for the current user
 */
export const fetchCommunityGroups = async (userId?: string): Promise<CommunityGroup[]> => {
  try {
    console.log('Fetching community groups for user:', userId);
    
    // Test basic connectivity first
    const { data: healthCheck } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    
    console.log('Health check passed, proceeding with groups query');
    
    // Simple query without joins to avoid complex query issues
    const { data: groups, error } = await supabase
      .from('community_groups')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('Groups query result:', { groups, error });

    if (error) {
      console.error('Groups query error details:', error);
      throw new CommunityGroupErrorClass({
        message: 'Failed to fetch community groups',
        code: 'FETCH_GROUPS_ERROR',
        details: error
      });
    }

    if (!groups || groups.length === 0) {
      console.log('No groups found, returning empty array');
      return [];
    }

    // For now, return basic group data without complex membership calculations
    // This will help us identify if the issue is with the basic query or the joins
    const basicGroups: CommunityGroup[] = groups.map(group => ({
      ...group,
      member_count: 0, // Will be calculated separately if needed
      is_member: false, // Will be calculated separately if needed
      is_owner: userId ? group.owner_id === userId : false
    }));

    console.log('Returning basic groups:', basicGroups);
    return basicGroups;
  } catch (error) {
    if (error instanceof CommunityGroupErrorClass) {
      throw error;
    }
    throw new CommunityGroupErrorClass({
      message: 'An unexpected error occurred while fetching groups',
      details: error
    });
  }
};

/**
 * Fetch a single community group by ID with membership information
 */
export const fetchCommunityGroup = async (groupId: string, userId?: string): Promise<CommunityGroup | null> => {
  try {
    const { data: group, error } = await supabase
      .from('community_groups')
      .select(`
        *,
        group_memberships(count),
        owner_profile:profiles!community_groups_owner_id_fkey(username, display_name, avatar_url)
      `)
      .eq('id', groupId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Group not found
      }
      throw new CommunityGroupErrorClass({
        message: 'Failed to fetch community group',
        code: 'FETCH_GROUP_ERROR',
        details: error
      });
    }

    if (!group) return null;

    // Check if user is a member
    let isMember = false;
    if (userId) {
      const { data: membership } = await supabase
        .from('group_memberships')
        .select('id')
        .match({ group_id: groupId, user_id: userId })
        .single();
      
      isMember = !!membership;
    }

    return {
      ...group,
      member_count: Array.isArray(group.group_memberships) ? group.group_memberships.length : 0,
      is_member: isMember,
      is_owner: userId ? group.owner_id === userId : false
    };
  } catch (error) {
    if (error instanceof CommunityGroupErrorClass) {
      throw error;
    }
    throw new CommunityGroupErrorClass({
      message: 'An unexpected error occurred while fetching the group',
      details: error
    });
  }
};

/**
 * Create a new community group and automatically add the creator as a member
 */
export const createCommunityGroup = async (
  groupData: CreateGroupRequest, 
  userId: string
): Promise<CommunityGroup> => {
  try {
    // Ensure user profile exists
    await ensureUserProfile(userId);
    
    // Start a transaction-like operation
    const { data: group, error: groupError } = await supabase
      .from('community_groups')
      .insert({
        name: groupData.name.trim(),
        description: groupData.description.trim(),
        owner_id: userId
      })
      .select()
      .single();

    if (groupError) {
      if (groupError.code === '23505') { // Unique constraint violation
        throw new CommunityGroupErrorClass({
          message: 'A group with this name already exists',
          code: 'DUPLICATE_GROUP_NAME'
        });
      }
      throw new CommunityGroupErrorClass({
        message: 'Failed to create community group',
        code: 'CREATE_GROUP_ERROR',
        details: groupError
      });
    }

    if (!group) {
      throw new CommunityGroupErrorClass({
        message: 'Group creation failed - no data returned',
        code: 'CREATE_GROUP_NO_DATA'
      });
    }

    // Add the creator as the first member
    const { error: membershipError } = await supabase
      .from('group_memberships')
      .insert({
        group_id: group.id,
        user_id: userId
      });

    if (membershipError) {
      // If membership creation fails, we should clean up the group
      await supabase.from('community_groups').delete().eq('id', group.id);
      throw new CommunityGroupErrorClass({
        message: 'Failed to add creator as group member',
        code: 'CREATE_MEMBERSHIP_ERROR',
        details: membershipError
      });
    }

    return {
      ...group,
      member_count: 1,
      is_member: true,
      is_owner: true
    };
  } catch (error) {
    if (error instanceof CommunityGroupErrorClass) {
      throw error;
    }
    throw new CommunityGroupErrorClass({
      message: 'An unexpected error occurred while creating the group',
      details: error
    });
  }
};

/**
 * Update a community group (only owner can update)
 */
export const updateCommunityGroup = async (
  groupId: string,
  updates: UpdateGroupRequest,
  userId: string
): Promise<CommunityGroup> => {
  try {
    // First verify the user owns the group
    const { data: existingGroup, error: fetchError } = await supabase
      .from('community_groups')
      .select('owner_id')
      .eq('id', groupId)
      .single();

    if (fetchError) {
      throw new CommunityGroupErrorClass({
        message: 'Failed to verify group ownership',
        code: 'VERIFY_OWNERSHIP_ERROR',
        details: fetchError
      });
    }

    if (!existingGroup || existingGroup.owner_id !== userId) {
      throw new CommunityGroupErrorClass({
        message: 'You do not have permission to update this group',
        code: 'UNAUTHORIZED_UPDATE'
      });
    }

    // Prepare update data
    const updateData: CommunityGroupUpdate = {
      updated_at: new Date().toISOString()
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description.trim();
    }

    const { data: updatedGroup, error: updateError } = await supabase
      .from('community_groups')
      .update(updateData)
      .eq('id', groupId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === '23505') { // Unique constraint violation
        throw new CommunityGroupErrorClass({
          message: 'A group with this name already exists',
          code: 'DUPLICATE_GROUP_NAME'
        });
      }
      throw new CommunityGroupErrorClass({
        message: 'Failed to update community group',
        code: 'UPDATE_GROUP_ERROR',
        details: updateError
      });
    }

    if (!updatedGroup) {
      throw new CommunityGroupErrorClass({
        message: 'Group update failed - no data returned',
        code: 'UPDATE_GROUP_NO_DATA'
      });
    }

    // Fetch the updated group with membership info
    return await fetchCommunityGroup(groupId, userId) || updatedGroup;
  } catch (error) {
    if (error instanceof CommunityGroupErrorClass) {
      throw error;
    }
    throw new CommunityGroupErrorClass({
      message: 'An unexpected error occurred while updating the group',
      details: error
    });
  }
};

/**
 * Delete a community group (only owner can delete)
 */
export const deleteCommunityGroup = async (groupId: string, userId: string): Promise<void> => {
  try {
    // First verify the user owns the group
    const { data: existingGroup, error: fetchError } = await supabase
      .from('community_groups')
      .select('owner_id')
      .eq('id', groupId)
      .single();

    if (fetchError) {
      throw new CommunityGroupErrorClass({
        message: 'Failed to verify group ownership',
        code: 'VERIFY_OWNERSHIP_ERROR',
        details: fetchError
      });
    }

    if (!existingGroup || existingGroup.owner_id !== userId) {
      throw new CommunityGroupErrorClass({
        message: 'You do not have permission to delete this group',
        code: 'UNAUTHORIZED_DELETE'
      });
    }

    // Delete the group (cascade will handle memberships and messages)
    const { error: deleteError } = await supabase
      .from('community_groups')
      .delete()
      .eq('id', groupId);

    if (deleteError) {
      throw new CommunityGroupErrorClass({
        message: 'Failed to delete community group',
        code: 'DELETE_GROUP_ERROR',
        details: deleteError
      });
    }
  } catch (error) {
    if (error instanceof CommunityGroupErrorClass) {
      throw error;
    }
    throw new CommunityGroupErrorClass({
      message: 'An unexpected error occurred while deleting the group',
      details: error
    });
  }
};

/**
 * Join a community group
 */
export const joinCommunityGroup = async (groupId: string, userId: string): Promise<void> => {
  try {
    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('group_memberships')
      .select('id')
      .match({ group_id: groupId, user_id: userId })
      .single();

    if (existingMembership) {
      throw new CommunityGroupErrorClass({
        message: 'You are already a member of this group',
        code: 'ALREADY_MEMBER'
      });
    }

    // Add membership
    const { error: membershipError } = await supabase
      .from('group_memberships')
      .insert({
        group_id: groupId,
        user_id: userId
      });

    if (membershipError) {
      throw new CommunityGroupErrorClass({
        message: 'Failed to join community group',
        code: 'JOIN_GROUP_ERROR',
        details: membershipError
      });
    }
  } catch (error) {
    if (error instanceof CommunityGroupErrorClass) {
      throw error;
    }
    throw new CommunityGroupErrorClass({
      message: 'An unexpected error occurred while joining the group',
      details: error
    });
  }
};

/**
 * Leave a community group
 * Special handling for group owners: if owner leaves and there are other members,
 * the group is deleted to prevent orphaned groups
 */
export const leaveCommunityGroup = async (groupId: string, userId: string): Promise<void> => {
  try {
    // Check if user is a member and get group info
    const { data: groupInfo, error: groupError } = await supabase
      .from('community_groups')
      .select(`
        id,
        owner_id,
        name,
        group_memberships(count)
      `)
      .eq('id', groupId)
      .single();

    if (groupError) {
      throw new CommunityGroupErrorClass({
        message: 'Failed to fetch group information',
        code: 'FETCH_GROUP_ERROR',
        details: groupError
      });
    }

    if (!groupInfo) {
      throw new CommunityGroupErrorClass({
        message: 'Group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Check if user is a member
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('id')
      .match({ group_id: groupId, user_id: userId })
      .single();

    if (!membership) {
      throw new CommunityGroupErrorClass({
        message: 'You are not a member of this group',
        code: 'NOT_MEMBER'
      });
    }

    const isOwner = groupInfo.owner_id === userId;
    const memberCount = Array.isArray(groupInfo.group_memberships) ? groupInfo.group_memberships.length : 0;

    // If owner is leaving and there are other members, delete the entire group
    // This prevents orphaned groups without owners
    if (isOwner && memberCount > 1) {
      const { error: deleteError } = await supabase
        .from('community_groups')
        .delete()
        .eq('id', groupId);

      if (deleteError) {
        throw new CommunityGroupErrorClass({
          message: 'Failed to delete group when owner left',
          code: 'DELETE_ON_OWNER_LEAVE_ERROR',
          details: deleteError
        });
      }
      return; // Group deleted, no need to remove membership
    }

    // For non-owners or owners of single-member groups, just remove membership
    const { error: leaveError } = await supabase
      .from('group_memberships')
      .delete()
      .match({ group_id: groupId, user_id: userId });

    if (leaveError) {
      throw new CommunityGroupErrorClass({
        message: 'Failed to leave community group',
        code: 'LEAVE_GROUP_ERROR',
        details: leaveError
      });
    }

    // If owner left a single-member group, the group becomes empty but remains
    // This allows for the natural cleanup through the cascade delete when the group is eventually deleted
  } catch (error) {
    if (error instanceof CommunityGroupErrorClass) {
      throw error;
    }
    throw new CommunityGroupErrorClass({
      message: 'An unexpected error occurred while leaving the group',
      details: error
    });
  }
};