import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Github, Linkedin, Mail, MapPin, Calendar, Star, GitBranch, Award, Code, Edit, ExternalLink, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PhotoUpload } from '@/components/PhotoUpload';

const Portfolio: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    display_name: '',
    bio: '',
    location: '',
    website: '',
    github_url: '',
    linkedin_url: '',
    twitter_url: '',
    avatar_url: '',
    skills: [],
    description: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfileData({
          display_name: data.display_name || '',
          bio: data.bio || '',
          location: data.location || '',
          website: data.website || '',
          github_url: data.github_url || '',
          linkedin_url: data.linkedin_url || '',
          twitter_url: data.twitter_url || '',
          avatar_url: data.avatar_url || '',
          skills: data.skills || [],
          description: data.description || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert([{
          user_id: user.id,
          ...profileData
        }]);

      if (error) throw error;
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };
  const [userProjects, setUserProjects] = useState([]);
  const [userStats, setUserStats] = useState({
    projectCount: 0,
    collaborationCount: 0,
    starCount: 0,
    contributionCount: 0
  });
  const [userActivities, setUserActivities] = useState([]);

  // Skills data
  const skills = [
    { name: 'React', level: 90 },
    { name: 'TypeScript', level: 85 },
    { name: 'Node.js', level: 80 },
    { name: 'PostgreSQL', level: 75 },
    { name: 'Docker', level: 70 }
  ];

  // Fetch user's actual data
  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch user's projects
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(6);

      setUserProjects(projects || []);

      // Fetch user's repositories for additional stats
      const { data: repos } = await supabase
        .from('repositories')
        .select('star_count')
        .eq('user_id', user.id);

      const totalStars = repos?.reduce((sum, repo) => sum + (repo.star_count || 0), 0) || 0;

      // Fetch user's activities
      const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setUserActivities(activities || []);

      // Update stats
      setUserStats({
        projectCount: projects?.length || 0,
        collaborationCount: 0, // Would need to count room participations
        starCount: totalStars,
        contributionCount: activities?.length || 0
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Dynamic skills based on user's projects
  const skills = profileData.skills?.length ?
    profileData.skills.map(skill => ({ name: skill, level: Math.floor(Math.random() * 30) + 70 })) :
    [
      { name: 'JavaScript', level: 85 },
      { name: 'React', level: 80 },
      { name: 'Node.js', level: 75 },
      { name: 'Python', level: 70 }
    ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="glass-card rounded-lg border border-border p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {isEditing ? (
              <PhotoUpload
                currentAvatar={profileData.avatar_url}
                onAvatarChange={(url) => setProfileData(prev => ({ ...prev, avatar_url: url }))}
                userName={profileData.display_name}
              />
            ) : (
              <Avatar className="h-32 w-32 ring-4 ring-background shadow-lg">
                <AvatarImage src={profileData.avatar_url || '/placeholder.svg'} alt="Profile" />
                <AvatarFallback className="text-2xl">
                  {profileData.display_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                <div>
                  {isEditing ? (
                    <input
                      value={profileData.display_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, display_name: e.target.value }))}
                      className="text-3xl font-bold text-foreground mb-2 bg-transparent border-b border-border"
                      placeholder="Your Name"
                    />
                  ) : (
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                      {profileData.display_name || 'Your Name'}
                    </h1>
                  )}

                  {isEditing ? (
                    <input
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      className="text-lg text-muted-foreground mb-4 bg-transparent border-b border-border w-full"
                      placeholder="Your professional title"
                    />
                  ) : (
                    <p className="text-lg text-muted-foreground mb-4">
                      {profileData.bio || 'Your professional title'}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {isEditing ? (
                        <input
                          value={profileData.location}
                          onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                          className="bg-transparent border-b border-border"
                          placeholder="Location"
                        />
                      ) : (
                        profileData.location || 'Add location'
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Joined {user ? new Date().toLocaleDateString() : 'Recently'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 md:mt-0">
                  {user && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => isEditing ? updateProfile() : setIsEditing(true)}
                      className="glass-card"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {isEditing ? 'Save' : 'Edit Profile'}
                    </Button>
                  )}
                  {profileData.github_url && (
                    <Button variant="outline" size="sm" onClick={() => window.open(profileData.github_url, '_blank')}>
                      <Github className="h-4 w-4 mr-2" />
                      GitHub
                    </Button>
                  )}
                  {profileData.linkedin_url && (
                    <Button variant="outline" size="sm" onClick={() => window.open(profileData.linkedin_url, '_blank')}>
                      <Linkedin className="h-4 w-4 mr-2" />
                      LinkedIn
                    </Button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <textarea
                  value={profileData.description}
                  onChange={(e) => setProfileData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full text-foreground leading-relaxed bg-transparent border border-border rounded-md p-2 min-h-[80px] resize-vertical"
                  placeholder="Write a detailed description about yourself, your experience, skills, and interests..."
                />
              ) : (
                <p className="text-foreground leading-relaxed">
                  {profileData.description || 'Passionate developer with 5+ years of experience building scalable web applications. Love working with modern technologies and contributing to open source projects. Currently focused on React, Node.js, and cloud architecture.'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-foreground mb-2">{userStats.projectCount}</div>
            <div className="text-muted-foreground">Projects</div>
          </div>
          <div className="glass-card rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-foreground mb-2">{userStats.contributionCount}</div>
            <div className="text-muted-foreground">Contributions</div>
          </div>
          <div className="glass-card rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-foreground mb-2">{userStats.collaborationCount}</div>
            <div className="text-muted-foreground">Collaborations</div>
          </div>
          <div className="glass-card rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-foreground mb-2">{userStats.starCount}</div>
            <div className="text-muted-foreground">Stars Earned</div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="achievements">Awards</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userProjects.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Code className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">No projects yet</p>
                  <p className="text-sm text-muted-foreground">Start creating projects to showcase your work</p>
                </div>
              ) : (
                userProjects.map((project) => (
                  <div key={project.id} className="glass-card rounded-lg hover:border-foreground/20 transition-all p-6">
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold">{project.title}</h3>
                        <Badge variant={project.status === 'published' ? 'default' : 'secondary'}>
                          {project.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{project.description || 'No description available'}</p>
                    </div>
                    <div className="space-y-4">
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.technologies.map((tech, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(project.updated_at).toLocaleDateString()}
                        </span>
                        <div className="flex gap-1">
                          {project.github_url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                          {project.live_url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                                View Live
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="skills" className="mt-8">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Technical Skills</CardTitle>
                  <CardDescription>Proficiency levels in various technologies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {skills.map((skill) => (
                    <div key={skill.name}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{skill.name}</span>
                        <span className="text-sm text-muted-foreground">{skill.level}%</span>
                      </div>
                      <Progress value={skill.level} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Expertise Areas</CardTitle>
                  <CardDescription>Primary focus and specializations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border border-border rounded-lg glass">
                      <div className="text-2xl font-bold text-foreground mb-1">Frontend</div>
                      <div className="text-sm text-muted-foreground">React, Vue, Angular</div>
                    </div>
                    <div className="text-center p-4 border border-border rounded-lg glass">
                      <div className="text-2xl font-bold text-foreground mb-1">Backend</div>
                      <div className="text-sm text-muted-foreground">Node.js, Python, Go</div>
                    </div>
                    <div className="text-center p-4 border border-border rounded-lg glass">
                      <div className="text-2xl font-bold text-foreground mb-1">Database</div>
                      <div className="text-sm text-muted-foreground">MongoDB, PostgreSQL</div>
                    </div>
                    <div className="text-center p-4 border border-border rounded-lg glass">
                      <div className="text-2xl font-bold text-foreground mb-1">Cloud</div>
                      <div className="text-sm text-muted-foreground">AWS, Docker, K8s</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="mt-8">
            <div className="grid md:grid-cols-2 gap-6">
              {userStats.projectCount === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">No achievements yet</p>
                  <p className="text-sm text-muted-foreground">Complete projects and collaborate to earn achievements</p>
                </div>
              ) : (
                <>
                  {userStats.projectCount >= 1 && (
                    <Card className="glass-card">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                            <Code className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">First Project</h3>
                            <p className="text-sm text-muted-foreground">Created your first project</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {userStats.projectCount >= 5 && (
                    <Card className="glass-card">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-secondary text-secondary-foreground rounded-lg flex items-center justify-center">
                            <Star className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">Prolific Creator</h3>
                            <p className="text-sm text-muted-foreground">Created 5+ projects</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {userStats.starCount >= 10 && (
                    <Card className="glass-card">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-yellow-500 text-white rounded-lg flex items-center justify-center">
                            <Award className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">Popular Developer</h3>
                            <p className="text-sm text-muted-foreground">Earned 10+ stars</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {userStats.contributionCount >= 20 && (
                    <Card className="glass-card">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-green-500 text-white rounded-lg flex items-center justify-center">
                            <GitBranch className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">Active Contributor</h3>
                            <p className="text-sm text-muted-foreground">Made 20+ contributions</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-8">
            <div className="grid gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest contributions and collaborations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userActivities.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground mb-2">No recent activity</p>
                        <p className="text-sm text-muted-foreground">
                          Start creating projects and collaborating to see your activity here
                        </p>
                      </div>
                    ) : (
                      userActivities.map((activity, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-4 p-4 border border-border rounded-lg glass"
                        >
                          <div className="h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                            <Code className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-foreground">
                              <span className="font-medium">{activity.action}</span>
                              {activity.target_type && activity.target_id && (
                                <span> on {activity.target_type}</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{activity.time}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>

              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Portfolio;