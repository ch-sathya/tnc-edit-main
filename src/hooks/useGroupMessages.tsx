import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  fetchGroupMessages,
  sendGroupMessage,
  deleteGroupMessage,
  subscribeToGroupMessages,
  unsubscribeFromGroupMessages
} from '@/lib/groupMessages';
import type { 
  GroupMessage, 
  SendMessageRequest,
  MessagePaginationOptions
} from '@/types/community';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

// Query keys
export const groupMessagesKeys = {
  all: ['groupMessages'] as const,
  lists: () => [...groupMessagesKeys.all, 'list'] as const,
  list: (groupId: string, userId?: string) => [...groupMessagesKeys.lists(), groupId, userId] as const,
  infinite: (groupId: string, userId?: string) => [...groupMessagesKeys.all, 'infinite', groupId, userId] as const,
};

/**
 * Hook to fetch group messages with pagination
 */
export const useGroupMessages = (
  groupId: string,
  options: MessagePaginationOptions = {}
) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: groupMessagesKeys.list(groupId, user?.id),
    queryFn: () => {
      if (!user?.id) {
        throw new Error('User must be authenticated to fetch messages');
      }
      return fetchGroupMessages(groupId, user.id, options);
    },
    enabled: !!groupId && !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry auth errors, but retry network/server errors
      if (error?.message?.includes('authenticated')) {
        return false;
      }
      if (error?.message?.includes('network') || error?.message?.includes('fetch') || error?.status >= 500) {
        return failureCount < 3;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook to fetch group messages with infinite scroll
 */
export const useInfiniteGroupMessages = (groupId: string) => {
  const { user } = useAuth();
  
  return useInfiniteQuery({
    queryKey: groupMessagesKeys.infinite(groupId, user?.id),
    queryFn: ({ pageParam }) => {
      if (!user?.id) {
        throw new Error('User must be authenticated to fetch messages');
      }
      return fetchGroupMessages(groupId, user.id, {
        limit: 50,
        cursor: pageParam
      });
    },
    enabled: !!groupId && !!user?.id,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to send a message to a group
 */
export const useSendGroupMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageData: SendMessageRequest) => {
      if (!user?.id) {
        throw new Error('User must be authenticated to send messages');
      }
      return sendGroupMessage(messageData, user.id);
    },
    onSuccess: (newMessage: GroupMessage) => {
      // Add the new message to the cache
      queryClient.setQueryData(
        groupMessagesKeys.list(newMessage.group_id, user?.id),
        (oldData: any) => {
          if (!oldData) return { messages: [newMessage], total: 1, hasMore: false };
          return {
            ...oldData,
            messages: [...oldData.messages, newMessage],
            total: oldData.total + 1
          };
        }
      );

      // Also update infinite query cache
      queryClient.setQueryData(
        groupMessagesKeys.infinite(newMessage.group_id, user?.id),
        (oldData: any) => {
          if (!oldData) return {
            pages: [{ messages: [newMessage], total: 1, hasMore: false }],
            pageParams: [undefined]
          };
          
          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            const lastPage = { ...newPages[newPages.length - 1] };
            lastPage.messages = [...lastPage.messages, newMessage];
            lastPage.total = lastPage.total + 1;
            newPages[newPages.length - 1] = lastPage;
          }
          
          return {
            ...oldData,
            pages: newPages
          };
        }
      );
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to send message';
      toast.error(message);
    },
  });
};

/**
 * Hook to delete a message
 */
export const useDeleteGroupMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => {
      if (!user?.id) {
        throw new Error('User must be authenticated to delete messages');
      }
      return deleteGroupMessage(messageId, user.id);
    },
    onSuccess: (_, messageId: string) => {
      // Remove the message from all relevant caches
      // This is a bit complex since we need to find which group the message belonged to
      // For now, we'll invalidate all message queries
      queryClient.invalidateQueries({ queryKey: groupMessagesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: groupMessagesKeys.all });
      
      toast.success('Message deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to delete message';
      toast.error(message);
    },
  });
};

/**
 * Hook to set up real-time subscription for group messages
 */
export const useGroupMessagesSubscription = (groupId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!groupId || !user?.id) return;

    const handleNewMessage = (message: GroupMessage) => {
      // Don't add our own messages since they're already optimistically added
      if (message.user_id === user.id) return;

      // Add the new message to the cache
      queryClient.setQueryData(
        groupMessagesKeys.list(groupId, user.id),
        (oldData: any) => {
          if (!oldData) return { messages: [message], total: 1, hasMore: false };
          
          // Check if message already exists to avoid duplicates
          const messageExists = oldData.messages.some((m: GroupMessage) => m.id === message.id);
          if (messageExists) return oldData;
          
          return {
            ...oldData,
            messages: [...oldData.messages, message],
            total: oldData.total + 1
          };
        }
      );

      // Also update infinite query cache
      queryClient.setQueryData(
        groupMessagesKeys.infinite(groupId, user.id),
        (oldData: any) => {
          if (!oldData) return {
            pages: [{ messages: [message], total: 1, hasMore: false }],
            pageParams: [undefined]
          };
          
          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            const lastPage = { ...newPages[newPages.length - 1] };
            
            // Check if message already exists
            const messageExists = lastPage.messages.some((m: GroupMessage) => m.id === message.id);
            if (!messageExists) {
              lastPage.messages = [...lastPage.messages, message];
              lastPage.total = lastPage.total + 1;
              newPages[newPages.length - 1] = lastPage;
            }
          }
          
          return {
            ...oldData,
            pages: newPages
          };
        }
      );
    };

    const handleError = (error: any) => {
      console.error('Real-time subscription error:', error);
      toast.error('Lost connection to chat. Messages may not update in real-time.');
    };

    // Set up subscription
    channelRef.current = subscribeToGroupMessages(
      groupId,
      user.id,
      handleNewMessage,
      handleError
    );

    return () => {
      if (channelRef.current) {
        unsubscribeFromGroupMessages(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [groupId, user?.id, queryClient]);

  return {
    isSubscribed: !!channelRef.current
  };
};

/**
 * Hook to get loading and error states for group messages
 */
export const useGroupMessagesStatus = (groupId: string) => {
  const { data, isLoading, error, isError } = useGroupMessages(groupId);
  
  return {
    messages: data?.messages || [],
    isLoading,
    error,
    isError,
    isEmpty: !isLoading && (!data?.messages || data.messages.length === 0),
    hasMore: data?.hasMore || false,
    total: data?.total || 0
  };
};