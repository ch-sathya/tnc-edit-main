import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, Eye, EyeOff, Github, Globe, MapPin } from 'lucide-react';

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
  is_username_set: boolean;
}

interface Repository {
  id: string;
  name: string;
  description: string;
  visibility: string;
  tags: string[];
  star_count: number;
  fork_count: number;
  created_at: string;
  updated_at: string;
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // New repository form
  const [newRepo, setNewRepo] = useState({
    name: '',
    description: '',
    visibility: 'private' as 'public' | 'private',
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState('');
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchRepositories();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfile(data);
      } else {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            user_id: user?.id,
            username: '',
            display_name: '',
            bio: '',
            skills: [],
            is_username_set: false
          }])
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
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

  const fetchRepositories = async () => {
    try {
      const { data, error } = await supabase
        .from('repositories')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setRepositories(data || []);
    } catch (error) {
      console.error('Error fetching repositories:', error);
    }
  };

  const saveProfile = async () => {
    if (!profile || !user) return;

    setSaving(true);
    try {
      // Check username availability if changed
      if (profile.username && profile.username !== '') {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('username', profile.username)
          .neq('user_id', user.id)
          .single();

        if (existingUser) {
          toast({
            title: "Username taken",
            description: "This username is already in use",
            variant: "destructive"
          });
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          ...profile,
          is_username_set: profile.username ? true : false
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Profile saved",
        description: "Your profile has been updated successfully"
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const createRepository = async () => {
    if (!user || !newRepo.name) return;

    try {
      const { data, error } = await supabase
        .from('repositories')
        .insert([{
          user_id: user.id,
          name: newRepo.name,
          description: newRepo.description,
          visibility: newRepo.visibility,
          tags: newRepo.tags
        }])
        .select()
        .single();

      if (error) throw error;

      setRepositories(prev => [data, ...prev]);
      setNewRepo({ name: '', description: '', visibility: 'private', tags: [] });
      
      toast({
        title: "Repository created",
        description: `${newRepo.name} has been created successfully`
      });
    } catch (error) {
      console.error('Error creating repository:', error);
      toast({
        title: "Error",
        description: "Failed to create repository",
        variant: "destructive"
      });
    }
  };

  const deleteRepository = async (repoId: string, repoName: string) => {
    try {
      const { error } = await supabase
        .from('repositories')
        .delete()
        .eq('id', repoId);

      if (error) throw error;

      setRepositories(prev => prev.filter(repo => repo.id !== repoId));
      
      toast({
        title: "Repository deleted",
        description: `${repoName} has been deleted`
      });
    } catch (error) {
      console.error('Error deleting repository:', error);
      toast({
        title: "Error",
        description: "Failed to delete repository",
        variant: "destructive"
      });
    }
  };

  const addTag = () => {
    if (newTag && !newRepo.tags.includes(newTag)) {
      setNewRepo(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewRepo(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const addSkill = () => {
    if (newSkill && profile && !profile.skills.includes(newSkill)) {
      setProfile(prev => prev ? { ...prev, skills: [...prev.skills, newSkill] } : null);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setProfile(prev => prev ? { ...prev, skills: prev.skills.filter(skill => skill !== skillToRemove) } : null);
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!profile) {
    return <div className="container mx-auto px-4 py-8">Error loading profile</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and repositories</p>
        </div>
        {profile.username && (
          <Button variant="outline" onClick={() => navigate(`/@${profile.username}`)}>
            View Profile
          </Button>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="repositories">Repositories ({repositories.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile information and customize how others see you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-lg">
                    {profile.display_name?.charAt(0) || profile.username?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input
                    id="avatar_url"
                    value={profile.avatar_url || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, avatar_url: e.target.value } : null)}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={profile.username || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') } : null)}
                    placeholder="yourusername"
                    className="font-mono"
                  />
                  <p className="text-sm text-muted-foreground">
                    Your unique username for profile URL
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={profile.display_name || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, display_name: e.target.value } : null)}
                    placeholder="Your Display Name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
                  placeholder="Tell people about yourself..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={profile.location || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, location: e.target.value } : null)}
                    placeholder="City, Country"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    value={profile.website || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, website: e.target.value } : null)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="github_url">
                  <Github className="w-4 h-4 inline mr-1" />
                  GitHub URL
                </Label>
                <Input
                  id="github_url"
                  value={profile.github_url || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, github_url: e.target.value } : null)}
                  placeholder="https://github.com/yourusername"
                />
              </div>

              <div className="space-y-2">
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {profile.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-1 hover:bg-red-500 hover:text-white rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <Button onClick={addSkill} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={saveProfile} disabled={saving} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repositories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Repository</CardTitle>
              <CardDescription>
                Create a new repository to host your code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="repo_name">Repository Name *</Label>
                  <Input
                    id="repo_name"
                    value={newRepo.name}
                    onChange={(e) => setNewRepo(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') }))}
                    placeholder="my-awesome-project"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={newRepo.visibility} onValueChange={(value: 'public' | 'private') => setNewRepo(prev => ({ ...prev, visibility: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <EyeOff className="w-4 h-4" />
                          Private
                        </div>
                      </SelectItem>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Public
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="repo_description">Description</Label>
                <Textarea
                  id="repo_description"
                  value={newRepo.description}
                  onChange={(e) => setNewRepo(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="A brief description of your project..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newRepo.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="gap-1">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:bg-red-500 hover:text-white rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="javascript, react, nodejs"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button onClick={addTag} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={createRepository} disabled={!newRepo.name} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Create Repository
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Repositories</CardTitle>
              <CardDescription>
                Manage your existing repositories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {repositories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No repositories yet. Create your first repository above!
                </p>
              ) : (
                <div className="space-y-4">
                  {repositories.map((repo) => (
                    <div key={repo.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{repo.name}</h3>
                          <Badge variant={repo.visibility === 'public' ? 'default' : 'secondary'}>
                            {repo.visibility === 'public' ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                            {repo.visibility}
                          </Badge>
                        </div>
                        {repo.description && (
                          <p className="text-sm text-muted-foreground mb-2">{repo.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {repo.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/@${profile.username}/${repo.name}`)}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRepository(repo.id, repo.name)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}