import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Star, 
  FolderOpen, 
  Users, 
  UserPlus, 
  GitBranch,
  MessageSquare,
  Clock,
  UserMinus,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface FollowedUser {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface FollowingFeedProps {
  className?: string;
}

export const FollowingFeed: React.FC<FollowingFeedProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [following, setFollowing] = useState<FollowedUser[]>([]);
  const [followers, setFollowers] = useState<FollowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchFollowData();
  }, [user]);

  const fetchFollowData = async () => {
    if (!user) return;

    try {
      // Fetch users I'm following
      const { data: followingData } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingUserIds = followingData?.map(f => f.following_id) || [];
      setFollowingIds(new Set(followingUserIds));

      if (followingUserIds.length > 0) {
        const { data: followingProfiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url, bio')
          .in('user_id', followingUserIds);

        setFollowing(followingProfiles?.map(p => ({ id: p.user_id, ...p })) || []);
      }

      // Fetch my followers
      const { data: followerData } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', user.id);

      const followerUserIds = followerData?.map(f => f.follower_id) || [];

      if (followerUserIds.length > 0) {
        const { data: followerProfiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url, bio')
          .in('user_id', followerUserIds);

        setFollowers(followerProfiles?.map(p => ({ id: p.user_id, ...p })) || []);
      }
    } catch (error) {
      console.error('Error fetching follow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user) return;

    setActionLoading(targetUserId);
    try {
      const { error } = await supabase
        .from('user_follows')
        .insert({ follower_id: user.id, following_id: targetUserId });

      if (error) throw error;

      setFollowingIds(prev => new Set([...prev, targetUserId]));
      toast({ title: 'Following', description: 'You are now following this user.' });
      fetchFollowData();
    } catch (error) {
      console.error('Error following user:', error);
      toast({ title: 'Error', description: 'Failed to follow user.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!user) return;

    setActionLoading(targetUserId);
    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      if (error) throw error;

      setFollowingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
      toast({ title: 'Unfollowed', description: 'You have unfollowed this user.' });
      fetchFollowData();
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast({ title: 'Error', description: 'Failed to unfollow user.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const UserCard: React.FC<{ userData: FollowedUser; showFollowButton?: boolean }> = ({ 
    userData, 
    showFollowButton = false 
  }) => {
    const isFollowing = followingIds.has(userData.user_id);
    const isLoading = actionLoading === userData.user_id;

    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
        <Avatar 
          className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          onClick={() => navigate(`/user/${userData.user_id}`)}
        >
          <AvatarImage src={userData.avatar_url || undefined} />
          <AvatarFallback>
            {userData.display_name?.[0] || userData.username?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p 
            className="font-medium text-foreground truncate cursor-pointer hover:underline"
            onClick={() => navigate(`/user/${userData.user_id}`)}
          >
            {userData.display_name || userData.username || 'User'}
          </p>
          {userData.username && (
            <p className="text-sm text-muted-foreground truncate">@{userData.username}</p>
          )}
        </div>
        {showFollowButton && userData.user_id !== user?.id && (
          <Button
            variant={isFollowing ? "outline" : "default"}
            size="sm"
            disabled={isLoading}
            onClick={() => isFollowing ? handleUnfollow(userData.user_id) : handleFollow(userData.user_id)}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isFollowing ? (
              <>
                <UserMinus className="h-4 w-4 mr-1" />
                Unfollow
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-1" />
                Follow
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Following & Followers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-tour="following">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Following & Followers
        </CardTitle>
        <CardDescription>
          <span className="font-medium">{following.length}</span> following · <span className="font-medium">{followers.length}</span> followers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Following Section */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Following ({following.length})
          </h4>
          {following.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {following.slice(0, 5).map((userData) => (
                <UserCard key={userData.user_id} userData={userData} showFollowButton />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">Not following anyone yet</p>
          )}
        </div>

        {/* Followers Section */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Followers ({followers.length})
          </h4>
          {followers.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {followers.slice(0, 5).map((userData) => (
                <UserCard key={userData.user_id} userData={userData} showFollowButton />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No followers yet</p>
          )}
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/connections')}
        >
          View All Connections
        </Button>
      </CardContent>
    </Card>
  );
};
