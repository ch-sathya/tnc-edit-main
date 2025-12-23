import React, { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Github, Globe, Search, Filter, Plus, Star, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ProjectFormModal } from '@/components/ProjectFormModal';

interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  github_url: string;
  live_url: string;
  image_url: string;
  status: string;
  user_id: string;
  featured: boolean;
  creator_name?: string;
  creator_avatar?: string;
}

const Projects = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    filterProjectsData();
  }, [projects, searchQuery, filterStatus]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // Fetch all published projects
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator profiles for each project
      const projectsWithCreators = await Promise.all(
        (data || []).map(async (project: any) => {
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('display_name, username, avatar_url')
            .eq('user_id', project.user_id)
            .maybeSingle();

          return {
            ...project,
            creator_name: creatorProfile?.display_name || creatorProfile?.username || 'Unknown',
            creator_avatar: creatorProfile?.avatar_url
          };
        })
      );

      // Separate featured and regular projects
      const featured = projectsWithCreators.filter((p: Project) => p.featured);
      const regular = projectsWithCreators.filter((p: Project) => !p.featured);

      setFeaturedProjects(featured as Project[]);
      setProjects(regular as Project[]);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProjectsData = () => {
    let filtered = [...projects];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.technologies?.some(tech => 
          tech.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(project => project.status === filterStatus);
    }

    setFilteredProjects(filtered);
  };

  const ProjectCard = ({ project, featured = false }: { project: Project; featured?: boolean }) => (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${featured ? 'border-primary/50 bg-gradient-to-br from-primary/5 to-transparent' : ''}`}>
      {project.image_url && (
        <div className="aspect-video w-full overflow-hidden relative">
          <img 
            src={project.image_url} 
            alt={project.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
          {featured && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-primary text-primary-foreground gap-1">
                <Star className="h-3 w-3 fill-current" />
                Featured
              </Badge>
            </div>
          )}
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1">{project.title}</CardTitle>
          <Badge variant="secondary">{project.status}</Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {project.description}
        </CardDescription>
        {project.creator_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            {project.creator_avatar && (
              <img 
                src={project.creator_avatar} 
                alt={project.creator_name}
                className="h-5 w-5 rounded-full object-cover"
              />
            )}
            <span>by</span>
            <span className="font-medium">{project.creator_name}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {project.technologies && project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.technologies.slice(0, 3).map((tech, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tech}
              </Badge>
            ))}
            {project.technologies.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{project.technologies.length - 3}
              </Badge>
            )}
          </div>
        )}
        <div className="flex gap-2">
          {project.github_url && (
            <Button variant="outline" size="sm" asChild className="flex-1">
              <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4 mr-2" />
                Code
              </a>
            </Button>
          )}
          {project.live_url && (
            <Button variant="outline" size="sm" asChild className="flex-1">
              <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4 mr-2" />
                Demo
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Explore Projects</h1>
              <p className="text-muted-foreground">
                Discover amazing projects from developers around the world
              </p>
            </div>
            {user && (
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            )}
          </div>

          {/* Featured Projects Section */}
          {loading ? (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold">Featured Projects</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <Skeleton className="aspect-video w-full" />
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          ) : featuredProjects.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold">Featured Projects</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} featured />
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects by name, description, or technology..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* All Projects Section Header */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-1">All Projects</h2>
            <p className="text-sm text-muted-foreground">
              Showing {filteredProjects.length} of {projects.length} projects
            </p>
          </div>

          {/* Projects Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i}>
                  <Skeleton className="aspect-video w-full" />
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-4">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 flex-1" />
                      <Skeleton className="h-8 flex-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Try adjusting your search or filters' : 'Be the first to create a project!'}
                </p>
                {user && (
                  <Button onClick={() => setShowCreateModal(true)} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Project
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {user && (
        <ProjectFormModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          userId={user.id}
          onSuccess={fetchProjects}
        />
      )}
    </>
  );
};

export default Projects;
