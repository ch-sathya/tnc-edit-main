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
    
    // First, try a simple query to check if the table exists and is accessible
    let groups, error;
    
    try {
      const result = await supabase
        .from('community_groups')
        .select('*')
        .order('created_at', { ascending: false });
      
      groups = result.data;
      error = result.error;
    } catch (queryError) {
      console.error('Database query failed:', queryError);
      // If there's a fundamental issue with the database connection, return empty array
      console.warn('Database not accessible, returning empty array for community groups');
      return [];
    }
    
    console.log('Groups query result:', { groups, error });

    if (error) {
      console.error('Groups query error details:', error);
      
      // If the table doesn't exist or there's a permission issue, return empty array
      // This allows the app to function even if the community feature isn't fully set up
      if (error.code === '42P01' || error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('Community groups table not found or not accessible, returning empty array');
        return [];
      }
      
      // For other errors, also return empty array to prevent app crash
      console.warn('Community groups query failed, returning empty array:', error);
      return [];
    }

    if (!groups || groups.length === 0) {
      console.log('No groups found, returning empty array');
      return [];
    }

    // Calculate membership information for each group if user is provided
    const groupsWithMembership: CommunityGroup[] = [];
    
    for (const group of groups) {
      let memberCount = 0;
      let isMember = false;
      
      // Get member count - skip if database not available
      try {
        const result = await supabase
          .from('group_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);
        
        memberCount = result.count || 0;
      } catch (membershipError) {
        console.warn('Failed to get member count for group', group.id, membershipError);
        memberCount = 0;
      }
      
      // Check if current user is a member - use maybeSingle to avoid errors when not found
      if (userId) {
        try {
          const result = await supabase
            .from('group_memberships')
            .select('id')
            .match({ group_id: group.id, user_id: userId })
            .maybeSingle();

          isMember = !!result.data;
        } catch (membershipError) {
          console.warn('Failed to check membership for group', group.id, membershipError);
          isMember = false;
        }
      }
      
      groupsWithMembership.push({
        ...group,
        member_count: memberCount,
        is_member: isMember,
        is_owner: userId ? group.created_by === userId : false
      });
    }

    console.log('Returning groups with membership info:', groupsWithMembership);
    return groupsWithMembership;
  } catch (error) {
    console.error('Error in fetchCommunityGroups:', error);
    
    if (error instanceof CommunityGroupErrorClass) {
      throw error;
    }
    
    // For any unexpected errors, return empty array to prevent app crash
    console.warn('Unexpected error fetching community groups, returning empty array:', error);
    return [];
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
        group_memberships(count)
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
      is_owner: userId ? group.created_by === userId : false
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
 * Create a new community group.
 *
 * Note: The database has triggers that automatically add the creator as a member.
 */
export const createCommunityGroup = async (
  groupData: CreateGroupRequest,
  userId: string
): Promise<CommunityGroup> => {
  try {
    // Ensure user profile exists
    await ensureUserProfile(userId);

    const { data: group, error: groupError } = await supabase
      .from('community_groups')
      .insert({
        name: groupData.name.trim(),
        description: groupData.description.trim(),
        created_by: userId,
      })
      .select()
      .single();

    if (groupError) {
      if (groupError.code === '23505') {
        throw new CommunityGroupErrorClass({
          message: 'A group with this name already exists',
          code: 'DUPLICATE_GROUP_NAME',
        });
      }
      throw new CommunityGroupErrorClass({
        message: 'Failed to create community group',
        code: 'CREATE_GROUP_ERROR',
        details: groupError,
      });
    }

    if (!group) {
      throw new CommunityGroupErrorClass({
        message: 'Group creation failed - no data returned',
        code: 'CREATE_GROUP_NO_DATA',
      });
    }

    // Creator membership is added by DB trigger (auto_add_group_creator_trigger).
    return {
      ...group,
      member_count: 1,
      is_member: true,
      is_owner: true,
    };
  } catch (error) {
    if (error instanceof CommunityGroupErrorClass) {
      throw error;
    }
    throw new CommunityGroupErrorClass({
      message: 'An unexpected error occurred while creating the group',
      details: error,
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
      .select('created_by')
      .eq('id', groupId)
      .single();

    if (fetchError) {
      throw new CommunityGroupErrorClass({
        message: 'Failed to verify group ownership',
        code: 'VERIFY_OWNERSHIP_ERROR',
        details: fetchError
      });
    }

    if (!existingGroup || existingGroup.created_by !== userId) {
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
      .select('created_by')
      .eq('id', groupId)
      .single();

    if (fetchError) {
      throw new CommunityGroupErrorClass({
        message: 'Failed to verify group ownership',
        code: 'VERIFY_OWNERSHIP_ERROR',
        details: fetchError
      });
    }

    if (!existingGroup || existingGroup.created_by !== userId) {
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
        created_by,
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

    const isOwner = groupInfo.created_by === userId;
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