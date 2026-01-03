import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  FolderOpen, 
  Users, 
  GitBranch, 
  Star, 
  Bell, 
  MessageSquare,
  ArrowRight,
  Plus,
  Clock,
  TrendingUp,
  Activity,
  UserPlus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { format } from 'date-fns';

interface DashboardStats {
  projectCount: number;
  repoCount: number;
  connectionCount: number;
  roomCount: number;
  unreadNotifications: number;
}

interface RecentActivity {
  id: string;
  action: string;
  target_type: string;
  created_at: string;
  metadata: any;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const [stats, setStats] = useState<DashboardStats>({
    projectCount: 0,
    repoCount: 0,
    connectionCount: 0,
    roomCount: 0,
    unreadNotifications: 0,
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        const [
          projectsResult,
          reposResult,
          connectionsResult,
          roomsResult,
          notificationsResult,
          activitiesResult,
        ] = await Promise.all([
          supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('repositories').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('user_connections').select('*', { count: 'exact', head: true })
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
            .eq('status', 'accepted'),
          supabase.from('room_participants').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
          supabase.from('activities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        ]);

        setStats({
          projectCount: projectsResult.count || 0,
          repoCount: reposResult.count || 0,
          connectionCount: connectionsResult.count || 0,
          roomCount: roomsResult.count || 0,
          unreadNotifications: notificationsResult.count || 0,
        });

        setActivities(activitiesResult.data || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const quickActions = [
    { label: 'New Project', icon: Plus, onClick: () => navigate('/projects'), color: 'bg-primary text-primary-foreground' },
    { label: 'Join Room', icon: Users, onClick: () => navigate('/collaborate'), color: 'bg-secondary text-secondary-foreground' },
    { label: 'Find People', icon: UserPlus, onClick: () => navigate('/community'), color: 'bg-secondary text-secondary-foreground' },
    { label: 'Notifications', icon: Bell, onClick: () => navigate('/notifications'), badge: stats.unreadNotifications, color: 'bg-secondary text-secondary-foreground' },
  ];

  const statCards = [
    { label: 'Projects', value: stats.projectCount, icon: FolderOpen, href: '/projects' },
    { label: 'Repositories', value: stats.repoCount, icon: GitBranch, href: '/portfolio' },
    { label: 'Connections', value: stats.connectionCount, icon: Users, href: '/connections' },
    { label: 'Rooms', value: stats.roomCount, icon: MessageSquare, href: '/collaborate' },
  ];

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'create': return <Plus className="h-4 w-4 text-green-500" />;
      case 'star': return <Star className="h-4 w-4 text-yellow-500" />;
      case 'join': return <UserPlus className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <main className="flex-1 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-16 w-16 border-2 border-border">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xl">
                  {profile?.display_name?.[0] || profile?.username?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Welcome back, {profile?.display_name || profile?.username || 'Developer'}
                </h1>
                <p className="text-muted-foreground">
                  Here's what's happening with your portfolio today.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className={`h-auto py-4 flex flex-col gap-2 relative ${action.color}`}
                onClick={action.onClick}
              >
                <action.icon className="h-6 w-6" />
                <span className="text-sm font-medium">{action.label}</span>
                {action.badge ? (
                  <Badge className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground">
                    {action.badge}
                  </Badge>
                ) : null}
              </Button>
            ))}
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat) => (
              <Card 
                key={stat.label} 
                className="cursor-pointer hover:border-foreground/20 transition-colors"
                onClick={() => navigate(stat.href)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Your latest actions and updates</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-3/4 mb-1" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                          {getActivityIcon(activity.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            {activity.action.charAt(0).toUpperCase() + activity.action.slice(1)}d a {activity.target_type}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-sm">Start creating projects to see your activity here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Get Started
                </CardTitle>
                <CardDescription>Quick links to grow your portfolio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate('/portfolio')}
                >
                  Complete your portfolio
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate('/projects')}
                >
                  Create a new project
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate('/collaborate')}
                >
                  Start collaborating
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate('/community')}
                >
                  Join a community group
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
