import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Heart, 
  HeartOff, 
  ExternalLink, 
  FolderOpen,
  Loader2,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface FavoriteProject {
  id: string;
  project_id: string;
  created_at: string;
  project: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    technologies: string[] | null;
    status: string | null;
    user_id: string;
  };
}

interface ProjectFavoritesProps {
  className?: string;
}

export const ProjectFavorites: React.FC<ProjectFavoritesProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('project_favorites')
        .select(`
          id,
          project_id,
          created_at,
          project:projects(id, title, description, image_url, technologies, status, user_id)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out any entries where project was deleted
      const validFavorites = (data || []).filter(f => f.project);
      setFavorites(validFavorites as unknown as FavoriteProject[]);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    setRemovingId(favoriteId);
    try {
      const { error } = await supabase
        .from('project_favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavorites(prev => prev.filter(f => f.id !== favoriteId));
      toast({ title: 'Removed', description: 'Project removed from favorites.' });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({ title: 'Error', description: 'Failed to remove favorite.', variant: 'destructive' });
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Favorite Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-16 w-16 rounded-lg" />
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
    <Card className={className} data-tour="favorites">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Favorite Projects
          {favorites.length > 0 && (
            <Badge variant="secondary">{favorites.length}</Badge>
          )}
        </CardTitle>
        <CardDescription>Projects you've bookmarked</CardDescription>
      </CardHeader>
      <CardContent>
        {favorites.length > 0 ? (
          <div className="space-y-4">
            {favorites.map((favorite) => (
              <div 
                key={favorite.id} 
                className="flex gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
              >
                {favorite.project.image_url ? (
                  <img 
                    src={favorite.project.image_url} 
                    alt={favorite.project.title}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center">
                    <FolderOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 
                    className="font-medium text-foreground truncate cursor-pointer hover:underline"
                    onClick={() => navigate(`/projects/${favorite.project.id}`)}
                  >
                    {favorite.project.title}
                  </h4>
                  {favorite.project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {favorite.project.description}
                    </p>
                  )}
                  {favorite.project.technologies && favorite.project.technologies.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {favorite.project.technologies.slice(0, 3).map((tech, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate(`/projects/${favorite.project.id}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={removingId === favorite.id}
                    onClick={() => removeFavorite(favorite.id)}
                  >
                    {removingId === favorite.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <HeartOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No favorite projects yet</p>
            <p className="text-sm">Browse projects and click the heart to add favorites</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/projects')}
            >
              Browse Projects
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Hook to add/remove favorites from other components
export const useProjectFavorite = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchFavoriteIds = async () => {
      const { data } = await supabase
        .from('project_favorites')
        .select('project_id')
        .eq('user_id', user.id);
      
      setFavoriteIds(new Set(data?.map(f => f.project_id) || []));
      setLoading(false);
    };

    fetchFavoriteIds();
  }, [user]);

  const toggleFavorite = async (projectId: string) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to favorite projects.' });
      return;
    }

    const isFavorited = favoriteIds.has(projectId);

    try {
      if (isFavorited) {
        await supabase
          .from('project_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('project_id', projectId);
        
        setFavoriteIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(projectId);
          return newSet;
        });
        toast({ title: 'Removed from favorites' });
      } else {
        await supabase
          .from('project_favorites')
          .insert({ user_id: user.id, project_id: projectId });
        
        setFavoriteIds(prev => new Set([...prev, projectId]));
        toast({ title: 'Added to favorites' });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({ title: 'Error', description: 'Failed to update favorite.', variant: 'destructive' });
    }
  };

  const isFavorite = (projectId: string) => favoriteIds.has(projectId);

  return { toggleFavorite, isFavorite, loading };
};
