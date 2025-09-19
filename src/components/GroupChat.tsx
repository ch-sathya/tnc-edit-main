import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  useGroupMessages, 
  useSendGroupMessage, 
  useGroupMessagesSubscription 
} from '@/hooks/useGroupMessages';
import { useCommunityGroup } from '@/hooks/useCommunityGroups';
import { useAuth } from '@/hooks/useAuth';
import { 
  Send, 
  ArrowLeft, 
  Users, 
  MessageCircle,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { GroupMessage } from '@/types/community';
import { toast } from 'sonner';
import { GroupChatSkeleton, InlineLoading } from '@/components/LoadingSkeletons';
import RetryHandler from '@/components/RetryHandler';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface GroupChatProps {
  groupId: string;
  onBack?: () => void;
}

const GroupChat: React.FC<GroupChatProps> = ({ groupId, onBack }) => {
  const { user } = useAuth();
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch group data and messages
  const { data: group, isLoading: groupLoading, error: groupError, refetch: refetchGroup } = useCommunityGroup(groupId);
  const { data: messagesData, isLoading: messagesLoading, error: messagesError, refetch: refetchMessages } = useGroupMessages(groupId);
  const sendMessageMutation = useSendGroupMessage();
  
  const errorHandler = useErrorHandler({
    showToast: true,
    retryable: true,
    maxRetries: 3
  });
  
  // Set up real-time subscription
  useGroupMessagesSubscription(groupId);

  const messages = messagesData?.messages || [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const content = messageInput.trim();
    if (!content || isSending) return;

    if (content.length > 1000) {
      toast.error('Message cannot exceed 1000 characters');
      return;
    }

    setIsSending(true);
    try {
      await sendMessageMutation.mutateAsync({
        content,
        group_id: groupId
      });
      setMessageInput('');
      inputRef.current?.focus();
    } catch (error) {
      // Error is handled by the mutation
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const getDisplayName = (message: GroupMessage) => {
    if (message.user_profile?.display_name) {
      return message.user_profile.display_name;
    }
    if (message.user_profile?.username) {
      return message.user_profile.username;
    }
    return 'Anonymous User';
  };

  const getInitials = (message: GroupMessage) => {
    const displayName = getDisplayName(message);
    return displayName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  if (groupLoading) {
    return <GroupChatSkeleton />;
  }

  if (groupError) {
    return (
      <RetryHandler
        error={groupError}
        onRetry={async () => {
          await refetchGroup();
        }}
        title="Failed to load group"
        description="There was an issue loading the group information. Please try again."
        maxRetries={3}
        showNetworkStatus={true}
      />
    );
  }

  if (!group) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Group Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The group you're looking for doesn't exist or you don't have access to it.
            </p>
            {onBack && (
              <Button onClick={onBack} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Groups
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Enhanced membership verification
  if (!user) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground mb-4">
              You must be logged in to access group chats.
            </p>
            {onBack && (
              <Button onClick={onBack} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Groups
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!group.is_member) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-4">
              You must be a member of "{group.name}" to view the chat.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Join the group from the community page to participate in discussions.
            </p>
            {onBack && (
              <Button onClick={onBack} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Groups
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col" role="main" aria-labelledby="chat-title">
      {/* Header */}
      <CardHeader className="flex-shrink-0 border-b p-3 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {onBack && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBack} 
                aria-label="Back to groups list"
                className="min-h-[44px] min-w-[44px] flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <CardTitle id="chat-title" className="text-base sm:text-lg truncate">
                {group.name}
              </CardTitle>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Users className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                <span>{group.member_count || 0} members</span>
                {group.is_owner && (
                  <Badge variant="secondary" className="text-xs">
                    Owner
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea 
          className="flex-1 p-3 sm:p-4"
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
          aria-atomic="false"
        >
          {messagesLoading ? (
            <InlineLoading text="Loading messages..." />
          ) : messagesError ? (
            <div className="flex items-center justify-center h-32">
              <RetryHandler
                error={messagesError}
                onRetry={async () => {
                  await refetchMessages();
                }}
                title="Failed to load messages"
                description="There was an issue loading the chat messages."
                maxRetries={3}
                showNetworkStatus={false}
              />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-32" role="status">
              <div className="text-center">
                <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  No messages yet. Start the conversation!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.user_id === user?.id}
                  displayName={getDisplayName(message)}
                  initials={getInitials(message)}
                  timestamp={formatMessageTime(message.created_at)}
                  isFirst={index === 0 || messages[index - 1]?.user_id !== message.user_id}
                />
              ))}
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t p-3 sm:p-4" role="region" aria-label="Message input">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isSending}
              className="flex-1 min-h-[44px]"
              maxLength={1000}
              aria-label="Type your message"
              aria-describedby={messageInput.length > 900 ? "char-count" : undefined}
            />
            <Button 
              type="submit" 
              disabled={!messageInput.trim() || isSending}
              className="min-h-[44px] min-w-[44px]"
              aria-label={isSending ? "Sending message..." : "Send message"}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </form>
          {messageInput.length > 900 && (
            <p id="char-count" className="text-xs text-muted-foreground mt-1" role="status">
              {1000 - messageInput.length} characters remaining
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface MessageBubbleProps {
  message: GroupMessage;
  isOwn: boolean;
  displayName: string;
  initials: string;
  timestamp: string;
  isFirst?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  displayName,
  initials,
  timestamp,
  isFirst = false
}) => {
  return (
    <div 
      className={`flex gap-2 sm:gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      role="article"
      aria-label={`Message from ${isOwn ? 'you' : displayName} at ${timestamp}`}
    >
      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
        <AvatarImage 
          src={message.user_profile?.avatar_url || undefined} 
          alt={`${displayName}'s avatar`}
        />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%] min-w-0`}>
        {isFirst && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground truncate">
              {isOwn ? 'You' : displayName}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {timestamp}
            </span>
          </div>
        )}
        
        <div
          className={`rounded-lg px-3 py-2 max-w-full break-words ${
            isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>
        
        {!isFirst && (
          <span className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
};

export default GroupChat;