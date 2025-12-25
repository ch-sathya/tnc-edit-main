import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserPlus, Check, Clock, MessageSquare, MapPin, 
  Globe, Github, Linkedin, Twitter 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface FullProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  skills: string[] | null;
  created_at: string;
}

interface UserProfileModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessage?: (userId: string) => void;
}

export const UserProfileModal = ({ userId, open, onOpenChange, onMessage }: UserProfileModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'connected'>('none');
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchProfile();
    }
  }, [open, userId]);

  const fetchProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(profileData);

      // Get connection status
      if (user && user.id !== userId) {
        const { data: connections } = await supabase
          .from('user_connections')
          .select('requester_id, addressee_id, status')
          .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`);

        const connection = connections?.[0];
        if (connection) {
          if (connection.status === 'accepted') {
            setConnectionStatus('connected');
          } else if (connection.status === 'pending') {
            setConnectionStatus(connection.requester_id === user.id ? 'pending_sent' : 'pending_received');
          }
        } else {
          setConnectionStatus('none');
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendConnectionRequest = async () => {
    if (!user || !userId) return;

    try {
      setSendingRequest(true);
      
      const { error } = await supabase
        .from('user_connections')
        .insert({
          requester_id: user.id,
          addressee_id: userId,
          status: 'pending'
        });

      if (error) throw error;
      setConnectionStatus('pending_sent');

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
      setSendingRequest(false);
    }
  };

  const handleMessage = () => {
    if (userId && onMessage) {
      onMessage(userId);
      onOpenChange(false);
    }
  };

  const isOwnProfile = user?.id === userId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">User Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : profile ? (
          <div className="space-y-4">
            {/* Profile Header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {(profile.display_name || profile.username || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">
                  {profile.display_name || profile.username || 'Unknown User'}
                </h2>
                {profile.username && (
                  <p className="text-muted-foreground">@{profile.username}</p>
                )}
                {profile.location && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    {profile.location}
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-muted-foreground">{profile.bio}</p>
            )}

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {profile.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}

            {/* Social Links */}
            <div className="flex gap-2">
              {profile.website && (
                <Button variant="outline" size="icon" asChild>
                  <a href={profile.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {profile.github_url && (
                <Button variant="outline" size="icon" asChild>
                  <a href={profile.github_url} target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {profile.linkedin_url && (
                <Button variant="outline" size="icon" asChild>
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {profile.twitter_url && (
                <Button variant="outline" size="icon" asChild>
                  <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer">
                    <Twitter className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            {!isOwnProfile && user && (
              <div className="flex gap-2 pt-2 border-t">
                {connectionStatus === 'connected' ? (
                  <>
                    <Badge variant="secondary" className="gap-1 py-2 px-3">
                      <Check className="h-3 w-3" />
                      Connected
                    </Badge>
                    <Button variant="default" className="flex-1" onClick={handleMessage}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </>
                ) : connectionStatus === 'pending_sent' ? (
                  <Badge variant="outline" className="gap-1 py-2 px-3">
                    <Clock className="h-3 w-3" />
                    Request Pending
                  </Badge>
                ) : connectionStatus === 'pending_received' ? (
                  <Badge variant="default" className="gap-1 py-2 px-3">
                    <Clock className="h-3 w-3" />
                    Respond to Request
                  </Badge>
                ) : (
                  <Button 
                    className="flex-1"
                    onClick={sendConnectionRequest}
                    disabled={sendingRequest}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Profile not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
