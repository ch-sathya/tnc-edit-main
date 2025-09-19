import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Github, Globe, MapPin, Star, GitFork } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { FriendSystem } from '@/components/FriendSystem';

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  location: string;
  website: string;
  github_url: string;
  linkedin_url: string;
  twitter_url: string;
  skills: string[];
}

interface Repository {
  id: string;
  name: string;
  description: string;
  visibility: string;
  admin_override_visibility: string;
  tags: string[];
  star_count: number;
  fork_count: number;
  created_at: string;
  updated_at: string;
}

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  const fetchProfile = async () => {
    try {
      // Fetch profile by username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError) throw profileError;
      
      setProfile(profileData);
      setIsOwnProfile(user?.id === profileData.user_id);

      // Fetch repositories (only public ones unless it's own profile)
      const repositoryQuery = supabase
        .from('repositories')
        .select('*')
        .eq('user_id', profileData.user_id)
        .order('updated_at', { ascending: false });

      if (!isOwnProfile) {
        repositoryQuery.or('visibility.eq.public,admin_override_visibility.eq.public');
      }

      const { data: repoData } = await repositoryQuery;
      setRepositories(repoData || []);

      // Fetch follower/following counts
      const [followerResult, followingResult] = await Promise.all([
        supabase.from('user_follows').select('id').eq('following_id', profileData.user_id),
        supabase.from('user_follows').select('id').eq('follower_id', profileData.user_id)
      ]);

      setFollowerCount(followerResult.data?.length || 0);
      setFollowingCount(followingResult.data?.length || 0);

      // Check if current user is following this profile
      if (user && user.id !== profileData.user_id) {
        const { data: followData } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.user_id)
          .single();
        
        setIsFollowing(!!followData);
      }

    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user || !profile) return;

    try {
      if (isFollowing) {
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.user_id);
        setIsFollowing(false);
        setFollowerCount(prev => prev - 1);
      } else {
        await supabase
          .from('user_follows')
          .insert([{ follower_id: user.id, following_id: profile.user_id }]);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!profile) {
    return <div className="container mx-auto px-4 py-8">Profile not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <div className="flex-shrink-0">
          <Avatar className="w-32 h-32">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="text-2xl">
              {profile.display_name?.charAt(0) || profile.username?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-grow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-muted-foreground">@{profile.username}</p>
            </div>
            
            <div className="flex gap-2 mt-4 sm:mt-0">
              {!isOwnProfile && user && (
                <>
                  <Button onClick={handleFollow} variant={isFollowing ? "outline" : "default"}>
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </Button>
                  <FriendSystem targetUserId={profile.user_id} />
                </>
              )}
              {isOwnProfile && (
                <Button asChild>
                  <Link to="/settings">Edit Profile</Link>
                </Button>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="text-lg mb-4">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
            {profile.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {profile.location}
              </div>
            )}
            {profile.website && (
              <div className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {profile.website}
                </a>
              </div>
            )}
            {profile.github_url && (
              <div className="flex items-center gap-1">
                <Github className="w-4 h-4" />
                <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  GitHub
                </a>
              </div>
            )}
          </div>

          <div className="flex gap-4 text-sm">
            <span><strong>{followerCount}</strong> followers</span>
            <span><strong>{followingCount}</strong> following</span>
          </div>

          {profile.skills && profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {profile.skills.map((skill, index) => (
                <Badge key={index} variant="secondary">{skill}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Repositories */}
      <Tabs defaultValue="repositories" className="w-full">
        <TabsList>
          <TabsTrigger value="repositories">Repositories ({repositories.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="repositories" className="space-y-4">
          {repositories.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No public repositories yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {repositories.map((repo) => (
                <Card key={repo.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-grow min-w-0">
                        <CardTitle className="text-lg mb-1">
                          <Link 
                            to={`/@${profile.username}/${repo.name}`}
                            className="hover:underline text-primary"
                          >
                            {repo.name}
                          </Link>
                        </CardTitle>
                        {repo.description && (
                          <CardDescription className="line-clamp-2">
                            {repo.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant={repo.visibility === 'public' || repo.admin_override_visibility === 'public' ? 'default' : 'secondary'}>
                        {repo.visibility === 'public' || repo.admin_override_visibility === 'public' ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4" />
                          {repo.star_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <GitFork className="w-4 h-4" />
                          {repo.fork_count}
                        </div>
                      </div>
                      <time dateTime={repo.updated_at}>
                        {new Date(repo.updated_at).toLocaleDateString()}
                      </time>
                    </div>
                    
                    {repo.tags && repo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {repo.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {repo.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{repo.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}