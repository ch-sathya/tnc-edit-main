import React, { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Github,
  Linkedin,
  Twitter,
  Globe,
  MapPin,
  Mail,
  FolderOpen,
  Star,
  Edit,
  Plus,
  ExternalLink,
  Code,
  Users,
  MessageCircle,
  UserX,
  Loader2,
  Bell,
  Activity,
  Clock,
  TrendingUp,
  ArrowRight,
  Heart,
  UserPlus,
  MessageSquare,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { QuickProjectModal } from '@/components/QuickProjectModal';
import { DirectMessageModal } from '@/components/DirectMessageModal';
import { ProjectFavorites } from '@/components/ProjectFavorites';
import { FollowingFeed } from '@/components/FollowingFeed';
import { OnboardingTour } from '@/components/OnboardingTour';
import { format } from 'date-fns';

interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  github_url: string;
  live_url: string;
  image_url: string;
  status: string;
  visibility?: string;
}

interface Repository {
  id: string;
  name: string;
  description: string;
  star_count: number;
  visibility: string;
  tags: string[];
}

interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  profile: {
    user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface RecentActivity {
  id: string;
  action: string;
  target_type: string;
  created_at: string;
  metadata: any;
}

// Lazy load the heavy project form modal
const ProjectFormModal = lazy(() => 
  import('@/components/ProjectFormModal').then(mod => ({ default: mod.ProjectFormModal }))
);

const Portfolio = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Data states
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  
  // Modal states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [quickProjectOpen, setQuickProjectOpen] = useState(false);
  const [chatWithUser, setChatWithUser] = useState<Connection['profile'] | null>(null);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);

  // Fetch all data
  const fetchUserData = useCallback(async () => {
    if (!user?.id || dataFetched) return;
    
    setDataLoading(true);
    
    try {
      const [
        projectsResult, 
        reposResult, 
        connectionsResult, 
        activitiesResult,
        notificationsResult,
        roomsResult
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('id, title, description, technologies, github_url, live_url, image_url, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('repositories')
          .select('id, name, description, star_count, visibility, tags')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('user_connections')
          .select('id, requester_id, addressee_id, status')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
        supabase
          .from('activities')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false),
        supabase
          .from('room_participants')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      if (projectsResult.data) setProjects(projectsResult.data as Project[]);
      if (reposResult.data) setRepositories(reposResult.data as Repository[]);
      if (activitiesResult.data) setActivities(activitiesResult.data as RecentActivity[]);
      setUnreadNotifications(notificationsResult.count || 0);
      setRoomCount(roomsResult.count || 0);
      
      // Fetch profiles for connections
      if (connectionsResult.data && connectionsResult.data.length > 0) {
        const userIds = new Set<string>();
        connectionsResult.data.forEach(conn => {
          if (conn.requester_id !== user.id) userIds.add(conn.requester_id);
          if (conn.addressee_id !== user.id) userIds.add(conn.addressee_id);
        });

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', Array.from(userIds));

        const connectionsWithProfiles = connectionsResult.data.map(conn => {
          const otherUserId = conn.requester_id === user.id ? conn.addressee_id : conn.requester_id;
          const profile = profiles?.find(p => p.user_id === otherUserId) || {
            user_id: otherUserId,
            username: null,
            display_name: 'Unknown User',
            avatar_url: null
          };
          return { ...conn, profile };
        });

        setConnections(connectionsWithProfiles);
      }
      
      setDataFetched(true);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load portfolio data",
        variant: "destructive"
      });
    } finally {
      setDataLoading(false);
    }
  }, [user?.id, dataFetched, toast]);

  const removeConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      setConnections(prev => prev.filter(c => c.id !== connectionId));
      toast({
        title: "Removed",
        description: "Connection removed successfully"
      });
    } catch (error) {
      console.error('Error removing connection:', error);
      toast({
        title: "Error",
        description: "Failed to remove connection",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user && !dataFetched) {
      fetchUserData();
    }
  }, [user, dataFetched, fetchUserData]);

  const handleQuickCreate = () => setQuickProjectOpen(true);
  const handleFullCreate = () => {
    setEditingProject(undefined);
    setProjectModalOpen(true);
  };
  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectModalOpen(true);
  };
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast({ title: 'Success', description: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({ title: 'Error', description: 'Failed to delete project', variant: 'destructive' });
    }
  };
  const handleProjectCreated = (projectId: string) => navigate(`/editor/${projectId}`);
  const refreshData = () => setDataFetched(false);

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'create': return <Plus className="h-4 w-4 text-green-500" />;
      case 'star': return <Star className="h-4 w-4 text-yellow-500" />;
      case 'join': return <UserPlus className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (authLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto py-8 px-4 max-w-7xl">
            <Card>
              <CardHeader>
                <CardTitle>Sign in Required</CardTitle>
                <CardDescription>Please sign in to view your portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/auth')}>Go to Sign In</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  const totalStars = repositories.reduce((sum, repo) => sum + (repo.star_count || 0), 0);

  const quickActions = [
    { label: 'New Project', icon: Plus, onClick: handleQuickCreate, primary: true },
    { label: 'Join Room', icon: Users, onClick: () => navigate('/collaborate') },
    { label: 'Find People', icon: UserPlus, onClick: () => navigate('/community') },
    { label: 'Notifications', icon: Bell, onClick: () => navigate('/notifications'), badge: unreadNotifications },
  ];

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1">
          <div className="container mx-auto py-8 px-4 max-w-7xl">
            {/* Welcome Banner */}
            <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-secondary via-secondary/80 to-card border border-border">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-border">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xl">
                    {(profile?.display_name?.charAt(0) || 'U').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    Welcome back, {profile?.display_name || 'Developer'}
                  </h1>
                  <p className="text-muted-foreground">
                    Here's your portfolio dashboard
                  </p>
                </div>
                <Button onClick={() => setEditProfileOpen(true)} variant="outline" className="hidden md:flex gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8" data-tour="portfolio">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.primary ? "default" : "outline"}
                  className="h-auto py-4 flex flex-col gap-2 relative"
                  onClick={action.onClick}
                >
                  <action.icon className="h-5 w-5" />
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: 'Projects', value: projects.length, icon: FolderOpen },
                { label: 'Repositories', value: repositories.length, icon: Github },
                { label: 'Stars', value: totalStars, icon: Star },
                { label: 'Connections', value: connections.length, icon: Users },
                { label: 'Rooms', value: roomCount, icon: MessageSquare },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dataLoading ? <Skeleton className="h-8 w-12" /> : stat.value}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {/* Recent Activity */}
              <Card className="lg:col-span-2" data-tour="activity">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Your latest actions</CardDescription>
                </CardHeader>
                <CardContent>
                  {dataLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      ))}
                    </div>
                  ) : activities.length > 0 ? (
                    <div className="space-y-3">
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
                              {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Activity className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Quick Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'Browse Projects', href: '/projects' },
                    { label: 'Start Collaborating', href: '/collaborate' },
                    { label: 'Join Community', href: '/community' },
                    { label: 'Read News', href: '/news' },
                  ].map((link) => (
                    <Button
                      key={link.label}
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => navigate(link.href)}
                    >
                      {link.label}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Following & Favorites Row */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <FollowingFeed />
              <ProjectFavorites />
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="projects" className="w-full" data-tour="projects">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="repositories">Repositories</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
              </TabsList>

              <TabsContent value="projects" className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">My Projects</h2>
                  <div className="flex gap-2">
                    <Button onClick={handleQuickCreate} className="gap-2">
                      <Code className="h-4 w-4" />
                      Quick Create
                    </Button>
                    <Button onClick={handleFullCreate} variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Full Details
                    </Button>
                  </div>
                </div>

                {dataLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-12">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading projects…</span>
                  </div>
                ) : projects.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                      <p className="text-muted-foreground mb-4">Start building and showcasing your work!</p>
                      <Button onClick={handleQuickCreate}>Create Your First Project</Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {projects.map((project) => (
                      <Card key={project.id}>
                        {project.image_url && (
                          <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                            <img src={project.image_url} alt={project.title} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        )}
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle>{project.title}</CardTitle>
                            <Badge variant={project.status === 'published' ? 'default' : 'secondary'}>{project.status}</Badge>
                          </div>
                          <CardDescription>{project.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {project.technologies?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {project.technologies.map((tech, i) => <Badge key={i} variant="outline">{tech}</Badge>)}
                            </div>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            <Button variant="default" size="sm" onClick={() => navigate(`/editor/${project.id}`)}>
                              <Code className="h-4 w-4 mr-2" />Open Editor
                            </Button>
                            {project.github_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                                  <Github className="h-4 w-4 mr-2" />Code
                                </a>
                              </Button>
                            )}
                            {project.live_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-2" />Live
                                </a>
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => handleEditProject(project)}>
                              <Edit className="h-4 w-4 mr-2" />Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteProject(project.id)}>Delete</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="repositories" className="mt-6">
                {dataLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-12">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading repositories…</span>
                  </div>
                ) : repositories.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Github className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No repositories yet</h3>
                      <p className="text-muted-foreground">Create your first repository to get started!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {repositories.map((repo) => (
                      <Card key={repo.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="flex items-center gap-2">
                                {repo.name}
                                <Badge variant="outline">{repo.visibility}</Badge>
                              </CardTitle>
                              <CardDescription>{repo.description}</CardDescription>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Star className="h-4 w-4" />
                              <span>{repo.star_count || 0}</span>
                            </div>
                          </div>
                        </CardHeader>
                        {repo.tags?.length > 0 && (
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {repo.tags.map((tag, i) => <Badge key={i} variant="secondary">{tag}</Badge>)}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="connections" className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">My Connections</h2>
                  <Button onClick={() => navigate('/connections')} variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    Manage Connections
                  </Button>
                </div>

                {dataLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-12">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading connections…</span>
                  </div>
                ) : connections.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
                      <p className="text-muted-foreground mb-4">Start connecting with other developers!</p>
                      <Button onClick={() => navigate('/connections')}>Find People</Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {connections.map((connection) => (
                      <Card key={connection.id} className="hover:shadow-md transition-shadow">
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
                                <div className="text-sm text-muted-foreground truncate">@{connection.profile.username}</div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => setChatWithUser(connection.profile)}>
                                <MessageCircle className="h-4 w-4 mr-1" />Message
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => removeConnection(connection.id)}>
                                <UserX className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <Footer />
      </div>

      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* Modals */}
      {editProfileOpen && (
        <ProfileEditModal 
          open={editProfileOpen} 
          onOpenChange={setEditProfileOpen}
          profile={profile || {}}
          userId={user.id}
          onSuccess={refreshData}
        />
      )}
      
      <QuickProjectModal
        open={quickProjectOpen}
        onOpenChange={setQuickProjectOpen}
        userId={user.id}
        onSuccess={handleProjectCreated}
      />
      
      <Suspense fallback={null}>
        {projectModalOpen && (
          <ProjectFormModal
            open={projectModalOpen}
            onOpenChange={setProjectModalOpen}
            userId={user.id}
            project={editingProject}
            onSuccess={refreshData}
          />
        )}
      </Suspense>

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

export default Portfolio;
