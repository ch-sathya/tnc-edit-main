import React from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCreateCommunityGroup } from '@/hooks/useCommunityGroups';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

// Form validation schema
const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name is required')
    .min(3, 'Group name must be at least 3 characters')
    .max(100, 'Group name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Group name can only contain letters, numbers, spaces, hyphens, and underscores')
    .refine((name) => name.trim().length > 0, 'Group name cannot be empty or just spaces'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters')
    .refine((desc) => desc.trim().length > 0, 'Description cannot be empty or just spaces'),
});

type CreateGroupFormData = z.infer<typeof createGroupSchema>;

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ open, onOpenChange }) => {
  const createGroupMutation = useCreateCommunityGroup();

  const form = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (data: CreateGroupFormData) => {
    try {
      const result = await createGroupMutation.mutateAsync({
        name: data.name.trim(),
        description: data.description.trim(),
      });
      
      // Reset form and close modal on success
      form.reset();
      onOpenChange(false);
      
      // Show success message
      toast.success(`Community group "${result.name}" created successfully!`);
    } catch (error) {
      // Error handling is done in the mutation hook with toast notifications
      // We don't need to do anything here as the form will stay open
      console.error('Failed to create group:', error);
      
      // Show additional error context if available
      if (error instanceof Error) {
        if (error.message.includes('profile')) {
          toast.error('Please complete your profile setup before creating a group.');
        } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          toast.error('A group with this name already exists. Please choose a different name.');
        }
      }
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing modal
      form.reset();
    }
    onOpenChange(newOpen);
  };

  const isLoading = createGroupMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto"
        aria-describedby="create-group-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" aria-hidden="true" />
            Create Community Group
          </DialogTitle>
          <DialogDescription id="create-group-description">
            Create a new community group to connect with other developers and start discussions.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="group-name">Group Name</FormLabel>
                  <FormControl>
                    <Input
                      id="group-name"
                      placeholder="Enter group name..."
                      disabled={isLoading}
                      className="min-h-[44px]"
                      aria-describedby="group-name-error"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage id="group-name-error" role="alert" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="group-description">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      id="group-description"
                      placeholder="Describe what this group is about..."
                      className="min-h-[100px] resize-none"
                      disabled={isLoading}
                      aria-describedby="group-description-error"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage id="group-description-error" role="alert" />
                </FormItem>
              )}
            />

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
                className="min-h-[44px] w-full sm:w-auto"
                aria-label="Cancel group creation"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="min-h-[44px] w-full sm:w-auto"
                aria-label={isLoading ? "Creating group..." : "Create community group"}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {isLoading ? 'Creating...' : 'Create Group'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;