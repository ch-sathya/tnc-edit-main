import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, GitFork, Eye, Lock, ChevronLeft, File, Folder } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Repository {
  id: string;
  name: string;
  description: string;
  user_id: string;
  visibility: string;
  admin_override_visibility: string;
  readme_content: string;
  tags: string[];
  star_count: number;
  fork_count: number;
  created_at: string;
  updated_at: string;
}

interface RepositoryFile {
  id: string;
  file_path: string;
  content: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

interface Profile {
  username: string;
  display_name: string;
  avatar_url: string;
}

export default function Repository() {
  const { username, repositoryName } = useParams();
  const { user } = useAuth();
  const [repository, setRepository] = useState<Repository | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  useEffect(() => {
    if (username && repositoryName) {
      fetchRepository();
    }
  }, [username, repositoryName]);

  const fetchRepository = async () => {
    try {
      // First, get the profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url, user_id')
        .eq('username', username)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Then get the repository
      const { data: repoData, error: repoError } = await supabase
        .from('repositories')
        .select('*')
        .eq('user_id', profileData.user_id)
        .eq('name', repositoryName)
        .single();

      if (repoError) throw repoError;
      setRepository(repoData);
      setIsOwner(user?.id === profileData.user_id);

      // Check if repository is accessible (public or owned by user)
      const isPublic = repoData.visibility === 'public' || repoData.admin_override_visibility === 'public';
      const canAccess = isPublic || (user?.id === profileData.user_id);

      if (!canAccess) {
        throw new Error('Repository not found or private');
      }

      // Fetch repository files
      const { data: filesData } = await supabase
        .from('repository_files')
        .select('*')
        .eq('repository_id', repoData.id)
        .order('file_path');

      setFiles(filesData || []);

      // Check if user has starred this repository
      if (user) {
        const { data: starData } = await supabase
          .from('repository_stars')
          .select('id')
          .eq('repository_id', repoData.id)
          .eq('user_id', user.id)
          .single();
        
        setIsStarred(!!starData);
      }

    } catch (error) {
      console.error('Error fetching repository:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStar = async () => {
    if (!user || !repository) return;

    try {
      if (isStarred) {
        await supabase
          .from('repository_stars')
          .delete()
          .eq('repository_id', repository.id)
          .eq('user_id', user.id);
        setIsStarred(false);
        setRepository(prev => prev ? { ...prev, star_count: prev.star_count - 1 } : null);
      } else {
        await supabase
          .from('repository_stars')
          .insert([{ repository_id: repository.id, user_id: user.id }]);
        setIsStarred(true);
        setRepository(prev => prev ? { ...prev, star_count: prev.star_count + 1 } : null);
      }
    } catch (error) {
      console.error('Error updating star status:', error);
    }
  };

  const getFileIcon = (filePath: string) => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go'].includes(extension || '')) {
      return <File className="w-4 h-4 text-primary" />;
    }
    return <File className="w-4 h-4 text-muted-foreground" />;
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!repository || !profile) {
    return <div className="container mx-auto px-4 py-8">Repository not found</div>;
  }

  const isPublic = repository.visibility === 'public' || repository.admin_override_visibility === 'public';

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/@${profile.username}`}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            {profile.display_name || profile.username}
          </Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold">{repository.name}</span>
      </div>

      {/* Repository Header */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <div className="flex-grow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">{repository.name}</h1>
                <Badge variant={isPublic ? 'default' : 'secondary'}>
                  {isPublic ? (
                    <><Eye className="w-3 h-3 mr-1" />Public</>
                  ) : (
                    <><Lock className="w-3 h-3 mr-1" />Private</>
                  )}
                </Badge>
              </div>
              {repository.description && (
                <p className="text-lg text-muted-foreground mb-4">{repository.description}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              {user && !isOwner && (
                <Button onClick={handleStar} variant={isStarred ? "default" : "outline"} size="sm">
                  <Star className={`w-4 h-4 mr-1 ${isStarred ? 'fill-current' : ''}`} />
                  {isStarred ? 'Starred' : 'Star'} {repository.star_count}
                </Button>
              )}
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="w-4 h-4" />
                {repository.star_count}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <GitFork className="w-4 h-4" />
                {repository.fork_count}
              </div>
            </div>
          </div>

          {repository.tags && repository.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {repository.tags.map((tag, index) => (
                <Badge key={index} variant="outline">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Repository Content */}
      <Tabs defaultValue="code" className="w-full">
        <TabsList>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="readme">README</TabsTrigger>
        </TabsList>
        
        <TabsContent value="code" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="w-5 h-5" />
                Files ({files.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No files in this repository yet
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div 
                      key={file.id} 
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.file_path)}
                        <span className="font-mono text-sm">{file.file_path}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {file.size_bytes && (
                          <span>{(file.size_bytes / 1024).toFixed(1)} KB</span>
                        )}
                        <time dateTime={file.updated_at}>
                          {new Date(file.updated_at).toLocaleDateString()}
                        </time>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="readme">
          <Card>
            <CardHeader>
              <CardTitle>README</CardTitle>
            </CardHeader>
            <CardContent>
              {repository.readme_content ? (
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap">{repository.readme_content}</pre>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No README available for this repository
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}