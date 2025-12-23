import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, MessageCircle, UserPlus, Users, Clock, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { UserSearchModal } from '@/components/UserSearchModal';
import { DirectMessageModal } from '@/components/DirectMessageModal';

interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  profile: {
    user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const Connections = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Connection[]>([]);
  const [pendingSent, setPendingSent] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [chatWithUser, setChatWithUser] = useState<Connection['profile'] | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchConnections();
    }
  }, [user, authLoading]);

  const fetchConnections = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch all connections involving the user
      const { data: allConnections, error } = await supabase
        .from('user_connections')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs to fetch profiles
      const userIds = new Set<string>();
      allConnections?.forEach(conn => {
        if (conn.requester_id !== user.id) userIds.add(conn.requester_id);
        if (conn.addressee_id !== user.id) userIds.add(conn.addressee_id);
      });

      // Fetch profiles for all connected users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', Array.from(userIds));

      // Map profiles to connections
      const connectionsWithProfiles = (allConnections || []).map(conn => {
        const otherUserId = conn.requester_id === user.id ? conn.addressee_id : conn.requester_id;
        const profile = profiles?.find(p => p.user_id === otherUserId) || {
          user_id: otherUserId,
          username: null,
          display_name: 'Unknown User',
          avatar_url: null
        };
        return { ...conn, profile };
      });

      // Separate by status
      const accepted = connectionsWithProfiles.filter(c => c.status === 'accepted');
      const pendingRecv = connectionsWithProfiles.filter(
        c => c.status === 'pending' && c.addressee_id === user.id
      );
      const pendingSnt = connectionsWithProfiles.filter(
        c => c.status === 'pending' && c.requester_id === user.id
      );

      setConnections(accepted);
      setPendingReceived(pendingRecv);
      setPendingSent(pendingSnt);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast({
        title: "Error",
        description: "Failed to load connections",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectionAction = async (connectionId: string, action: 'accept' | 'reject') => {
    try {
      if (action === 'accept') {
        const { error } = await supabase
          .from('user_connections')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', connectionId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Connection request accepted"
        });
      } else {
        const { error } = await supabase
          .from('user_connections')
          .delete()
          .eq('id', connectionId);

        if (error) throw error;

        toast({
          title: "Declined",
          description: "Connection request declined"
        });
      }

      fetchConnections();
    } catch (error) {
      console.error('Error handling connection:', error);
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive"
      });
    }
  };

  const cancelRequest = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      toast({
        title: "Cancelled",
        description: "Connection request cancelled"
      });
      fetchConnections();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        title: "Error",
        description: "Failed to cancel request",
        variant: "destructive"
      });
    }
  };

  const ConnectionCard = ({ connection, type }: { connection: Connection; type: 'connected' | 'received' | 'sent' }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={connection.profile.avatar_url || undefined} />
            <AvatarFallback>
              {(connection.profile.display_name || connection.profile.username || '?')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">
              {connection.profile.display_name || connection.profile.username || 'Unknown User'}
            </div>
            {connection.profile.username && connection.profile.display_name && (
              <div className="text-sm text-muted-foreground truncate">
                @{connection.profile.username}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {type === 'connected' && (
              <Button 
                size="sm" 
                onClick={() => setChatWithUser(connection.profile)}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Message
              </Button>
            )}
            {type === 'received' && (
              <>
                <Button 
                  size="sm" 
                  onClick={() => handleConnectionAction(connection.id, 'accept')}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleConnectionAction(connection.id, 'reject')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            {type === 'sent' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => cancelRequest(connection.id)}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSkeletons = () => (
    <>
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );

  if (authLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto py-8 px-4 max-w-4xl">
            <Skeleton className="h-10 w-48 mb-8" />
            {renderSkeletons()}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Connections</h1>
              <p className="text-muted-foreground">
                Manage your connections and chat with other developers
              </p>
            </div>
            <Button onClick={() => setShowSearchModal(true)} className="gap-2">
              <Search className="h-4 w-4" />
              Find People
            </Button>
          </div>

          <Tabs defaultValue="connections" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="connections" className="gap-2">
                <Users className="h-4 w-4" />
                Connections
                {connections.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{connections.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Requests
                {pendingReceived.length > 0 && (
                  <Badge variant="destructive" className="ml-1">{pendingReceived.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="gap-2">
                <Clock className="h-4 w-4" />
                Sent
                {pendingSent.length > 0 && (
                  <Badge variant="outline" className="ml-1">{pendingSent.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="connections" className="space-y-4">
              {loading ? (
                renderSkeletons()
              ) : connections.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start connecting with other developers
                    </p>
                    <Button onClick={() => setShowSearchModal(true)}>
                      <Search className="h-4 w-4 mr-2" />
                      Find People
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                connections.map(conn => (
                  <ConnectionCard key={conn.id} connection={conn} type="connected" />
                ))
              )}
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              {loading ? (
                renderSkeletons()
              ) : pendingReceived.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                    <p className="text-muted-foreground">
                      You don't have any pending connection requests
                    </p>
                  </CardContent>
                </Card>
              ) : (
                pendingReceived.map(conn => (
                  <ConnectionCard key={conn.id} connection={conn} type="received" />
                ))
              )}
            </TabsContent>

            <TabsContent value="sent" className="space-y-4">
              {loading ? (
                renderSkeletons()
              ) : pendingSent.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No sent requests</h3>
                    <p className="text-muted-foreground">
                      You haven't sent any connection requests
                    </p>
                  </CardContent>
                </Card>
              ) : (
                pendingSent.map(conn => (
                  <ConnectionCard key={conn.id} connection={conn} type="sent" />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <UserSearchModal 
        open={showSearchModal} 
        onOpenChange={setShowSearchModal} 
      />

      {chatWithUser && (
        <DirectMessageModal
          open={!!chatWithUser}
          onOpenChange={(open) => !open && setChatWithUser(null)}
          otherUser={chatWithUser}
        />
      )}
    </>
  );
};

export default Connections;
