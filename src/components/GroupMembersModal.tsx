import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGroupMembers, useUserGroupRole, useUpdateMemberRole, useRemoveMember } from '@/hooks/useGroupMembers';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  MoreVertical, 
  Crown, 
  Shield, 
  UserCog, 
  User,
  UserMinus,
  Loader2,
  ChevronDown 
} from 'lucide-react';
import type { GroupMember, GroupRole } from '@/types/groupRoles';
import { getRoleDisplayName, getRoleBadgeVariant, canManageRole, canAssignRole, ASSIGNABLE_ROLES } from '@/types/groupRoles';
import ConfirmationDialog from './ConfirmationDialog';

interface GroupMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
}

const GroupMembersModal: React.FC<GroupMembersModalProps> = ({
  open,
  onOpenChange,
  groupId,
  groupName,
}) => {
  const { user } = useAuth();
  const { data: members, isLoading } = useGroupMembers(groupId);
  const { data: userRole } = useUserGroupRole(groupId);
  const updateRoleMutation = useUpdateMemberRole();
  const removeMemberMutation = useRemoveMember();

  const [confirmRemove, setConfirmRemove] = useState<{ open: boolean; member: GroupMember | null }>({
    open: false,
    member: null,
  });

  const canManageMembers = userRole === 'owner' || userRole === 'admin';

  const getRoleIcon = (role: GroupRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3" />;
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'moderator':
        return <UserCog className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getDisplayName = (member: GroupMember) => {
    return member.user_profile?.display_name || 
           member.user_profile?.username || 
           'Anonymous User';
  };

  const getInitials = (member: GroupMember) => {
    const name = getDisplayName(member);
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRoleChange = (member: GroupMember, newRole: GroupRole) => {
    updateRoleMutation.mutate({
      groupId,
      targetUserId: member.user_id,
      newRole,
    });
  };

  const handleRemoveMember = () => {
    if (!confirmRemove.member) return;
    
    removeMemberMutation.mutate({
      groupId,
      targetUserId: confirmRemove.member.user_id,
    }, {
      onSuccess: () => {
        setConfirmRemove({ open: false, member: null });
      },
    });
  };

  const getAssignableRoles = (targetRole: GroupRole): GroupRole[] => {
    if (!userRole) return [];
    return ASSIGNABLE_ROLES[userRole]?.filter(role => role !== targetRole) || [];
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members of {groupName}
            </DialogTitle>
            <DialogDescription>
              {members?.length || 0} members in this group
              {canManageMembers && ' • Click the menu icon to manage roles'}
            </DialogDescription>
          </DialogHeader>

          {/* Role management hint for owners/admins */}
          {canManageMembers && (
            <div className="bg-muted/50 border rounded-lg p-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                <span>As {userRole}, you can promote members, change roles, or remove members using the menu on each member.</span>
              </div>
            </div>
          )}

          <ScrollArea className="max-h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !members?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No members found
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const isCurrentUser = member.user_id === user?.id;
                  const canManage =
                    canManageMembers &&
                    !isCurrentUser &&
                    member.role !== 'owner' &&
                    userRole &&
                    canManageRole(userRole, member.role);

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={member.user_profile?.avatar_url || undefined}
                            alt={getDisplayName(member)}
                          />
                          <AvatarFallback>{getInitials(member)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {getDisplayName(member)}
                              {isCurrentUser && (
                                <span className="text-xs text-muted-foreground ml-1">(you)</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs gap-1">
                              {getRoleIcon(member.role)}
                              {getRoleDisplayName(member.role)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Manage this member">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {getAssignableRoles(member.role).length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                  Change Role
                                </div>
                                {getAssignableRoles(member.role).map((role) => (
                                  <DropdownMenuItem
                                    key={role}
                                    onClick={() => handleRoleChange(member, role)}
                                    disabled={updateRoleMutation.isPending}
                                  >
                                    {getRoleIcon(role)}
                                    <span className="ml-2">Make {getRoleDisplayName(role)}</span>
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => setConfirmRemove({ open: true, member })}
                              className="text-destructive focus:text-destructive"
                              disabled={removeMemberMutation.isPending}
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove from Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={confirmRemove.open}
        onOpenChange={(open) => setConfirmRemove({ ...confirmRemove, open })}
        onConfirm={handleRemoveMember}
        loading={removeMemberMutation.isPending}
        title="Remove Member"
        description={`Are you sure you want to remove ${
          confirmRemove.member ? getDisplayName(confirmRemove.member) : 'this member'
        } from ${groupName}? They can rejoin later if needed.`}
        confirmText="Remove Member"
        variant="destructive"
      />
    </>
  );
};

export default GroupMembersModal;
