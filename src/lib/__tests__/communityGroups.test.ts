import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchCommunityGroups,
  fetchCommunityGroup,
  createCommunityGroup,
  updateCommunityGroup,
  deleteCommunityGroup,
  joinCommunityGroup,
  leaveCommunityGroup
} from '../communityGroups';

// Mock the supabase client
vi.mock('@/integrations/supabase/client');

const mockSupabase = supabase as any;

describe('Community Groups Data Access Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchCommunityGroups', () => {
    it('should fetch community groups successfully', async () => {
      const mockGroups = [
        {
          id: '1',
          name: 'Test Group',
          description: 'Test Description',
          owner_id: 'user1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          group_memberships: [{ count: 5 }]
        }
      ];

      const mockMemberships = [{ group_id: '1' }];

      // Mock the groups query
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockGroups, error: null })
      });

      // Mock the membership query
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockMemberships, error: null })
      });

      const result = await fetchCommunityGroups('user1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '1',
        name: 'Test Group',
        member_count: 1,
        is_member: true,
        is_owner: true
      });
    });

    it('should handle fetch error', async () => {
      const mockError = { message: 'Database error', code: 'DB_ERROR' };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError })
      });

      await expect(fetchCommunityGroups('user1')).rejects.toThrow('Failed to fetch community groups');
    });

    it('should return empty array when no groups exist', async () => {
      // Mock the groups query
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      });

      // Mock the membership query (won't be called but need to be ready)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      });

      const result = await fetchCommunityGroups('user1');
      expect(result).toEqual([]);
    });
  });

  describe('fetchCommunityGroup', () => {
    it('should fetch a single community group successfully', async () => {
      const mockGroup = {
        id: '1',
        name: 'Test Group',
        description: 'Test Description',
        owner_id: 'user1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        group_memberships: [{ count: 5 }]
      };

      const mockMembership = { id: 'membership1' };

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
      }).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        match: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMembership, error: null })
      });

      const result = await fetchCommunityGroup('1', 'user1');

      expect(result).toMatchObject({
        id: '1',
        name: 'Test Group',
        member_count: 1,
        is_member: true,
        is_owner: true
      });
    });

    it('should return null when group not found', async () => {
      const mockError = { code: 'PGRST116' };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError })
      });

      const result = await fetchCommunityGroup('nonexistent', 'user1');
      expect(result).toBeNull();
    });
  });

  describe('createCommunityGroup', () => {
    it('should create a community group successfully', async () => {
      const mockGroup = {
        id: '1',
        name: 'New Group',
        description: 'New Description',
        owner_id: 'user1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
      }).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null })
      });

      const result = await createCommunityGroup(
        { name: 'New Group', description: 'New Description' },
        'user1'
      );

      expect(result).toMatchObject({
        id: '1',
        name: 'New Group',
        member_count: 1,
        is_member: true,
        is_owner: true
      });
    });

    it('should handle duplicate group name error', async () => {
      const mockError = { code: '23505', message: 'Unique constraint violation' };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError })
      });

      await expect(createCommunityGroup(
        { name: 'Duplicate Group', description: 'Description' },
        'user1'
      )).rejects.toThrow('A group with this name already exists');
    });

    it('should clean up group if membership creation fails', async () => {
      const mockGroup = {
        id: '1',
        name: 'New Group',
        description: 'New Description',
        owner_id: 'user1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const membershipError = { message: 'Membership creation failed' };

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
      }).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: membershipError })
      }).mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      await expect(createCommunityGroup(
        { name: 'New Group', description: 'New Description' },
        'user1'
      )).rejects.toThrow('Failed to add creator as group member');
    });
  });

  describe('updateCommunityGroup', () => {
    it('should update a community group successfully', async () => {
      const mockExistingGroup = { owner_id: 'user1' };
      const mockUpdatedGroup = {
        id: '1',
        name: 'Updated Group',
        description: 'Updated Description',
        owner_id: 'user1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z'
      };

      // Mock ownership verification
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockExistingGroup, error: null })
      });

      // Mock update operation
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedGroup, error: null })
      });

      // Mock fetchCommunityGroup call at the end
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedGroup, error: null })
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        match: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'membership1' }, error: null })
      });

      const result = await updateCommunityGroup(
        '1',
        { name: 'Updated Group', description: 'Updated Description' },
        'user1'
      );

      expect(result.name).toBe('Updated Group');
      expect(result.description).toBe('Updated Description');
    });

    it('should reject update from non-owner', async () => {
      const mockExistingGroup = { owner_id: 'user1' };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockExistingGroup, error: null })
      });

      await expect(updateCommunityGroup(
        '1',
        { name: 'Updated Group' },
        'user2'
      )).rejects.toThrow('You do not have permission to update this group');
    });
  });

  describe('deleteCommunityGroup', () => {
    it('should delete a community group successfully', async () => {
      const mockExistingGroup = { owner_id: 'user1' };

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockExistingGroup, error: null })
      }).mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      await expect(deleteCommunityGroup('1', 'user1')).resolves.not.toThrow();
    });

    it('should reject delete from non-owner', async () => {
      const mockExistingGroup = { owner_id: 'user1' };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockExistingGroup, error: null })
      });

      await expect(deleteCommunityGroup('1', 'user2')).rejects.toThrow(
        'You do not have permission to delete this group'
      );
    });
  });

  describe('joinCommunityGroup', () => {
    it('should join a community group successfully', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        match: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      }).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null })
      });

      await expect(joinCommunityGroup('1', 'user1')).resolves.not.toThrow();
    });

    it('should reject joining if already a member', async () => {
      const mockMembership = { id: 'membership1' };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        match: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMembership, error: null })
      });

      await expect(joinCommunityGroup('1', 'user1')).rejects.toThrow(
        'You are already a member of this group'
      );
    });
  });

  describe('leaveCommunityGroup', () => {
    it('should leave a community group successfully as non-owner', async () => {
      const mockGroupInfo = {
        id: '1',
        owner_id: 'user2', // Different user is owner
        name: 'Test Group',
        group_memberships: [{}, {}] // Array with 2 items representing 2 members
      };
      const mockMembership = { id: 'membership1' };

      // Mock group info fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockGroupInfo, error: null })
      });

      // Mock membership check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        match: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMembership, error: null })
      });

      // Mock delete membership operation
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        match: vi.fn().mockResolvedValue({ error: null })
      });

      await expect(leaveCommunityGroup('1', 'user1')).resolves.not.toThrow();
    });

    it('should delete group when owner leaves with other members', async () => {
      const mockGroupInfo = {
        id: '1',
        owner_id: 'user1', // Current user is owner
        name: 'Test Group',
        group_memberships: [{}, {}, {}] // Array with 3 items representing 3 members
      };
      const mockMembership = { id: 'membership1' };

      // Mock group info fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockGroupInfo, error: null })
      });

      // Mock membership check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        match: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMembership, error: null })
      });

      // Mock delete group operation (not membership delete)
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      await expect(leaveCommunityGroup('1', 'user1')).resolves.not.toThrow();
    });

    it('should leave normally when owner leaves single-member group', async () => {
      const mockGroupInfo = {
        id: '1',
        owner_id: 'user1', // Current user is owner
        name: 'Test Group',
        group_memberships: [{}] // Array with 1 item representing 1 member
      };
      const mockMembership = { id: 'membership1' };

      // Mock group info fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockGroupInfo, error: null })
      });

      // Mock membership check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        match: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMembership, error: null })
      });

      // Mock delete membership operation
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        match: vi.fn().mockResolvedValue({ error: null })
      });

      await expect(leaveCommunityGroup('1', 'user1')).resolves.not.toThrow();
    });

    it('should reject leaving if not a member', async () => {
      const mockGroupInfo = {
        id: '1',
        owner_id: 'user2',
        name: 'Test Group',
        group_memberships: [{}, {}] // Array with 2 items representing 2 members
      };

      // Mock group info fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockGroupInfo, error: null })
      });

      // Mock membership check (no membership found)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        match: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      });

      await expect(leaveCommunityGroup('1', 'user1')).rejects.toThrow(
        'You are not a member of this group'
      );
    });

    it('should handle group not found error', async () => {
      const mockError = { message: 'Group not found' };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError })
      });

      await expect(leaveCommunityGroup('1', 'user1')).rejects.toThrow(
        'Failed to fetch group information'
      );
    });
  });
});