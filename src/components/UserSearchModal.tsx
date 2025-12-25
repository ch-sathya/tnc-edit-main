import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Search, UserPlus, Check, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { UserProfileModal } from './UserProfileModal';

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  connectionStatus?: 'none' | 'pending_sent' | 'pending_received' | 'connected';
}

interface UserSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserSearchModal = ({ open, onOpenChange }: UserSearchModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    if (open && searchQuery.trim().length >= 2) {
      searchUsers();
    } else if (!searchQuery.trim()) {
      setUsers([]);
    }
  }, [searchQuery, open]);

  const searchUsers = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Search for users by username or display_name
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, bio')
        .neq('user_id', user.id)
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;

      // Get connection statuses for these users
      const { data: connections } = await supabase
        .from('user_connections')
        .select('requester_id, addressee_id, status')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      // Map connection status to each user
      const usersWithStatus = (profiles || []).map(profile => {
        const connection = connections?.find(
          c => (c.requester_id === user.id && c.addressee_id === profile.user_id) ||
               (c.addressee_id === user.id && c.requester_id === profile.user_id)
        );

        let connectionStatus: UserProfile['connectionStatus'] = 'none';
        if (connection) {
          if (connection.status === 'accepted') {
            connectionStatus = 'connected';
          } else if (connection.status === 'pending') {
            connectionStatus = connection.requester_id === user.id ? 'pending_sent' : 'pending_received';
          }
        }

        return { ...profile, connectionStatus };
      });

      setUsers(usersWithStatus);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendConnectionRequest = async (e: React.MouseEvent, targetUserId: string) => {
    e.stopPropagation();
    if (!user) return;

    try {
      setSendingRequest(targetUserId);
      
      const { error } = await supabase
        .from('user_connections')
        .insert({
          requester_id: user.id,
          addressee_id: targetUserId,
          status: 'pending'
        });

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === targetUserId 
          ? { ...u, connectionStatus: 'pending_sent' as const }
          : u
      ));

      toast({
        title: "Request Sent",
        description: "Connection request sent successfully"
      });
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast({
        title: "Error",
        description: "Failed to send connection request",
        variant: "destructive"
      });
    } finally {
      setSendingRequest(null);
    }
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setProfileModalOpen(true);
  };

  const getConnectionButton = (userProfile: UserProfile) => {
    switch (userProfile.connectionStatus) {
      case 'connected':
        return (
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" />
            Connected
          </Badge>
        );
      case 'pending_sent':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'pending_received':
        return (
          <Badge variant="default" className="gap-1">
            <Clock className="h-3 w-3" />
            Respond
          </Badge>
        );
      default:
        return (
          <Button 
            size="sm" 
            onClick={(e) => sendConnectionRequest(e, userProfile.user_id)}
            disabled={sendingRequest === userProfile.user_id}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Connect
          </Button>
        );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Find People</DialogTitle>
            <DialogDescription>
              Search for developers and connect with them
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-2 min-h-[200px]">
            {loading ? (
              <>
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery.trim().length < 2 
                  ? "Type at least 2 characters to search"
                  : "No users found"
                }
              </div>
            ) : (
              users.map(userProfile => (
                <div 
                  key={userProfile.id} 
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleUserClick(userProfile.user_id)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userProfile.avatar_url || undefined} />
                    <AvatarFallback>
                      {(userProfile.display_name || userProfile.username || '?')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {userProfile.display_name || userProfile.username || 'Unknown User'}
                    </div>
                    {userProfile.username && userProfile.display_name && (
                      <div className="text-sm text-muted-foreground truncate">
                        @{userProfile.username}
                      </div>
                    )}
                    {userProfile.bio && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {userProfile.bio}
                      </div>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    {getConnectionButton(userProfile)}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <UserProfileModal
        userId={selectedUserId}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />
    </>
  );
};
