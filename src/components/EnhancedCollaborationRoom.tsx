import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  MessageSquare, 
  Code, 
  ArrowLeft, 
  Settings,
  FileText,
  Play,
  Download
} from 'lucide-react';
import CodeEditor from '@/components/CodeEditor';
import { FileManager } from '@/components/FileManager';
import { CodeCompiler } from '@/components/CodeCompiler';

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

interface Room {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  max_participants: number;
  created_by: string;
  created_at: string;
}

interface FileItem {
  id: string;
  file_path: string;
  content: string;
  language: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

interface EnhancedCollaborationRoomProps {
  roomId: string;
  currentUser: { id: string; name: string; color: string };
  onLeave: () => void;
}

const EnhancedCollaborationRoom: React.FC<EnhancedCollaborationRoomProps> = ({
  roomId,
  currentUser,
  onLeave
}) => {
  const { toast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('code');

  useEffect(() => {
    fetchRoomData();
    fetchParticipants();
    setupRealtimeSubscriptions();
  }, [roomId]);

  const fetchRoomData = async () => {
    try {
      const { data: roomData, error } = await supabase
        .from('collaboration_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) throw error;
      setRoom(roomData);
    } catch (error) {
      console.error('Error fetching room data:', error);
      toast({
        title: "Error",
        description: "Failed to load room information",
        variant: "destructive"
      });
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('room_id', roomId);

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const participantsChannel = supabase.channel(`room_participants:${roomId}`);

    participantsChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`
      },
      () => {
        fetchParticipants();
      }
    );

    participantsChannel.subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
    };
  };

  const leaveRoom = async () => {
    try {
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      toast({
        title: "Left room",
        description: "You have left the collaboration room"
      });

      onLeave();
    } catch (error) {
      console.error('Error leaving room:', error);
      toast({
        title: "Error",
        description: "Failed to leave room",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Loading collaboration room...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-destructive">Room not found</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="h-14 bg-secondary border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={leaveRoom}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Leave Room
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="font-semibold">{room.name}</h1>
            <p className="text-xs text-muted-foreground">{room.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{participants.length} online</span>
          </div>
          
          <div className="flex items-center gap-2">
            {participants.slice(0, 3).map((participant, index) => (
              <Avatar key={participant.id} className="h-6 w-6">
                <AvatarImage src={participant.profiles?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {participant.profiles?.display_name?.charAt(0) || 
                   participant.profiles?.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            ))}
            {participants.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                +{participants.length - 3}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 bg-secondary border-r border-border flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-2">
              <TabsTrigger value="files" className="flex items-center gap-2">
                <FileText className="h-3 w-3" />
                Files
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-3 w-3" />
                Users
              </TabsTrigger>
              <TabsTrigger value="compiler" className="flex items-center gap-2">
                <Play className="h-3 w-3" />
                Run
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="files" className="h-full m-2 mt-0">
                <FileManager
                  roomId={roomId}
                  currentUserId={currentUser.id}
                  onFileSelect={setSelectedFile}
                  selectedFile={selectedFile}
                />
              </TabsContent>

              <TabsContent value="users" className="h-full m-2 mt-0">
                <Card className="glass-card h-full">
                  <CardHeader>
                    <CardTitle className="text-sm">Online Users</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {participants.map((participant) => (
                      <div key={participant.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={participant.profiles?.avatar_url} />
                          <AvatarFallback className="text-sm">
                            {participant.profiles?.display_name?.charAt(0) || 
                             participant.profiles?.username?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {participant.profiles?.display_name || 
                             participant.profiles?.username || 'Unknown User'}
                            {participant.user_id === currentUser.id && ' (You)'}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {participant.role}
                            </Badge>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="compiler" className="h-full m-2 mt-0 overflow-auto">
                {selectedFile && (
                  <CodeCompiler
                    code={selectedFile.content}
                    language={selectedFile.language}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Code Editor */}
        <div className="flex-1 bg-background">
          {selectedFile ? (
            <CodeEditor
              projectId={roomId}
              currentUser={currentUser}
              participants={participants}
              selectedFile={selectedFile}
              onFileUpdate={setSelectedFile}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Code className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-2">No file selected</p>
                <p className="text-sm text-muted-foreground">Select a file from the sidebar to start coding</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedCollaborationRoom;