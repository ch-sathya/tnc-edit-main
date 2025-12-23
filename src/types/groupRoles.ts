// Group role types
export type GroupRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  role: GroupRole;
  joined_at: string;
  user_profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface UpdateMemberRoleRequest {
  groupId: string;
  targetUserId: string;
  newRole: GroupRole;
}

export interface RemoveMemberRequest {
  groupId: string;
  targetUserId: string;
}

export interface TransferOwnershipRequest {
  groupId: string;
  newOwnerId: string;
}

// Role hierarchy for permission checking
export const ROLE_HIERARCHY: Record<GroupRole, number> = {
  owner: 4,
  admin: 3,
  moderator: 2,
  member: 1,
};

// Check if a role can perform actions on another role
export const canManageRole = (actorRole: GroupRole, targetRole: GroupRole): boolean => {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
};

// Roles that can be assigned by each role
export const ASSIGNABLE_ROLES: Record<GroupRole, GroupRole[]> = {
  owner: ['admin', 'moderator', 'member'],
  admin: ['moderator', 'member'],
  moderator: [],
  member: [],
};

// Check if a role can assign another role
export const canAssignRole = (actorRole: GroupRole, targetRole: GroupRole): boolean => {
  return ASSIGNABLE_ROLES[actorRole]?.includes(targetRole) || false;
};

// Get display name for a role
export const getRoleDisplayName = (role: GroupRole): string => {
  const names: Record<GroupRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    moderator: 'Moderator',
    member: 'Member',
  };
  return names[role] || 'Member';
};

// Get role badge variant
export const getRoleBadgeVariant = (role: GroupRole): 'default' | 'secondary' | 'outline' | 'destructive' => {
  const variants: Record<GroupRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    owner: 'default',
    admin: 'secondary',
    moderator: 'outline',
    member: 'outline',
  };
  return variants[role] || 'outline';
};
