import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface OtherUser {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface DirectMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otherUser: OtherUser;
}

export const DirectMessageModal = ({ open, onOpenChange, otherUser }: DirectMessageModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && user && otherUser) {
      fetchMessages();
      markMessagesAsRead();

      // Subscribe to new messages
      const channel = supabase
        .channel(`dm-${user.id}-${otherUser.user_id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter: `sender_id=eq.${otherUser.user_id}`
          },
          (payload) => {
            const newMsg = payload.new as Message;
            if (newMsg.receiver_id === user.id) {
              setMessages(prev => [...prev, newMsg]);
              markMessagesAsRead();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, user, otherUser]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUser.user_id}),and(sender_id.eq.${otherUser.user_id},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from('direct_messages')
        .update({ read: true })
        .eq('sender_id', otherUser.user_id)
        .eq('receiver_id', user.id)
        .eq('read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    try {
      setSending(true);
      
      const messageData = {
        sender_id: user.id,
        receiver_id: otherUser.user_id,
        content: newMessage.trim()
      };

      const { data, error } = await supabase
        .from('direct_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const displayName = otherUser.display_name || otherUser.username || 'Unknown User';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={otherUser.avatar_url || undefined} />
              <AvatarFallback>{displayName[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>{displayName}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <Skeleton className="h-10 w-48 rounded-lg" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message, index) => {
                const isOwn = message.sender_id === user?.id;
                const showDate = index === 0 || 
                  new Date(message.created_at).toDateString() !== 
                  new Date(messages[index - 1].created_at).toDateString();

                return (
                  <React.Fragment key={message.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {format(new Date(message.created_at), 'MMMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          isOwn 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm break-words">{message.content}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {format(new Date(message.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
