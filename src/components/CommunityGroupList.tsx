import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  useCommunityGroups, 
  useJoinCommunityGroup, 
  useLeaveCommunityGroup, 
  useDeleteCommunityGroup 
} from '@/hooks/useCommunityGroups';
import { useAuth } from '@/hooks/useAuth';
import { Users, Crown, Plus, Trash2, UserMinus, UserPlus, AlertTriangle, MessageCircle } from 'lucide-react';
import { CommunityGroup } from '@/types/community';
import { toast } from 'sonner';
import ConfirmationDialog from './ConfirmationDialog';
import { CommunityGroupListSkeleton } from '@/components/LoadingSkeletons';
import RetryHandler from '@/components/RetryHandler';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface CommunityGroupListProps {
  onCreateGroup?: () => void;
  onGroupSelect?: (groupId: string) => void;
}

interface ConfirmationState {
  open: boolean;
  type: 'delete' | 'leave' | null;
  groupId: string;
  groupName: string;
  isOwnerLeaving: boolean;
}

const CommunityGroupList: React.FC<CommunityGroupListProps> = ({ onCreateGroup, onGroupSelect }) => {
  const { user } = useAuth();
  const { data: groups, isLoading, error, refetch } = useCommunityGroups();
  const joinGroupMutation = useJoinCommunityGroup();
  const leaveGroupMutation = useLeaveCommunityGroup();
  const deleteGroupMutation = useDeleteCommunityGroup();
  
  const errorHandler = useErrorHandler({
    showToast: true,
    retryable: true,
    maxRetries: 3
  });

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    open: false,
    type: null,
    groupId: '',
    groupName: '',
    isOwnerLeaving: false,
  });

  const handleJoinGroup = async (groupId: string) => {
    if (!user) {
      toast.error('You must be logged in to join a group');
      return;
    }

    setLoadingStates(prev => ({ ...prev, [groupId]: true }));
    try {
      await joinGroupMutation.mutateAsync(groupId);
    } finally {
      setLoadingStates(prev => ({ ...prev, [groupId]: false }));
    }
  };

  const handleLeaveGroup = (groupId: string, groupName: string, isOwner: boolean, memberCount: number) => {
    if (!user) {
      toast.error('You must be logged in to leave a group');
      return;
    }

    const isOwnerLeaving = isOwner && memberCount > 1;
    
    setConfirmation({
      open: true,
      type: 'leave',
      groupId,
      groupName,
      isOwnerLeaving,
    });
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    if (!user) {
      toast.error('You must be logged in to delete a group');
      return;
    }

    setConfirmation({
      open: true,
      type: 'delete',
      groupId,
      groupName,
      isOwnerLeaving: false,
    });
  };

  const executeAction = async () => {
    if (!confirmation.groupId || !confirmation.type) return;

    setLoadingStates(prev => ({ ...prev, [confirmation.groupId]: true }));
    try {
      if (confirmation.type === 'delete') {
        await deleteGroupMutation.mutateAsync(confirmation.groupId);
      } else if (confirmation.type === 'leave') {
        await leaveGroupMutation.mutateAsync(confirmation.groupId);
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, [confirmation.groupId]: false }));
    }
  };

  const getConfirmationContent = () => {
    if (confirmation.type === 'delete') {
      return {
        title: 'Delete Community Group',
        description: `Are you sure you want to delete "${confirmation.groupName}"? This will permanently remove the group and all its messages. This action cannot be undone.`,
        confirmText: 'Delete Group',
        variant: 'destructive' as const,
      };
    } else if (confirmation.type === 'leave') {
      if (confirmation.isOwnerLeaving) {
        return {
          title: 'Leave Community Group',
          description: `As the owner of "${confirmation.groupName}", leaving will permanently delete the group and all its messages for all members. This action cannot be undone.`,
          confirmText: 'Leave & Delete Group',
          variant: 'destructive' as const,
        };
      } else {
        return {
          title: 'Leave Community Group',
          description: `Are you sure you want to leave "${confirmation.groupName}"? You can rejoin later if needed.`,
          confirmText: 'Leave Group',
          variant: 'default' as const,
        };
      }
    }
    return {
      title: '',
      description: '',
      confirmText: 'Confirm',
      variant: 'default' as const,
    };
  };

  if (isLoading) {
    return <CommunityGroupListSkeleton count={6} />;
  }

  if (error) {
    return (
      <RetryHandler
        error={error}
        onRetry={async () => {
          await refetch();
        }}
        title="Failed to load community groups"
        description="There was an issue loading the community groups. This might be due to a network problem or server issue."
        maxRetries={3}
        showNetworkStatus={true}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Community Groups</h2>
          <Button onClick={onCreateGroup}>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </div>
      </RetryHandler>
    );
  }

  const isEmpty = !groups || groups.length === 0;

  return (
    <section className="space-y-6" aria-labelledby="community-groups-heading">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 id="community-groups-heading" className="text-xl sm:text-2xl font-bold">
            Community Groups
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {isEmpty ? 'No groups available' : `${groups?.length || 0} groups available`}
          </p>
        </div>
        <Button 
          onClick={onCreateGroup}
          className="min-h-[44px] w-full sm:w-auto" // Full width on mobile, auto on desktop
          aria-label="Create a new community group"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="sm:hidden">Create Group</span>
          <span className="hidden sm:inline">Create Group</span>
        </Button>
      </div>

      {isEmpty ? (
        <Card role="region" aria-labelledby="empty-state-heading">
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
            <h3 id="empty-state-heading" className="text-lg font-semibold mb-2">
              No Community Groups Yet
            </h3>
            <p className="text-muted-foreground mb-4">
              Be the first to create a community group and start connecting with other developers!
            </p>
            <Button 
              onClick={onCreateGroup}
              className="min-h-[44px]"
              aria-label="Create your first community group"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div 
          className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          role="grid"
          aria-label="Community groups list"
        >
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              isLoading={loadingStates[group.id] || false}
              onJoin={() => handleJoinGroup(group.id)}
              onLeave={() => handleLeaveGroup(group.id, group.name, group.is_owner || false, group.member_count || 0)}
              onDelete={() => handleDeleteGroup(group.id, group.name)}
              onSelect={() => onGroupSelect?.(group.id)}
            />
          ))}
        </div>
      )}

      <ConfirmationDialog
        open={confirmation.open}
        onOpenChange={(open) => setConfirmation(prev => ({ ...prev, open }))}
        onConfirm={executeAction}
        loading={confirmation.groupId ? loadingStates[confirmation.groupId] : false}
        {...getConfirmationContent()}
      />
    </section>
  );
};

