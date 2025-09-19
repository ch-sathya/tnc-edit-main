import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Users, 
  Copy, 
  LogOut, 
  Settings,
  MessageSquare 
} from 'lucide-react';
import CodeEditor from './CodeEditor';

interface CollaborationRoomProps {
  roomId: string;
  onLeave: () => void;
}

  interface ChatMessage {
    id: string;
    user_id: string;
    message: string;
    message_type: string;
    created_at: string;
    metadata?: any;
    profiles?: {
      username: string;
      display_name: string;
      avatar_url: string;
    } | null;
  }

  interface RoomParticipant {
    id: string;
    user_id: string;
    role: string;
    joined_at: string;
    profiles?: {
      username: string;
      display_name: string;
      avatar_url: string;
    } | null;
  }

interface PresenceState {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  cursor_position?: { line: number; column: number };
  current_file?: string;
  status: 'idle' | 'typing' | 'coding';
}

export default function CollaborationRoom({ roomId, onLeave }: CollaborationRoomProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [room, setRoom] = useState<any>(null);
  
  const channelRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && roomId) {
      initializeRoom();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeRoom = async () => {
    try {
      // Fetch room details
      const { data: roomData, error: roomError } = await supabase
        .from('collaboration_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;
      setRoom(roomData);

      // Join room as participant
      console.log('Joining room as participant:', { roomId, userId: user?.id });
      const { data: participantData, error: participantError } = await supabase
        .from('room_participants')
        .upsert([{
          room_id: roomId,
          user_id: user?.id,
          role: 'member'
        }], {
          onConflict: 'room_id,user_id'
        })
        .select();

      if (participantError) {
        console.error('Error joining room:', participantError);
        throw participantError;
      }

      console.log('Successfully joined room:', participantData);

      // Fetch participants
      await fetchParticipants();
      
      // Fetch messages
      await fetchMessages();

      // Set up real-time subscriptions
      setupRealtimeSubscriptions();

    } catch (error) {
      console.error('Error initializing room:', error);
      toast({
        title: "Error",
        description: "Failed to join collaboration room",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    console.log('Setting up real-time subscriptions for collaboration room');
    // Create channel for this room
    const channel = supabase.channel(`collaboration:${roomId}`, {
      config: { presence: { key: user?.id } }
    });

    // Listen for new messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        console.log('New message received:', payload);
        fetchMessages();
      }
    );

    // Listen for participant changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        console.log('Participant change received:', payload);
        fetchParticipants();
      }
    );

    // Track user presence
    channel.subscribe(async (status) => {
      console.log('Channel subscription status:', status);
      if (status === 'SUBSCRIBED') {
        // Get current user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('user_id', user?.id)
          .maybeSingle();

        const presenceState: PresenceState = {
          user_id: user?.id || '',
          username: profile?.username || 'Unknown',
          display_name: profile?.display_name || profile?.username || 'Unknown',
          avatar_url: profile?.avatar_url || '',
          status: 'idle'
        };

        console.log('Tracking presence:', presenceState);
        await channel.track(presenceState);
      }
    });

    channelRef.current = channel;
  };

  const fetchParticipants = async () => {
    try {
      // First get participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        return;
      }

      console.log('Fetched participants:', participantsData);

      // Then get profile info for each participant
      const participantsWithProfiles = await Promise.all(
        (participantsData || []).map(async (participant) => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('user_id', participant.user_id)
            .maybeSingle();

          if (profileError) {
            console.error('Error fetching profile for user:', participant.user_id, profileError);
          }

          return {
            ...participant,
            profiles: profile || {
              username: null,
              display_name: `User ${participant.user_id.slice(0, 8)}`,
              avatar_url: ''
            }
          };
        })
      );

      console.log('Participants with profiles:', participantsWithProfiles);
      setParticipants(participantsWithProfiles);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      // First get messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (messagesError) throw messagesError;

      // Then get profile info for each message
      const messagesWithProfiles = await Promise.all(
        (messagesData || []).map(async (message) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('user_id', message.user_id)
            .maybeSingle();

          return {
            ...message,
            profiles: profile
          };
        })
      );

      setMessages(messagesWithProfiles);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          room_id: roomId,
          user_id: user.id,
          message: newMessage.trim(),
          message_type: 'text'
        }]);

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast({
      title: "Copied!",
      description: "Room ID copied to clipboard"
    });
  };

  const deleteRoom = async () => {
    if (!user || room.created_by !== user.id) return;
    
    try {
      // Delete all room participants
      await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId);
      
      // Delete all chat messages
      await supabase
        .from('chat_messages')
        .delete()
        .eq('room_id', roomId);
      
      // Delete the room
      await supabase
        .from('collaboration_rooms')
        .delete()
        .eq('id', roomId);

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      toast({
        title: "Room Deleted",
        description: "Collaboration room has been deleted successfully"
      });

      onLeave();
    } catch (error) {
      console.error('Error deleting room:', error);
      toast({
        title: "Error",
        description: "Failed to delete room",
        variant: "destructive"
      });
    }
  };

  const leaveRoom = async () => {
    try {
      await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user?.id);

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      onLeave();
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Joining collaboration room...</div>
          <div className="text-sm text-muted-foreground">Room ID: {roomId}</div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600">Room not found</div>
          <div className="text-sm text-muted-foreground">Room ID: {roomId}</div>
          <Button onClick={onLeave} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Room Header */}
        <div className="glass-card border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">{room.name}</h1>
              {room.description && (
                <p className="text-sm text-muted-foreground mt-1">{room.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono text-xs px-2 py-1">
                {roomId.slice(0, 8)}...
              </Badge>
              <Button variant="ghost" size="sm" onClick={copyRoomId} className="h-8 w-8 p-0">
                <Copy className="w-4 h-4" />
              </Button>
              {room.created_by === user?.id && (
                <Button variant="destructive" size="sm" onClick={deleteRoom} className="h-8">
                  Delete
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={leaveRoom} className="h-8">
                Leave
              </Button>
            </div>
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1">
          <CodeEditor 
            projectId={roomId} 
            currentUser={{ 
              id: user?.id || '', 
              name: participants.find(p => p.user_id === user?.id)?.profiles?.display_name || 'Unknown',
              color: '#3B82F6' 
            }}
            participants={participants}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-72 glass-card border-l flex flex-col">
        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
          <div className="px-4 py-3 border-b">
            <TabsList className="grid w-full grid-cols-2 bg-background/50">
              <TabsTrigger value="chat" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="participants" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {participants.length}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="flex-1 flex flex-col px-4 pb-4">
            {/* Messages */}
            <ScrollArea className="flex-1 mb-3">
              <div className="space-y-3 py-2">
                {messages.map((message) => (
                  <div key={message.id} className="flex gap-2">
                    <Avatar className="w-7 h-7 mt-0.5">
                      <AvatarImage src={message.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {message.profiles?.display_name?.charAt(0) || 
                         message.profiles?.username?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium truncate">
                          {message.profiles?.display_name || message.profiles?.username}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <p className="text-sm break-words">{message.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type message..."
                className="flex-1 h-8 text-sm"
              />
              <Button type="submit" size="sm" disabled={!newMessage.trim()} className="h-8 w-8 p-0">
                <Send className="w-3 h-3" />
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="participants" className="flex-1 px-4 pb-4">
            <div className="space-y-2 py-2">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-background/50 transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={participant.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {participant.profiles?.display_name?.charAt(0) || 
                       participant.profiles?.username?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {participant.profiles?.display_name || participant.profiles?.username}
                      {participant.user_id === user?.id && ' (You)'}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {participant.role}
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}