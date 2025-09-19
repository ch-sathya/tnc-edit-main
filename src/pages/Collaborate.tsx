import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Code2, 
  Users, 
  Plus, 
  Copy,
  Settings,
  Clock,
  Globe,
  Lock,
  MessageSquare,
  Video
} from 'lucide-react';
import CollaborationRoom from '@/components/CollaborationRoom';

  interface Room {
    id: string;
    name: string;
    description: string;
    is_private: boolean;
    max_participants: number;
    created_by: string;
    created_at: string;
    profiles?: {
      username: string;
      display_name: string;
    } | null;
  }

const Collaborate: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create room form
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    is_private: false,
    max_participants: 10
  });
  
  const [joinRoomId, setJoinRoomId] = useState('');

  useEffect(() => {
    fetchRooms();
    
    // Set up real-time subscription for room deletions
    const channel = supabase
      .channel('collaboration_rooms_changes')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'collaboration_rooms'
        },
        (payload) => {
          console.log('Room deleted:', payload);
          // Remove the deleted room from the rooms list
          setRooms(prevRooms => prevRooms.filter(room => room.id !== payload.old.id));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collaboration_rooms'
        },
        (payload) => {
          console.log('New room created:', payload);
          // Only add public rooms to the list
          if (!payload.new.is_private) {
            fetchRooms(); // Refetch to get the creator profile info
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRooms = async () => {
    try {
      // First get rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('collaboration_rooms')
        .select('*')
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (roomsError) throw roomsError;

      // Then get profile info for each room creator
      const roomsWithProfiles = await Promise.all(
        (roomsData || []).map(async (room) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name')
            .eq('user_id', room.created_by)
            .single();

          return {
            ...room,
            profiles: profile
          };
        })
      );

      setRooms(roomsWithProfiles);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    if (!user || !createForm.name.trim()) return;

    try {
      const { data, error } = await supabase
        .from('collaboration_rooms')
        .insert([{
          name: createForm.name,
          description: createForm.description,
          is_private: createForm.is_private,
          max_participants: createForm.max_participants,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Room created",
        description: `${createForm.name} has been created successfully`
      });

      setCurrentRoom(data.id);
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create room",
        variant: "destructive"
      });
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to join a collaboration room",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if room exists and is accessible
      const { data: room, error: roomError } = await supabase
        .from('collaboration_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError || !room) {
        console.error('Room query error:', roomError);
        toast({
          title: "Room not found",
          description: "The room ID you entered does not exist",
          variant: "destructive"
        });
        return;
      }

      // Check if room is private and user has access
      if (room.is_private && room.created_by !== user.id) {
        // Check if user is already a participant
        const { data: participant } = await supabase
          .from('room_participants')
          .select('*')
          .eq('room_id', roomId)
          .eq('user_id', user.id)
          .single();

        if (!participant) {
          toast({
            title: "Access denied",
            description: "This is a private room and you don't have access",
            variant: "destructive"
          });
          return;
        }
      }

      setCurrentRoom(roomId);
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room",
        variant: "destructive"
      });
    }
  };

  const generateRoomId = () => {
    const id = crypto.randomUUID();
    setJoinRoomId(id);
  };

  if (currentRoom) {
    return (
      <CollaborationRoom 
        roomId={currentRoom} 
        onLeave={() => setCurrentRoom(null)} 
      />
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to access collaboration features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/auth'} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Collaboration Hub</h1>
          <p className="text-xl text-muted-foreground">
            Create or join collaborative coding sessions with real-time editing and chat
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Create Room */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Room
              </CardTitle>
              <CardDescription>
                Start a new collaborative coding session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room Name</Label>
                <Input
                  id="room-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Awesome Project"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="room-description">Description (Optional)</Label>
                <Textarea
                  id="room-description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What are you working on?"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Privacy</Label>
                  <p className="text-sm text-muted-foreground">
                    {createForm.is_private ? 'Private room' : 'Public room'}
                  </p>
                </div>
                <Switch
                  checked={createForm.is_private}
                  onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, is_private: checked }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-participants">Max Participants</Label>
                <Select
                  value={createForm.max_participants.toString()}
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, max_participants: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 people</SelectItem>
                    <SelectItem value="10">10 people</SelectItem>
                    <SelectItem value="20">20 people</SelectItem>
                    <SelectItem value="50">50 people</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={createRoom} disabled={!createForm.name.trim()} className="w-full">
                Create Room
              </Button>
            </CardContent>
          </Card>

          {/* Join Room */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="w-5 h-5" />
                Join Room
              </CardTitle>
              <CardDescription>
                Enter a room ID to join an existing session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-id">Room ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="room-id"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    placeholder="Enter room ID"
                    className="font-mono"
                  />
                  <Button variant="outline" onClick={generateRoomId}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button 
                onClick={() => joinRoom(joinRoomId)} 
                disabled={!joinRoomId.trim()} 
                className="w-full"
              >
                Join Room
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Ask the room creator for the room ID to join
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Public Rooms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Public Rooms
            </CardTitle>
            <CardDescription>
              Join public collaboration sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading rooms...</p>
            ) : rooms.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No public rooms available. Create the first one!
              </p>
            ) : (
              <div className="grid gap-4">
                {rooms.map((room) => (
                  <div key={room.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{room.name}</h3>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          Public
                        </Badge>
                      </div>
                      {room.description && (
                        <p className="text-sm text-muted-foreground mb-2">{room.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Max {room.max_participants}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(room.created_at).toLocaleDateString()}
                        </span>
                        <span>
                          by @{room.profiles?.username || room.profiles?.display_name || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <Button onClick={() => joinRoom(room.id)}>
                      Join
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                  <Code2 className="w-5 h-5" />
                </div>
                <h3 className="font-semibold">Real-time Editing</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Collaborate on code with live synchronization and conflict resolution
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="font-semibold">Integrated Chat</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Communicate with your team without leaving the editor
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-semibold">Live Presence</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                See who's online and what they're working on in real-time
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Collaborate;