interface GroupCardProps {
  group: CommunityGroup;
  isLoading: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onDelete: () => void;
  onSelect?: () => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ 
  group, 
  isLoading, 
  onJoin, 
  onLeave, 
  onDelete,
  onSelect
}) => {
  const { user } = useAuth();

  const renderActionButton = () => {
    if (!user) {
      return (
        <Button 
          variant="outline" 
          disabled
          className="w-full min-h-[44px]"
          aria-label="Login required to join group"
        >
          Login to Join
        </Button>
      );
    }

    if (group.is_owner) {
      const memberCount = group.member_count || 0;
      const willDeleteGroup = memberCount > 1;
      
      return (
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <Button 
            variant={willDeleteGroup ? "destructive" : "outline"}
            onClick={onLeave}
            disabled={isLoading}
            className="flex-1 min-h-[44px]"
            aria-label={willDeleteGroup ? 
              `Leave group ${group.name} and delete it for all members` : 
              `Leave group ${group.name}`
            }
          >
            {willDeleteGroup ? (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Leave & Delete</span>
                <span className="sm:hidden">Leave & Delete</span>
              </>
            ) : (
              <>
                <UserMinus className="h-4 w-4 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Leave</span>
                <span className="sm:hidden">Leave</span>
              </>
            )}
          </Button>
          <Button 
            variant="destructive" 
            onClick={onDelete}
            disabled={isLoading}
            className="min-h-[44px] min-w-[44px] sm:w-auto"
            aria-label={`Delete group ${group.name} permanently`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="ml-2 sm:hidden">Delete</span>
          </Button>
        </div>
      );
    }

    if (group.is_member) {
      return (
        <Button 
          variant="outline" 
          onClick={onLeave}
          disabled={isLoading}
          className="w-full min-h-[44px]"
          aria-label={`Leave group ${group.name}`}
        >
          <UserMinus className="h-4 w-4 mr-2" aria-hidden="true" />
          Leave Group
        </Button>
      );
    }

    return (
      <Button 
        onClick={onJoin}
        disabled={isLoading}
        className="w-full min-h-[44px]"
        aria-label={`Join group ${group.name}`}
      >
        <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
        Join Group
      </Button>
    );
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      role="gridcell"
      aria-labelledby={`group-title-${group.id}`}
      aria-describedby={`group-description-${group.id} group-members-${group.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle 
            id={`group-title-${group.id}`}
            className="text-base sm:text-lg line-clamp-2 flex-1"
          >
            {group.name}
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-1 flex-shrink-0">
            {group.is_owner && (
              <Badge variant="secondary" className="text-xs">
                <Crown className="h-3 w-3 mr-1" aria-hidden="true" />
                Owner
              </Badge>
            )}
            {group.is_member && !group.is_owner && (
              <Badge variant="outline" className="text-xs">
                Member
              </Badge>
            )}
          </div>
        </div>
        <CardDescription 
          id={`group-description-${group.id}`}
          className="line-clamp-3 text-sm"
        >
          {group.description || 'No description provided'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div 
          id={`group-members-${group.id}`}
          className="flex items-center text-sm text-muted-foreground"
          aria-label={`${group.member_count || 0} members in this group`}
        >
          <Users className="h-4 w-4 mr-1" aria-hidden="true" />
          <span>
            {group.member_count || 0} {group.member_count === 1 ? 'member' : 'members'}
          </span>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 space-y-2">
        {/* Chat button for members */}
        {group.is_member && onSelect && (
          <Button 
            onClick={() => onSelect()}
            variant="outline"
            className="w-full min-h-[44px]"
            aria-label={`Open chat for group ${group.name}`}
            disabled={isLoading}
          >
            <MessageCircle className="h-4 w-4 mr-2" aria-hidden="true" />
            {isLoading ? 'Loading...' : 'Open Chat'}
          </Button>
        )}
        
        {/* Action buttons */}
        {renderActionButton()}
      </CardFooter>
    </Card>
  );
};

export default CommunityGroupList;