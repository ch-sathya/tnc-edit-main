import React, { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Github, Linkedin, Twitter, Globe, MapPin, Mail, FolderOpen, Star, Edit, Plus, ExternalLink, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { QuickProjectModal } from '@/components/QuickProjectModal';

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

// Lazy load the heavy project form modal
const ProjectFormModal = lazy(() => 
  import('@/components/ProjectFormModal').then(mod => ({ default: mod.ProjectFormModal }))
);

const PortfolioSkeleton = () => (
  <div className="container mx-auto py-8 px-4 max-w-7xl">
    <Card className="mb-8">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-6">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="pt-6">
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

const Portfolio = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Data states - initialize as empty, not loading
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  
  // Modal states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [quickProjectOpen, setQuickProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);

  // Fetch data in background - non-blocking
  const fetchUserData = useCallback(async () => {
    if (!user?.id || dataFetched) return;
    
    setDataLoading(true);
    
    try {
      // Parallel fetch for better performance
      const [projectsResult, reposResult] = await Promise.all([
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
          .limit(50)
      ]);

      if (projectsResult.data) setProjects(projectsResult.data as Project[]);
      if (reposResult.data) setRepositories(reposResult.data as Repository[]);
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

  // Fetch data when user is available - non-blocking effect
  useEffect(() => {
    if (user && !dataFetched) {
      fetchUserData();
    }
  }, [user, dataFetched, fetchUserData]);

  const handleQuickCreate = () => {
    setQuickProjectOpen(true);
  };

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
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      // Optimistic update
      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast({ title: 'Success', description: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      });
    }
  };

  const handleProjectCreated = (projectId: string) => {
    navigate(`/editor/${projectId}`);
  };

  const refreshData = () => {
    setDataFetched(false);
  };

  // Show skeleton only for auth loading - UI is immediately interactive
  if (authLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background">
          <PortfolioSkeleton />
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
                <CardDescription>
                  Please sign in to view your portfolio
                </CardDescription>
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

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          {/* Profile Header - Shows immediately with profile data */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                {profileLoading ? (
                  <Skeleton className="h-32 w-32 rounded-full" />
                ) : (
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.display_name} />
                    <AvatarFallback className="text-4xl">
                      {profile?.display_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className="flex-1">
                  {profileLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-8 w-48" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  ) : (
                    <>
                      <h1 className="text-3xl font-bold text-foreground mb-2">
                        {profile?.display_name || 'User'}
                      </h1>
                      {(profile as any)?.username && (
                        <p className="text-muted-foreground mb-3">@{(profile as any).username}</p>
                      )}
                      
                      {profile?.bio && (
                        <p className="text-foreground mb-4">{profile.bio}</p>
                      )}

                      <div className="flex flex-wrap gap-4 mb-4">
                        {(profile as any)?.location && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{(profile as any).location}</span>
                          </div>
                        )}
                        {user?.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{user.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {(profile as any)?.github_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={(profile as any).github_url} target="_blank" rel="noopener noreferrer">
                              <Github className="h-4 w-4 mr-2" />
                              GitHub
                            </a>
                          </Button>
                        )}
                        {(profile as any)?.linkedin_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={(profile as any).linkedin_url} target="_blank" rel="noopener noreferrer">
                              <Linkedin className="h-4 w-4 mr-2" />
                              LinkedIn
                            </a>
                          </Button>
                        )}
                        {(profile as any)?.twitter_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={(profile as any).twitter_url} target="_blank" rel="noopener noreferrer">
                              <Twitter className="h-4 w-4 mr-2" />
                              Twitter
                            </a>
                          </Button>
                        )}
                        {(profile as any)?.website && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={(profile as any).website} target="_blank" rel="noopener noreferrer">
                              <Globe className="h-4 w-4 mr-2" />
                              Website
                            </a>
                          </Button>
                        )}
                      </div>

                      <Button onClick={() => setEditProfileOpen(true)} className="gap-2">
                        <Edit className="h-4 w-4" />
                        Edit Profile
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats - Shows loading state but doesn't block */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dataLoading ? <Skeleton className="h-8 w-12" /> : projects.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Repositories</CardTitle>
                <Github className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dataLoading ? <Skeleton className="h-8 w-12" /> : repositories.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stars</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dataLoading ? <Skeleton className="h-8 w-12" /> : totalStars}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Tabs - Always interactive */}
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="repositories">Repositories</TabsTrigger>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <Skeleton className="h-40 w-full mb-4" />
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full" />
                      </CardContent>
                    </Card>
                  ))}
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
                          <img 
                            src={project.image_url} 
                            alt={project.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle>{project.title}</CardTitle>
                          <Badge variant={project.status === 'published' ? 'default' : 'secondary'}>
                            {project.status}
                          </Badge>
                        </div>
                        <CardDescription>{project.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {project.technologies && project.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {project.technologies.map((tech, index) => (
                              <Badge key={index} variant="outline">{tech}</Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => navigate(`/editor/${project.id}`)}
                          >
                            <Code className="h-4 w-4 mr-2" />
                            Open Editor
                          </Button>
                          {project.github_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                                <Github className="h-4 w-4 mr-2" />
                                Code
                              </a>
                            </Button>
                          )}
                          {project.live_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Live
                              </a>
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditProject(project)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="repositories" className="mt-6">
              {dataLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-full" />
                      </CardContent>
                    </Card>
                  ))}
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

      {/* Modals - Lazy loaded */}
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
    </>
  );
};

export default Portfolio;
