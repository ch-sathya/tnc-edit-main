import React, { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Users, Lock, Globe, Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CollaborationRoom {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  max_participants: number;
  created_by: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string;
  };
  participant_count?: number;
}

const Collaborate = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<CollaborationRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    is_private: false,
    max_participants: 10
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collaboration_rooms' as any)
        .select(`
          *,
          profiles:created_by (
            username,
            display_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get participant counts for each room
      const roomsWithCounts = await Promise.all(
        ((data as any) || []).map(async (room: any) => {
          const { count } = await supabase
            .from('room_participants' as any)
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);
          
          return {
            ...room,
            participant_count: count || 0
          };
        })
      );

      setRooms(roomsWithCounts as any);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load collaboration rooms",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    if (!newRoom.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room name",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('collaboration_rooms')
        .insert([
          {
            name: newRoom.name,
            description: newRoom.description,
            is_private: newRoom.is_private,
            max_participants: newRoom.max_participants,
            created_by: user?.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Add creator as participant
      await supabase
        .from('room_participants' as any)
        .insert([
          {
            room_id: data.id,
            user_id: user?.id,
            role: 'owner'
          }
        ]);

      toast({
        title: "Success",
        description: "Collaboration room created successfully"
      });

      setIsCreateModalOpen(false);
      setNewRoom({
        name: '',
        description: '',
        is_private: false,
        max_participants: 10
      });
      fetchRooms();
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create collaboration room",
        variant: "destructive"
      });
    }
  };

  const joinRoom = async (roomId: string) => {
    try {
      // Check if already a participant
      const { data: existing } = await supabase
        .from('room_participants' as any)
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Info",
          description: "You are already in this room"
        });
        return;
      }

      const { error } = await supabase
        .from('room_participants' as any)
        .insert([
          {
            room_id: roomId,
            user_id: user?.id,
            role: 'member'
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Joined collaboration room successfully"
      });
      fetchRooms();
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join collaboration room",
        variant: "destructive"
      });
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Collaboration Rooms</h1>
              <p className="text-muted-foreground">
                Work together in real-time with other developers
              </p>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Collaboration Room</DialogTitle>
                  <DialogDescription>
                    Set up a new room for real-time collaboration
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Room Name</Label>
                    <Input
                      id="name"
                      placeholder="My Awesome Project"
                      value={newRoom.name}
                      onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="What are you working on?"
                      value={newRoom.description}
                      onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="private">Private Room</Label>
                    <Switch
                      id="private"
                      checked={newRoom.is_private}
                      onCheckedChange={(checked) => setNewRoom({ ...newRoom, is_private: checked })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max">Max Participants</Label>
                    <Input
                      id="max"
                      type="number"
                      min="2"
                      max="50"
                      value={newRoom.max_participants}
                      onChange={(e) => setNewRoom({ ...newRoom, max_participants: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createRoom}>Create Room</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search collaboration rooms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Rooms Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No rooms found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Try adjusting your search' : 'Create your first collaboration room to get started!'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Room
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map((room) => (
                <Card key={room.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-1 flex items-center gap-2">
                        {room.is_private ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        )}
                        {room.name}
                      </CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {room.description || 'No description provided'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Created by</span>
                        <span className="font-medium">
                          {room.profiles?.display_name || room.profiles?.username || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Participants</span>
                        <Badge variant="secondary">
                          {room.participant_count || 0} / {room.max_participants}
                        </Badge>
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => joinRoom(room.id)}
                        disabled={room.participant_count >= room.max_participants}
                      >
                        {room.participant_count >= room.max_participants ? 'Room Full' : 'Join Room'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Collaborate;
