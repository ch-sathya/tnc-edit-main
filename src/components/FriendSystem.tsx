import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, UserCheck, X, Check, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: string;
  requester_profile?: {
    display_name: string;
    username: string;
    avatar_url: string;
  };
  addressee_profile?: {
    display_name: string;
    username: string;
    avatar_url: string;
  };
}

interface FriendSystemProps {
  targetUserId?: string;
  showFull?: boolean;
}

export const FriendSystem: React.FC<FriendSystemProps> = ({ targetUserId, showFull = false }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('none');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConnections();
      if (targetUserId && targetUserId !== user.id) {
        checkConnectionStatus();
      }
    }
  }, [user, targetUserId]);

  const fetchConnections = async () => {
    if (!user) return;

    try {
      // Get connections
      const { data: connectionsData, error } = await supabase
        .from('user_connections')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) throw error;

      // Get profiles for each connection
      const connectionsWithProfiles = await Promise.all(
        (connectionsData || []).map(async (connection) => {
          const [requesterProfile, addresseeProfile] = await Promise.all([
            supabase
              .from('profiles')
              .select('display_name, username, avatar_url')
              .eq('user_id', connection.requester_id)
              .single(),
            supabase
              .from('profiles')
              .select('display_name, username, avatar_url')
              .eq('user_id', connection.addressee_id)
              .single()
          ]);

          return {
            ...connection,
            status: connection.status as 'pending' | 'accepted' | 'declined' | 'blocked',
            requester_profile: requesterProfile.data,
            addressee_profile: addresseeProfile.data
          };
        })
      );

      setConnections(connectionsWithProfiles);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const checkConnectionStatus = async () => {
    if (!user || !targetUserId) return;

    try {
      const { data, error } = await supabase
        .from('user_connections')
        .select('status, requester_id')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        if (data.status === 'accepted') {
          setConnectionStatus('friends');
        } else if (data.requester_id === user.id) {
          setConnectionStatus('sent');
        } else {
          setConnectionStatus('received');
        }
      } else {
        setConnectionStatus('none');
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const sendFriendRequest = async () => {
    if (!user || !targetUserId || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_connections')
        .insert([{
          requester_id: user.id,
          addressee_id: targetUserId,
          status: 'pending'
        }]);

      if (error) throw error;

      setConnectionStatus('sent');
      toast({
        title: "Friend request sent!",
        description: "Your friend request has been sent successfully."
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request. Try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const respondToRequest = async (connectionId: string, action: 'accepted' | 'declined') => {
    if (loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_connections')
        .update({ status: action })
        .eq('id', connectionId);

      if (error) throw error;

      await fetchConnections();
      if (targetUserId) {
        await checkConnectionStatus();
      }

      toast({
        title: action === 'accepted' ? "Friend request accepted!" : "Friend request declined",
        description: `You have ${action} the friend request.`
      });
    } catch (error) {
      console.error('Error responding to friend request:', error);
      toast({
        title: "Error",
        description: "Failed to respond to friend request. Try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async () => {
    if (!user || !targetUserId || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`);

      if (error) throw error;

      setConnectionStatus('none');
      await fetchConnections();
      
      toast({
        title: "Friend removed",
        description: "You are no longer connected with this user."
      });
    } catch (error) {
      console.error('Error removing friend:', error);
      toast({
        title: "Error",
        description: "Failed to remove friend. Try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // If we're showing a single user connection button
  if (targetUserId && !showFull) {
    const renderConnectionButton = () => {
      if (targetUserId === user?.id) return null;

      switch (connectionStatus) {
        case 'none':
          return (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={sendFriendRequest}
              disabled={loading}
              className="glass-card"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Connect
            </Button>
          );
        case 'sent':
          return (
            <Button variant="outline" size="sm" disabled className="glass-card">
              <UserCheck className="h-4 w-4 mr-2" />
              Request Sent
            </Button>
          );
        case 'friends':
          return (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={removeFriend}
              disabled={loading}
              className="glass-card"
            >
              <Users className="h-4 w-4 mr-2" />
              Connected
            </Button>
          );
        default:
          return null;
      }
    };

    return renderConnectionButton();
  }

  // Full friend system UI
  if (!showFull || !user) return null;

  const friends = connections.filter(c => c.status === 'accepted');
  const sentRequests = connections.filter(c => c.status === 'pending' && c.requester_id === user.id);
  const receivedRequests = connections.filter(c => c.status === 'pending' && c.addressee_id === user.id);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Connections ({friends.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="friends">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
            <TabsTrigger value="sent">Sent ({sentRequests.length})</TabsTrigger>
            <TabsTrigger value="received">
              Received ({receivedRequests.length})
              {receivedRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {receivedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4">
            {friends.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No connections yet. Start connecting with other developers!
              </p>
            ) : (
              <div className="space-y-3">
                {friends.map((connection) => {
                  const friend = connection.requester_id === user.id 
                    ? connection.addressee_profile 
                    : connection.requester_profile;
                  
                  return (
                    <div key={connection.id} className="flex items-center justify-between p-3 border border-border rounded-lg glass">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friend?.avatar_url} />
                          <AvatarFallback>
                            {friend?.display_name?.charAt(0) || friend?.username?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {friend?.display_name || friend?.username}
                          </div>
                          {friend?.username && (
                            <div className="text-sm text-muted-foreground">
                              @{friend.username}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-4">
            {sentRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No pending requests sent.
              </p>
            ) : (
              <div className="space-y-3">
                {sentRequests.map((connection) => {
                  const addressee = connection.addressee_profile;
                  
                  return (
                    <div key={connection.id} className="flex items-center justify-between p-3 border border-border rounded-lg glass">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={addressee?.avatar_url} />
                          <AvatarFallback>
                            {addressee?.display_name?.charAt(0) || addressee?.username?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {addressee?.display_name || addressee?.username}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Request sent
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="received" className="mt-4">
            {receivedRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No pending requests received.
              </p>
            ) : (
              <div className="space-y-3">
                {receivedRequests.map((connection) => {
                  const requester = connection.requester_profile;
                  
                  return (
                    <div key={connection.id} className="flex items-center justify-between p-3 border border-border rounded-lg glass">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={requester?.avatar_url} />
                          <AvatarFallback>
                            {requester?.display_name?.charAt(0) || requester?.username?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {requester?.display_name || requester?.username}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Wants to connect
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => respondToRequest(connection.id, 'accepted')}
                          disabled={loading}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => respondToRequest(connection.id, 'declined')}
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};