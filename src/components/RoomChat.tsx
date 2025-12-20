import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface RoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    display_name: string;
    username: string;
    avatar_url: string;
  };
}

interface RoomChatProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const RoomChat: React.FC<RoomChatProps> = ({ roomId, isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId || !isOpen) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('room_messages')
        .select(`
          *,
          profile:user_id (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) {
        setMessages(data as any);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`room-chat-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMsg = payload.new as RoomMessage;
          // Fetch profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, username, avatar_url')
            .eq('user_id', newMsg.user_id)
            .single();

          setMessages((prev) => [...prev, { ...newMsg, profile: profile as any }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, isOpen]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    try {
      await supabase.from('room_messages').insert({
        room_id: roomId,
        user_id: user.id,
        content: newMessage.trim(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-[#252526] border-l border-[#3c3c3c]">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-300 font-medium">Room Chat</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-400 hover:text-white hover:bg-[#37373d]"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">
              No messages yet. Start the conversation!
            </p>
          ) : (
            messages.map((message) => {
              const isOwn = message.user_id === user?.id;
              const displayName = (message.profile as any)?.display_name || 
                                 (message.profile as any)?.username || 'User';
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {displayName[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col ${isOwn ? 'items-end' : ''}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-gray-400">{displayName}</span>
                      <span className="text-xs text-gray-600">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-lg text-sm max-w-[200px] break-words ${
                        isOwn
                          ? 'bg-[#094771] text-white'
                          : 'bg-[#37373d] text-gray-200'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-[#3c3c3c]">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-[#1e1e1e] border-[#3c3c3c] text-gray-200 placeholder:text-gray-500"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="bg-[#094771] hover:bg-[#0a5a8c]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
