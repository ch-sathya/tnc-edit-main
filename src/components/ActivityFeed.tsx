import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: any;
  created_at: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface ActivityFeedProps {
  limit?: number;
  userId?: string;
  showHeader?: boolean;
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  limit = 10, 
  userId,
  showHeader = true,
  className = ''
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchActivities = async () => {
      let query = supabase
        .from('activities')
        .select(`
          *,
          profile:profiles!activities_user_id_fkey(display_name, username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching activities:', error);
      } else {
        setActivities(data || []);
      }
      setLoading(false);
    };

    fetchActivities();

    // Subscribe to new activities
    const channel = supabase
      .channel('public_activities')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'activities' },
        async (payload) => {
          // Fetch profile for new activity
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, username, avatar_url')
            .eq('user_id', (payload.new as ActivityItem).user_id)
            .single();
          
          const newActivity = { ...payload.new, profile } as ActivityItem;
          setActivities(prev => [newActivity, ...prev.slice(0, limit - 1)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit, userId]);

  const getIcon = (action: string, targetType: string) => {
    if (action === 'star') return <Star className="h-4 w-4 text-yellow-500" />;
    if (action === 'create' && targetType === 'project') return <FolderOpen className="h-4 w-4 text-blue-500" />;
    if (action === 'create' && targetType === 'repository') return <GitBranch className="h-4 w-4 text-purple-500" />;
    if (action === 'join' && targetType === 'room') return <Users className="h-4 w-4 text-green-500" />;
    if (action === 'connect') return <UserPlus className="h-4 w-4 text-orange-500" />;
    if (action === 'message') return <MessageSquare className="h-4 w-4 text-cyan-500" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  const getActionText = (action: string, targetType: string, metadata: any) => {
    const targetName = metadata?.name || metadata?.title || targetType;
    
    switch (action) {
      case 'create':
        return `created a new ${targetType}`;
      case 'star':
        return `starred ${targetName}`;
      case 'join':
        return `joined ${targetName}`;
      case 'connect':
        return 'made a new connection';
      case 'update':
        return `updated ${targetName}`;
      default:
        return `${action}d a ${targetType}`;
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Feed
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Feed
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 group">
                <Avatar 
                  className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => handleUserClick(activity.user_id)}
                >
                  <AvatarImage src={activity.profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {activity.profile?.display_name?.[0] || activity.profile?.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span 
                      className="font-medium hover:underline cursor-pointer"
                      onClick={() => handleUserClick(activity.user_id)}
                    >
                      {activity.profile?.display_name || activity.profile?.username || 'Someone'}
                    </span>
                    {' '}
                    <span className="text-muted-foreground">
                      {getActionText(activity.action, activity.target_type, activity.metadata)}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-5 w-5 rounded-full bg-secondary/50 flex items-center justify-center">
                      {getIcon(activity.action, activity.target_type)}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No activity yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
