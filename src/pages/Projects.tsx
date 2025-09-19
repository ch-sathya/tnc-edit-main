import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserSearch } from '@/components/UserSearch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Clock, Users, Star, Globe, Lock, ExternalLink, Edit, Trash2, Code, GitBranch } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ProjectsProps {
  onNavigate: (page: string, data?: any) => void;
}

interface Project {
  id: string;
  title: string;
  description: string;
  content: string;
  technologies: string[];
  github_url: string;
  live_url: string;
  image_url: string;
  status: 'draft' | 'published';
  featured: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface Repository {
  id: string;
  name: string;
  description: string;
  visibility: 'public' | 'private';
  admin_override_visibility: string;
  star_count: number;
  fork_count: number;
  tags: string[];
  user_id: string;
  created_at: string;
  updated_at: string;
}

const Projects: React.FC<ProjectsProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewRepo, setShowNewRepo] = useState(false);
  const [projectType, setProjectType] = useState<'live' | 'repo'>('live');
  
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    content: '',
    technologies: '',
    github_url: '',
    live_url: '',
    status: 'draft' as 'draft' | 'published'
  });

  const [newRepo, setNewRepo] = useState({
    name: '',
    description: '',
    visibility: 'private' as 'public' | 'private',
    tags: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProjects(),
        fetchRepositories()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }

    setProjects((data || []).map(p => ({
      ...p,
      status: p.status as 'draft' | 'published',
      description: p.description || '',
      technologies: p.technologies || [],
      github_url: p.github_url || '',
      live_url: p.live_url || ''
    })));
  };

  const fetchRepositories = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching repositories:', error);
      return;
    }

    setRepositories((data || []).map(r => ({
      ...r,
      visibility: r.visibility as 'public' | 'private',
      description: r.description || '',
      tags: r.tags || []
    })));
  };

  const createProject = async () => {
    if (!user || !newProject.title.trim()) return;

    try {
      const technologies = newProject.technologies.split(',').map(t => t.trim()).filter(Boolean);
      
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          title: newProject.title,
          description: newProject.description,
          content: newProject.content,
          technologies,
          github_url: newProject.github_url,
          live_url: newProject.live_url,
          status: newProject.status,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Project created!",
        description: "Your project has been created successfully."
      });

      setShowNewProject(false);
      resetNewProject();
      fetchProjects();

      // Navigate to collaboration room for live coding projects
      if (projectType === 'live' && data) {
        onNavigate('collab', { projectId: data.id });
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project. Try again later.",
        variant: "destructive"
      });
    }
  };

  const createRepository = async () => {
    if (!user || !newRepo.name.trim()) return;

    try {
      const tags = newRepo.tags.split(',').map(t => t.trim()).filter(Boolean);
      
      const { data, error } = await supabase
        .from('repositories')
        .insert([{
          name: newRepo.name,
          description: newRepo.description,
          visibility: newRepo.visibility,
          tags,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Create initial README file
      if (data) {
        await supabase
          .from('repository_files')
          .insert([{
            repository_id: data.id,
            file_path: 'README.md',
            content: `# ${newRepo.name}\n\n${newRepo.description || 'A new repository'}\n\n## Getting Started\n\nAdd your project description here.`,
            file_type: 'markdown',
            size_bytes: 100
          }]);
      }

      toast({
        title: "Repository created!",
        description: "Your repository has been created successfully."
      });

      setShowNewRepo(false);
      resetNewRepo();
      fetchRepositories();

      // Navigate to repository view
      if (data) {
        onNavigate('repository', { repositoryId: data.id });
      }
    } catch (error) {
      console.error('Error creating repository:', error);
      toast({
        title: "Error",
        description: "Failed to create repository. Try again later.",
        variant: "destructive"
      });
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({ title: "Project deleted successfully" });
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project.",
        variant: "destructive"
      });
    }
  };

  const deleteRepository = async (repoId: string) => {
    if (!confirm('Are you sure you want to delete this repository?')) return;

    try {
      const { error } = await supabase
        .from('repositories')
        .delete()
        .eq('id', repoId);

      if (error) throw error;

      toast({ title: "Repository deleted successfully" });
      fetchRepositories();
    } catch (error) {
      console.error('Error deleting repository:', error);
      toast({
        title: "Error",
        description: "Failed to delete repository.",
        variant: "destructive"
      });
    }
  };

  const resetNewProject = () => {
    setNewProject({
      title: '',
      description: '',
      content: '',
      technologies: '',
      github_url: '',
      live_url: '',
      status: 'draft'
    });
    setProjectType('live');
  };

  const resetNewRepo = () => {
    setNewRepo({
      name: '',
      description: '',
      visibility: 'private',
      tags: ''
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Projects</h1>
            <p className="text-muted-foreground">Manage and collaborate on your coding projects</p>
          </div>
          <div className="flex gap-2">
            {/* New Project Dialog */}
            <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Choose how you want to start your new project.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Project Type Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card 
                      className={`glass-card cursor-pointer transition-colors ${
                        projectType === 'live' ? 'border-primary' : 'hover:border-primary/50'
                      }`}
                      onClick={() => setProjectType('live')}
                    >
                      <CardContent className="p-6 text-center">
                        <Code className="h-8 w-8 mx-auto mb-2" />
                        <h3 className="font-semibold mb-1">Live Compiler</h3>
                        <p className="text-xs text-muted-foreground">Start coding with real-time collaboration</p>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className={`glass-card cursor-pointer transition-colors ${
                        projectType === 'repo' ? 'border-primary' : 'hover:border-primary/50'
                      }`}
                      onClick={() => setProjectType('repo')}
                    >
                      <CardContent className="p-6 text-center">
                        <GitBranch className="h-8 w-8 mx-auto mb-2" />
                        <h3 className="font-semibold mb-1">Repository</h3>
                        <p className="text-xs text-muted-foreground">Track changes with version control</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Project Title</Label>
                      <Input
                        id="title"
                        value={newProject.title}
                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                        placeholder="My Awesome Project"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        placeholder="Brief description of your project"
                      />
                    </div>
                    <div>
                      <Label htmlFor="technologies">Technologies (comma-separated)</Label>
                      <Input
                        id="technologies"
                        value={newProject.technologies}
                        onChange={(e) => setNewProject({ ...newProject, technologies: e.target.value })}
                        placeholder="React, TypeScript, Node.js"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewProject(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createProject} disabled={!newProject.title.trim()}>
                    {projectType === 'live' ? 'Start Live Coding' : 'Create Project'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* New Repository Dialog */}
            <Dialog open={showNewRepo} onOpenChange={setShowNewRepo}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Repository
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Repository</DialogTitle>
                  <DialogDescription>
                    Set up a new code repository for version control.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="repo-name">Repository Name</Label>
                    <Input
                      id="repo-name"
                      value={newRepo.name}
                      onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
                      placeholder="my-awesome-repo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="repo-description">Description</Label>
                    <Textarea
                      id="repo-description"
                      value={newRepo.description}
                      onChange={(e) => setNewRepo({ ...newRepo, description: e.target.value })}
                      placeholder="Repository description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="repo-tags">Tags (comma-separated)</Label>
                    <Input
                      id="repo-tags"
                      value={newRepo.tags}
                      onChange={(e) => setNewRepo({ ...newRepo, tags: e.target.value })}
                      placeholder="javascript, react, nodejs"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="repo-public"
                      checked={newRepo.visibility === 'public'}
                      onCheckedChange={(checked) => 
                        setNewRepo({ ...newRepo, visibility: checked ? 'public' : 'private' })
                      }
                    />
                    <Label htmlFor="repo-public">Make public</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewRepo(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createRepository} disabled={!newRepo.name.trim()}>
                    Create Repository
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search projects or repositories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <UserSearch />
        </div>

        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList>
            <TabsTrigger value="projects">My Projects ({projects.length})</TabsTrigger>
            <TabsTrigger value="repositories">My Repositories ({repositories.length})</TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <div className="space-y-4">
              {projects.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="text-center py-12">
                    <Code className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <div className="text-muted-foreground mb-4">No projects yet</div>
                    <Button onClick={() => setShowNewProject(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Project
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {projects
                    .filter(project => 
                      searchTerm === '' || 
                      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      project.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((project) => (
                    <Card key={project.id} className="glass-card hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg line-clamp-1">{project.title}</CardTitle>
                            <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onNavigate('collab', { projectId: project.id })}
                              title="Open project"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteProject(project.id)}
                              title="Delete project"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {project.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {project.technologies.slice(0, 3).map((tech, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{tech}</Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {new Date(project.updated_at).toLocaleDateString()}
                            </span>
                            <Badge variant={project.status === 'published' ? 'default' : 'outline'}>
                              {project.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Repositories Tab */}
          <TabsContent value="repositories">
            <div className="space-y-4">
              {repositories.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="text-center py-12">
                    <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <div className="text-muted-foreground mb-4">No repositories yet</div>
                    <Button onClick={() => setShowNewRepo(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Repository
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {repositories
                    .filter(repo => 
                      searchTerm === '' || 
                      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      repo.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((repo) => (
                    <Card key={repo.id} className="glass-card hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg line-clamp-1">{repo.name}</CardTitle>
                            <CardDescription className="line-clamp-2">{repo.description}</CardDescription>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onNavigate('repository', { repositoryId: repo.id })}
                              title="Open repository"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRepository(repo.id)}
                              title="Delete repository"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4" />
                              {repo.star_count}
                            </div>
                            <Badge variant={repo.visibility === 'public' ? 'default' : 'secondary'}>
                              {repo.visibility === 'public' ? <Globe className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                              {repo.visibility}
                            </Badge>
                          </div>
                          {repo.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {repo.tags.slice(0, 3).map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Updated {new Date(repo.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Projects;