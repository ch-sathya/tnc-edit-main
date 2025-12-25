import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Github,
  Linkedin,
  Twitter,
  Globe,
  MapPin,
  FolderOpen,
  Star,
  UserPlus,
  Check,
  Clock,
  MessageCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { DirectMessageModal } from '@/components/DirectMessageModal';

interface UserProfileData {
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

interface Project {
  id: string;
  title: string;
  description: string | null;
  technologies: string[] | null;
  github_url: string | null;
  live_url: string | null;
  image_url: string | null;
  status: string | null;
}

interface Repository {
  id: string;
  name: string;
  description: string | null;
  star_count: number;
  visibility: string;
  tags: string[] | null;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'connected'>('none');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId, user]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        toast({
          title: "Not Found",
          description: "User profile not found",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      setProfile(profileData);

      // Fetch public projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, title, description, technologies, github_url, live_url, image_url, status')
        .eq('user_id', userId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(20);

      setProjects(projectsData || []);

      // Fetch public repositories
      const { data: reposData } = await supabase
        .from('repositories')
        .select('id, name, description, star_count, visibility, tags')
        .eq('user_id', userId)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(20);

      setRepositories(reposData || []);

      // Check connection status if logged in
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

  const handleConnectionAction = async (action: 'accept' | 'decline') => {
    if (!user || !userId) return;

    try {
      setSendingRequest(true);

      // Find the connection
      const { data: connections } = await supabase
        .from('user_connections')
        .select('id')
        .eq('requester_id', userId)
        .eq('addressee_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (!connections) return;

      if (action === 'accept') {
        const { error } = await supabase
          .from('user_connections')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', connections.id);

        if (error) throw error;
        setConnectionStatus('connected');

        toast({
          title: "Accepted",
          description: "Connection request accepted"
        });
      } else {
        const { error } = await supabase
          .from('user_connections')
          .delete()
          .eq('id', connections.id);

        if (error) throw error;
        setConnectionStatus('none');

        toast({
          title: "Declined",
          description: "Connection request declined"
        });
      }
    } catch (error) {
      console.error('Error handling connection:', error);
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive"
      });
    } finally {
      setSendingRequest(false);
    }
  };

  const isOwnProfile = user?.id === userId;
  const totalStars = repositories.reduce((sum, repo) => sum + (repo.star_count || 0), 0);

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto py-16 px-4 max-w-5xl flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" aria-hidden="true" />
            <span className="text-sm">Loading profile…</span>
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto py-8 px-4 max-w-5xl">
            <Card>
              <CardContent className="py-12 text-center">
                <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
                <p className="text-muted-foreground mb-4">This profile doesn't exist.</p>
                <Button onClick={() => navigate('/')}>Go Home</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-5xl">
          {/* Profile Header */}
          
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || 'User'} />
                  <AvatarFallback className="text-4xl">
                    {(profile.display_name || profile.username || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground">
                        {profile.display_name || profile.username || 'User'}
                      </h1>
                      {profile.username && (
                        <p className="text-muted-foreground">@{profile.username}</p>
                      )}
                    </div>

                    {/* Connection Actions */}
                    {!isOwnProfile && user && (
                      <div className="flex gap-2">
                        {connectionStatus === 'connected' ? (
                          <>
                            <Badge variant="secondary" className="gap-1 py-2 px-3">
                              <Check className="h-3 w-3" />
                              Connected
                            </Badge>
                            <Button onClick={() => setChatOpen(true)}>
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Message
                            </Button>
                          </>
                        ) : connectionStatus === 'pending_sent' ? (
                          <Badge variant="outline" className="gap-1 py-2 px-3">
                            <Clock className="h-3 w-3" />
                            Request Pending
                          </Badge>
                        ) : connectionStatus === 'pending_received' ? (
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => handleConnectionAction('accept')}
                              disabled={sendingRequest}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Accept
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => handleConnectionAction('decline')}
                              disabled={sendingRequest}
                            >
                              Decline
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            onClick={sendConnectionRequest}
                            disabled={sendingRequest}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Connect
                          </Button>
                        )}
                      </div>
                    )}

                    {isOwnProfile && (
                      <Button onClick={() => navigate('/portfolio')}>
                        Edit Profile
                      </Button>
                    )}
                  </div>
                  
                  {profile.bio && (
                    <p className="text-foreground mb-4">{profile.bio}</p>
                  )}

                  {profile.location && (
                    <div className="flex items-center gap-2 text-muted-foreground mb-4">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}

                  {/* Skills */}
                  {profile.skills && profile.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {profile.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Social Links */}
                  <div className="flex flex-wrap gap-2">
                    {profile.github_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={profile.github_url} target="_blank" rel="noopener noreferrer">
                          <Github className="h-4 w-4 mr-2" />
                          GitHub
                        </a>
                      </Button>
                    )}
                    {profile.linkedin_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="h-4 w-4 mr-2" />
                          LinkedIn
                        </a>
                      </Button>
                    )}
                    {profile.twitter_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer">
                          <Twitter className="h-4 w-4 mr-2" />
                          Twitter
                        </a>
                      </Button>
                    )}
                    {profile.website && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={profile.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4 mr-2" />
                          Website
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projects.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Repositories</CardTitle>
                <Github className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{repositories.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stars</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStars}</div>
              </CardContent>
            </Card>
          </div>

          {/* Content Tabs */}
          
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="repositories">Repositories</TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="mt-6">
              {projects.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No public projects</h3>
                    <p className="text-muted-foreground">This user hasn't published any projects yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {projects.map((project) => (
                    <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/projects/${project.id}`)}>
                      {project.image_url && (
                        <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                          <img 
                            src={project.image_url} 
                            alt={project.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle>{project.title}</CardTitle>
                        <CardDescription>{project.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {project.technologies && project.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {project.technologies.slice(0, 5).map((tech, index) => (
                              <Badge key={index} variant="outline">{tech}</Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          {project.github_url && (
                            <Button variant="outline" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                              <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                                <Github className="h-4 w-4 mr-2" />
                                Code
                              </a>
                            </Button>
                          )}
                          {project.live_url && (
                            <Button variant="outline" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                              <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Live
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="repositories" className="mt-6">
              {repositories.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Github className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No public repositories</h3>
                    <p className="text-muted-foreground">This user hasn't created any public repositories yet.</p>
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
                      {repo.tags && repo.tags.length > 0 && (
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {repo.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary">{tag}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          
        </div>
      </div>

      {/* Direct Message Modal */}
      {chatOpen && profile && (
        <DirectMessageModal
          open={chatOpen}
          onOpenChange={setChatOpen}
          otherUser={{
            user_id: profile.user_id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url
          }}
        />
      )}
    </>
  );
};

export default UserProfile;
