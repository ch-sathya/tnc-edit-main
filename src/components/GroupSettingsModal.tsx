import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUpdateCommunityGroup, useDeleteCommunityGroup } from '@/hooks/useCommunityGroups';
import { useGroupMembers, useTransferOwnership } from '@/hooks/useGroupMembers';
import { useAuth } from '@/hooks/useAuth';
import { Settings, Loader2, Trash2, Crown, AlertTriangle } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';
import type { CommunityGroup } from '@/types/community';

const updateGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name is required')
    .min(3, 'Group name must be at least 3 characters')
    .max(100, 'Group name must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
});

type UpdateGroupFormData = z.infer<typeof updateGroupSchema>;

interface GroupSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: CommunityGroup;
  onDeleted?: () => void;
}

const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  open,
  onOpenChange,
  group,
  onDeleted,
}) => {
  const { user } = useAuth();
  const updateGroupMutation = useUpdateCommunityGroup();
  const deleteGroupMutation = useDeleteCommunityGroup();
  const transferOwnershipMutation = useTransferOwnership();
  const { data: members } = useGroupMembers(group.id);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>('');

  const isOwner = group.is_owner;
  const otherMembers = members?.filter(m => m.user_id !== user?.id) || [];

  const form = useForm<UpdateGroupFormData>({
    resolver: zodResolver(updateGroupSchema),
    defaultValues: {
      name: group.name || '',
      description: group.description || '',
    },
  });

  const onSubmit = async (data: UpdateGroupFormData) => {
    try {
      await updateGroupMutation.mutateAsync({
        groupId: group.id,
        updates: {
          name: data.name.trim(),
          description: data.description.trim(),
        },
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    try {
      await deleteGroupMutation.mutateAsync(group.id);
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) return;
    
    try {
      await transferOwnershipMutation.mutateAsync({
        groupId: group.id,
        newOwnerId: selectedNewOwner,
      });
      setShowTransferConfirm(false);
      setSelectedNewOwner('');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = updateGroupMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Group Settings
            </DialogTitle>
            <DialogDescription>
              Manage settings for {group.name}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General</TabsTrigger>
              {isOwner && <TabsTrigger value="danger">Danger Zone</TabsTrigger>}
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter group name..."
                            disabled={isLoading || !isOwner}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your group..."
                            className="min-h-[100px] resize-none"
                            disabled={isLoading || !isOwner}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isOwner && (
                    <DialogFooter>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                    </DialogFooter>
                  )}
                </form>
              </Form>
            </TabsContent>

            {isOwner && (
              <TabsContent value="danger" className="space-y-6 mt-4">
                {/* Transfer Ownership */}
                {otherMembers.length > 0 && (
                  <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-amber-500" />
                      <h4 className="font-semibold">Transfer Ownership</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Transfer ownership of this group to another member. You will become an admin.
                    </p>
                    <div className="flex gap-2">
                      <Select 
                        value={selectedNewOwner} 
                        onValueChange={setSelectedNewOwner}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select new owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {otherMembers.map((member) => (
                            <SelectItem key={member.user_id} value={member.user_id}>
                              {member.user_profile?.display_name || 
                               member.user_profile?.username || 
                               'Anonymous User'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="outline"
                        onClick={() => setShowTransferConfirm(true)}
                        disabled={!selectedNewOwner || transferOwnershipMutation.isPending}
                      >
                        Transfer
                      </Button>
                    </div>
                  </div>
                )}

                {/* Delete Group */}
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <h4 className="font-semibold text-destructive">Delete Group</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this group and all its messages. This action cannot be undone.
                  </p>
                  <Button 
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteGroupMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Group
                  </Button>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        loading={deleteGroupMutation.isPending}
        title="Delete Community Group"
        description={`Are you sure you want to delete "${group.name}"? This will permanently remove the group and all its messages. This action cannot be undone.`}
        confirmText="Delete Group"
        variant="destructive"
      />

      <ConfirmationDialog
        open={showTransferConfirm}
        onOpenChange={setShowTransferConfirm}
        onConfirm={handleTransferOwnership}
        loading={transferOwnershipMutation.isPending}
        title="Transfer Ownership"
        description="Are you sure you want to transfer ownership? You will become an admin and the new owner will have full control over this group."
        confirmText="Transfer Ownership"
        variant="default"
      />
    </>
  );
};

export default GroupSettingsModal;
