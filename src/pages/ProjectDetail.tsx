import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Github, Globe, ArrowLeft, Calendar, User, Star, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ProjectFormModal } from '@/components/ProjectFormModal';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { format } from 'date-fns';

interface ProjectDetail {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  technologies: string[] | null;
  github_url: string | null;
  live_url: string | null;
  image_url: string | null;
  status: string;
  user_id: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

interface Creator {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = user?.id === project?.user_id;

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Not Found",
          description: "Project not found",
          variant: "destructive"
        });
        navigate('/projects');
        return;
      }

      setProject(data as ProjectDetail);

      // Fetch creator profile
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('user_id', data.user_id)
        .maybeSingle();

      setCreator(creatorProfile);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: "Error",
        description: "Failed to load project",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project deleted successfully"
      });
      navigate('/projects');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Simple markdown-like rendering for content
  const renderContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold mt-6 mb-3">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold mt-5 mb-2">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-medium mt-4 mb-2">{line.slice(4)}</h3>;
      }
      if (line.startsWith('- ')) {
        return <li key={index} className="ml-4 text-muted-foreground">{line.slice(2)}</li>;
      }
      if (line.trim() === '') {
        return <br key={index} />;
      }
      return <p key={index} className="text-muted-foreground mb-2">{line}</p>;
    });
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto py-8 px-4 max-w-4xl">
            <Skeleton className="h-8 w-32 mb-6" />
            <Skeleton className="aspect-video w-full rounded-lg mb-6" />
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-2/3 mb-6" />
            <div className="flex gap-2 mb-6">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          {/* Back Button */}
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Link>
          </Button>

          {/* Project Image */}
          {project.image_url && (
            <div className="aspect-video w-full overflow-hidden rounded-lg mb-6 relative">
              <img 
                src={project.image_url} 
                alt={project.title}
                className="w-full h-full object-cover"
              />
              {project.featured && (
                <div className="absolute top-4 left-4">
                  <Badge className="bg-primary text-primary-foreground gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Featured
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{project.title}</h1>
                <Badge variant="secondary">{project.status}</Badge>
              </div>
              {project.description && (
                <p className="text-lg text-muted-foreground">{project.description}</p>
              )}
            </div>
            
            {/* Owner Actions */}
            {isOwner && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowEditModal(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* Meta Info */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                {creator && (
                  <div className="flex items-center gap-2">
                    {creator.avatar_url ? (
                      <img 
                        src={creator.avatar_url} 
                        alt={creator.display_name || creator.username || 'Creator'}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                    <span>{creator.display_name || creator.username || 'Unknown'}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Created {format(new Date(project.created_at), 'MMM d, yyyy')}</span>
                </div>
                {project.updated_at !== project.created_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Updated {format(new Date(project.updated_at), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Technologies */}
          {project.technologies && project.technologies.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Technologies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech, index) => (
                    <Badge key={index} variant="outline">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Links */}
          {(project.github_url || project.live_url) && (
            <div className="flex flex-wrap gap-3 mb-6">
              {project.github_url && (
                <Button variant="outline" asChild>
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4 mr-2" />
                    View on GitHub
                  </a>
                </Button>
              )}
              {project.live_url && (
                <Button asChild>
                  <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4 mr-2" />
                    View Live Demo
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* Content */}
          {project.content && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About This Project</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                {renderContent(project.content)}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isOwner && (
        <ProjectFormModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          userId={user.id}
          project={project}
          onSuccess={fetchProject}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Project"
        description={`Are you sure you want to delete "${project.title}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        loading={deleting}
        variant="destructive"
      />
    </>
  );
};

export default ProjectDetail;
