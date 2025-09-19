import { supabase } from '@/integrations/supabase/client';
import type { 
  GroupMessage, 
  GroupMessageInsert,
  SendMessageRequest,
  MessagePaginationOptions,
  GroupMessagesResponse,
  CommunityGroupError
} from '@/types/community';

class GroupMessageErrorClass extends Error implements CommunityGroupError {
  code?: string;
  details?: any;

  constructor(error: CommunityGroupError) {
    super(error.message);
    this.name = 'GroupMessageError';
    this.code = error.code;
    this.details = error.details;
  }
}

/**
 * Fetch messages for a specific group with pagination
 */
export const fetchGroupMessages = async (
  groupId: string,
  userId: string,
  options: MessagePaginationOptions = {}
): Promise<GroupMessagesResponse> => {
  try {
    // First verify user is a member of the group
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('id')
      .match({ group_id: groupId, user_id: userId })
      .single();

    if (!membership) {
      throw new GroupMessageErrorClass({
        message: 'You must be a member of this group to view messages',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    const limit = options.limit || 50;
    let query = supabase
      .from('group_messages')
      .select(`
        *,
        user_profile:profiles!group_messages_user_id_fkey(username, display_name, avatar_url)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Add cursor-based pagination
    if (options.cursor) {
      query = query.lt('created_at', options.cursor);
    }

    if (options.before) {
      query = query.gt('created_at', options.before);
    }

    const { data: messages, error } = await query;

    if (error) {
      throw new GroupMessageErrorClass({
        message: 'Failed to fetch group messages',
        code: 'FETCH_MESSAGES_ERROR',
        details: error
      });
    }

    if (!messages) {
      return {
        messages: [],
        total: 0,
        hasMore: false
      };
    }

    // Reverse to show oldest first in the UI
    const reversedMessages = messages.reverse();
    
    // Check if there are more messages
    const hasMore = messages.length === limit;
    const nextCursor = hasMore && messages.length > 0 
      ? messages[messages.length - 1].created_at 
      : undefined;

    return {
      messages: reversedMessages,
      total: messages.length,
      hasMore,
      nextCursor
    };
  } catch (error) {
    if (error instanceof GroupMessageErrorClass) {
      throw error;
    }
    throw new GroupMessageErrorClass({
      message: 'An unexpected error occurred while fetching messages',
      details: error
    });
  }
};

/**
 * Send a message to a group
 */
export const sendGroupMessage = async (
  messageData: SendMessageRequest,
  userId: string
): Promise<GroupMessage> => {
  try {
    // Verify user is a member of the group
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('id')
      .match({ group_id: messageData.group_id, user_id: userId })
      .single();

    if (!membership) {
      throw new GroupMessageErrorClass({
        message: 'You must be a member of this group to send messages',
        code: 'UNAUTHORIZED_SEND'
      });
    }

    // Validate message content
    const content = messageData.content.trim();
    if (!content) {
      throw new GroupMessageErrorClass({
        message: 'Message content cannot be empty',
        code: 'EMPTY_MESSAGE'
      });
    }

    if (content.length > 1000) {
      throw new GroupMessageErrorClass({
        message: 'Message content cannot exceed 1000 characters',
        code: 'MESSAGE_TOO_LONG'
      });
    }

    // Insert the message
    const messageInsert: GroupMessageInsert = {
      group_id: messageData.group_id,
      user_id: userId,
      content: content
    };

    const { data: message, error } = await supabase
      .from('group_messages')
      .insert(messageInsert)
      .select(`
        *,
        user_profile:profiles!group_messages_user_id_fkey(username, display_name, avatar_url)
      `)
      .single();

    if (error) {
      throw new GroupMessageErrorClass({
        message: 'Failed to send message',
        code: 'SEND_MESSAGE_ERROR',
        details: error
      });
    }

    if (!message) {
      throw new GroupMessageErrorClass({
        message: 'Message sending failed - no data returned',
        code: 'SEND_MESSAGE_NO_DATA'
      });
    }

    return message;
  } catch (error) {
    if (error instanceof GroupMessageErrorClass) {
      throw error;
    }
    throw new GroupMessageErrorClass({
      message: 'An unexpected error occurred while sending the message',
      details: error
    });
  }
};

/**
 * Delete a message (only the sender can delete their own messages)
 */
export const deleteGroupMessage = async (
  messageId: string,
  userId: string
): Promise<void> => {
  try {
    // Verify the user owns the message
    const { data: message, error: fetchError } = await supabase
      .from('group_messages')
      .select('user_id, group_id')
      .eq('id', messageId)
      .single();

    if (fetchError) {
      throw new GroupMessageErrorClass({
        message: 'Failed to verify message ownership',
        code: 'VERIFY_MESSAGE_OWNERSHIP_ERROR',
        details: fetchError
      });
    }

    if (!message || message.user_id !== userId) {
      throw new GroupMessageErrorClass({
        message: 'You can only delete your own messages',
        code: 'UNAUTHORIZED_DELETE'
      });
    }

    // Delete the message
    const { error: deleteError } = await supabase
      .from('group_messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) {
      throw new GroupMessageErrorClass({
        message: 'Failed to delete message',
        code: 'DELETE_MESSAGE_ERROR',
        details: deleteError
      });
    }
  } catch (error) {
    if (error instanceof GroupMessageErrorClass) {
      throw error;
    }
    throw new GroupMessageErrorClass({
      message: 'An unexpected error occurred while deleting the message',
      details: error
    });
  }
};

/**
 * Set up real-time subscription for group messages
 */
export const subscribeToGroupMessages = (
  groupId: string,
  userId: string,
  onMessage: (message: GroupMessage) => void,
  onError?: (error: any) => void
) => {
  // First verify user is a member (this should be done before calling this function)
  const channel = supabase
    .channel(`group_messages:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`
      },
      async (payload) => {
        try {
          // Fetch the complete message with user profile
          const { data: message, error } = await supabase
            .from('group_messages')
            .select(`
              *,
              user_profile:profiles!group_messages_user_id_fkey(username, display_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('Error fetching new message:', error);
            onError?.(error);
            return;
          }

          if (message) {
            onMessage(message);
          }
        } catch (error) {
          console.error('Error processing new message:', error);
          onError?.(error);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`
      },
      (payload) => {
        // Handle message deletion if needed
        // For now, we'll just log it
        console.log('Message deleted:', payload.old.id);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to group ${groupId} messages`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Error subscribing to group ${groupId} messages`);
        onError?.(new Error('Failed to subscribe to real-time messages'));
      }
    });

  return channel;
};

/**
 * Unsubscribe from group messages
 */
export const unsubscribeFromGroupMessages = async (channel: any) => {
  if (channel) {
    await supabase.removeChannel(channel);
  }
};