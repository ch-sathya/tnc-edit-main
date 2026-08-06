import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import { ShareModal, buildProfilePath, buildShareUrl } from '@/components/ShareModal';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  BookOpen,
  UserPlus,
  Check,
  Clock,
  MessageCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { DirectMessageModal } from '@/components/DirectMessageModal';
import { AvailabilityBadge } from '@/components/profile/AvailabilityBadge';
import { EndorsableSkills } from '@/components/profile/EndorsableSkills';
import { ExperienceSection } from '@/components/profile/ExperienceSection';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { Lock, Share2 } from 'lucide-react';

interface UserProfileData {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  headline: string | null;
  availability: string | null;
  is_public: boolean | null;
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
  featured?: boolean | null;
}

interface Repository {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  star_count: number | null;
  tags: string[] | null;
  updated_at: string;
}

const UserProfile = () => {
  const params = useParams<{ userId?: string; username?: string; handle?: string }>();
  const routeUserId = params.userId;
  // Support both /@:username and /:handle (where handle begins with '@')
  const routeUsername = params.username ?? (params.handle?.startsWith('@') ? params.handle.slice(1) : undefined);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'connected'>('none');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // If /:handle was matched with a non-@ handle, delegate to the 404 route
  const invalidHandle = params.handle !== undefined && !params.handle.startsWith('@');

  useEffect(() => {
    if (invalidHandle) return;
    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeUserId, routeUsername, user?.id]);

  if (invalidHandle) {
    // Render the same shell the * route would; keep it minimal to avoid a flash
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-muted-foreground">Page not found</p>
          <Button variant="outline" onClick={() => navigate('/')}>Return home</Button>
        </div>
      </div>
    );
  }

  const requireAuth = () => {
    const next = window.location.pathname + window.location.search;
    navigate(`/auth?redirect=${encodeURIComponent(next)}`);
  };

  const fetchUserProfile = async () => {
    if (!routeUserId && !routeUsername) return;

    try {
      setLoading(true);
      setNotFound(false);

      // Resolve profile by user_id OR by username
      let query = supabase.from('profiles').select('*');
      if (routeUserId) {
        query = query.eq('user_id', routeUserId);
      } else if (routeUsername) {
        query = query.eq('username', routeUsername);
      }
      const { data: profileData, error: profileError } = await query.maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        setNotFound(true);
        return;
      }

      setProfile(profileData);
      const uid = profileData.user_id;
      setResolvedUserId(uid);

      const canonicalPath = buildProfilePath(profileData.username);
      if (canonicalPath && (window.location.pathname !== canonicalPath || window.location.search)) {
        navigate(canonicalPath, { replace: true });
      }

      // Fetch public projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, title, description, technologies, github_url, live_url, image_url, status, featured')
        .eq('user_id', uid)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(20);
      setProjects(projectsData || []);

      const { data: repositoriesData } = await supabase
        .from('repositories')
        .select('id, name, description, visibility, star_count, tags, updated_at')
        .eq('user_id', uid)
        .eq('visibility', 'public')
        .order('updated_at', { ascending: false })
        .limit(12);
      setRepositories((repositoriesData as Repository[] | null) || []);

      // Connection status only when signed in and viewing someone else
      if (user && user.id !== uid) {
        const { data: connections } = await supabase
          .from('user_connections')
          .select('requester_id, addressee_id, status')
          .or(`and(requester_id.eq.${user.id},addressee_id.eq.${uid}),and(requester_id.eq.${uid},addressee_id.eq.${user.id})`);

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
      } else {
        setConnectionStatus('none');
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
    if (!user || !resolvedUserId) return;

    try {
      setSendingRequest(true);
      
      const { error } = await supabase
        .from('user_connections')
        .insert({
          requester_id: user.id,
          addressee_id: resolvedUserId,
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
    if (!user || !resolvedUserId) return;

    try {
      setSendingRequest(true);

      // Find the connection
      const { data: connections } = await supabase
        .from('user_connections')
        .select('id')
        .eq('requester_id', resolvedUserId)
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

  const isOwnProfile = user?.id === resolvedUserId;

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-transparent">
          <div className="container mx-auto py-16 px-4 max-w-5xl flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" aria-hidden="true" />
            <span className="text-sm">Loading profile…</span>
          </div>
        </div>
      </>
    );
  }

  if (notFound || !profile) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-transparent">
          <div className="container mx-auto py-8 px-4 max-w-5xl">
            <Card>
              <CardContent className="py-12 text-center">
                <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
                <p className="text-muted-foreground mb-4">This profile doesn't exist or has been removed.</p>
                <Button onClick={() => navigate('/')}>Go Home</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }


  // Private profile (and viewer is not the owner)
  if (profile.is_public === false && !isOwnProfile) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-transparent">
          <div className="container mx-auto py-16 px-4 max-w-3xl">
            <Card>
              <CardContent className="py-16 text-center">
                <Lock className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">This profile is private</h2>
                <p className="text-muted-foreground">The owner has chosen to hide their profile from the public.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  const displayName = profile.display_name || profile.username || 'Developer';
  const shareTitle = `${displayName} on The Night Club`;
  const shareDescription = profile.headline || profile.bio?.slice(0, 155) || `View ${displayName}'s developer portfolio.`;
  const sharePath = buildProfilePath(profile.username);
  const shareUrl = sharePath ? buildShareUrl(sharePath) : '';
  const featuredProjects = projects.filter((project) => project.featured);
  const socialSameAs = [profile.github_url, profile.linkedin_url, profile.twitter_url, profile.website].filter(Boolean);
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: displayName,
    ...(profile.headline ? { jobTitle: profile.headline } : {}),
    ...(profile.bio ? { description: profile.bio } : {}),
    ...(profile.avatar_url ? { image: profile.avatar_url } : {}),
    url: shareUrl,
    ...(socialSameAs.length ? { sameAs: socialSameAs } : {}),
    ...(profile.skills?.length ? { knowsAbout: profile.skills } : {}),
    ...(profile.location ? { address: { '@type': 'PostalAddress', addressLocality: profile.location } } : {}),
  };

  return (
    <>
      <Helmet>
        <title>{shareTitle}</title>
        <meta name="description" content={shareDescription} />
        <link rel="canonical" href={shareUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={shareTitle} />
        <meta property="og:description" content={shareDescription} />
        <meta property="og:url" content={shareUrl} />
        {profile.avatar_url && <meta property="og:image" content={profile.avatar_url} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={shareTitle} />
        <meta name="twitter:description" content={shareDescription} />
        {profile.avatar_url && <meta name="twitter:image" content={profile.avatar_url} />}
        <script type="application/ld+json">{JSON.stringify(personSchema)}</script>
      </Helmet>
      {sharePath && <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={shareUrl}
        title={`Share ${displayName}'s profile`}
        description={shareDescription}
      />}
      <Navigation />

      <div className="min-h-screen bg-transparent">
        {/* ── MAGAZINE HERO ─────────────────────────────────────────── */}
        <header className="relative w-full overflow-hidden border-b border-border/60">
          <div className="absolute inset-0">
            {profile.banner_url ? (
              <img
                src={profile.banner_url}
                alt=""
                className="w-full h-full object-cover opacity-40"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-secondary via-background to-background" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--ember)/0.18),transparent_60%)]" />
          </div>

          <div className="relative container mx-auto max-w-6xl px-4 pt-10 pb-12 sm:px-6 sm:pt-14 sm:pb-16 md:pt-24 md:pb-28">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8">
              <span className="h-px w-8 bg-ember" />
              <span>Portfolio</span>
              {profile.username && <span className="text-foreground/60">· @{profile.username}</span>}
            </div>

            <div className="grid md:grid-cols-[auto,1fr] gap-6 md:gap-12 items-end">
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 md:h-40 md:w-40 border border-border ring-1 ring-ember/30 shadow-2xl">
                <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="text-4xl font-display">
                  {(profile.display_name || profile.username || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <h1 className="font-display text-3xl sm:text-4xl md:text-6xl font-bold leading-tight text-foreground break-words">
                  {displayName}
                </h1>
                {profile.headline && (
                  <p className="mt-4 text-lg md:text-2xl text-foreground/85 font-light max-w-2xl">
                    {profile.headline}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <AvailabilityBadge value={profile.availability} />
                  {profile.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> {profile.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5" /> {projects.length} projects
                  </span>
                </div>

                {/* Action row */}
                <div className="mt-7 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                  {!isOwnProfile && user && connectionStatus === 'connected' && (
                    <>
                      <Badge variant="secondary" className="gap-1 py-2 px-3">
                        <Check className="h-3 w-3" /> Connected
                      </Badge>
                      <Button onClick={() => setChatOpen(true)}>
                        <MessageCircle className="h-4 w-4 mr-2" /> Message
                      </Button>
                    </>
                  )}
                  {!isOwnProfile && user && connectionStatus === 'pending_sent' && (
                    <Badge variant="outline" className="gap-1 py-2 px-3">
                      <Clock className="h-3 w-3" /> Request Pending
                    </Badge>
                  )}
                  {!isOwnProfile && user && connectionStatus === 'pending_received' && (
                    <>
                      <Button onClick={() => handleConnectionAction('accept')} disabled={sendingRequest}>
                        <Check className="h-4 w-4 mr-2" /> Accept
                      </Button>
                      <Button variant="outline" onClick={() => handleConnectionAction('decline')} disabled={sendingRequest}>
                        Decline
                      </Button>
                    </>
                  )}
                  {!isOwnProfile && user && connectionStatus === 'none' && (
                    <Button onClick={sendConnectionRequest} disabled={sendingRequest}>
                      <UserPlus className="h-4 w-4 mr-2" /> Connect
                    </Button>
                  )}
                  {!isOwnProfile && !user && (
                    <Button onClick={requireAuth}>
                      <UserPlus className="h-4 w-4 mr-2" /> Sign in to connect
                    </Button>
                  )}
                  {isOwnProfile && (
                    <Button onClick={() => setEditOpen(true)} variant="secondary">Edit Profile</Button>
                  )}
                  <Button variant="outline" className="gap-2" onClick={() => sharePath ? setShareOpen(true) : setEditOpen(true)}>
                    <Share2 className="h-4 w-4" /> Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── MAIN GRID ─────────────────────────────────────────────── */}
        <main className="container mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-20 space-y-14 md:space-y-20">
          {/* About + Contact */}
          <section className="grid md:grid-cols-[2fr,1fr] gap-10 md:gap-14 scroll-mt-24" id="about">
            <div>
              <div className="flex items-baseline gap-3 mb-5">
                <span className="text-xs uppercase tracking-[0.25em] text-ember">01</span>
                <h2 className="font-display text-2xl md:text-3xl font-semibold">About</h2>
              </div>
              {profile.bio ? (
                <p className="text-base md:text-lg text-foreground/85 leading-relaxed whitespace-pre-wrap max-w-2xl">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-muted-foreground italic">No bio yet.</p>
              )}

              {profile.skills && profile.skills.length > 0 && (
                <div className="mt-8">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Skills</p>
                  <EndorsableSkills profileUserId={profile.user_id} skills={profile.skills} />
                </div>
              )}
            </div>

            <aside className="border-t border-border/60 pt-8 md:border-l md:border-t-0 md:pl-10 md:pt-0">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">Elsewhere</p>
              <div className="flex flex-col gap-2">
                {profile.github_url && (
                  <a href={profile.github_url} target="_blank" rel="noopener noreferrer"
                     className="group flex items-center justify-between py-3 border-b border-border/50 hover:border-ember/70 transition-colors">
                    <span className="inline-flex items-center gap-3 text-sm"><Github className="h-4 w-4" /> GitHub</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-ember transition-colors" />
                  </a>
                )}
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                     className="group flex items-center justify-between py-3 border-b border-border/50 hover:border-ember/70 transition-colors">
                    <span className="inline-flex items-center gap-3 text-sm"><Linkedin className="h-4 w-4" /> LinkedIn</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-ember transition-colors" />
                  </a>
                )}
                {profile.twitter_url && (
                  <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer"
                     className="group flex items-center justify-between py-3 border-b border-border/50 hover:border-ember/70 transition-colors">
                    <span className="inline-flex items-center gap-3 text-sm"><Twitter className="h-4 w-4" /> Twitter</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-ember transition-colors" />
                  </a>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer"
                     className="group flex items-center justify-between py-3 border-b border-border/50 hover:border-ember/70 transition-colors">
                    <span className="inline-flex items-center gap-3 text-sm"><Globe className="h-4 w-4" /> Website</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-ember transition-colors" />
                  </a>
                )}
                {!profile.github_url && !profile.linkedin_url && !profile.twitter_url && !profile.website && (
                  <p className="text-sm text-muted-foreground italic">No links added.</p>
                )}
              </div>
            </aside>
          </section>

          {/* Featured Work */}
          <section className="scroll-mt-24" id="featured-work">
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-xs uppercase tracking-[0.25em] text-ember">02</span>
              <h2 className="font-display text-2xl md:text-3xl font-semibold">Featured Work</h2>
            </div>
            {featuredProjects.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/70 px-5 py-12 text-center">
                <Star className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Featured case studies will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {featuredProjects.slice(0, 4).map((project) => (
                  <article key={project.id} className="group overflow-hidden rounded-md border border-border/70 bg-card/40">
                    {project.image_url && <img src={project.image_url} alt={project.title} className="aspect-video w-full object-cover" loading="lazy" />}
                    <div className="p-5 sm:p-6">
                      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-ember">Featured</p>
                      <h3 className="font-display text-xl font-semibold">{project.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{project.description || 'A featured project by this developer.'}</p>
                      <Button variant="link" className="mt-3 h-auto p-0" onClick={() => navigate(`/projects/${project.id}`)}>View case study <ExternalLink className="ml-2 h-3.5 w-3.5" /></Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Experience */}
          <section className="scroll-mt-24" id="experience">
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-xs uppercase tracking-[0.25em] text-ember">03</span>
              <h2 className="font-display text-2xl md:text-3xl font-semibold">Experience</h2>
            </div>
            <ExperienceSection userId={profile.user_id} isOwner={isOwnProfile} showHeading={false} />
          </section>

          {/* Projects */}
          <section className="scroll-mt-24" id="projects">
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-xs uppercase tracking-[0.25em] text-ember">04</span>
              <h2 className="font-display text-2xl md:text-3xl font-semibold">Projects</h2>
              <span className="ml-auto text-sm text-muted-foreground">{projects.length}</span>
            </div>
            {projects.length === 0 ? (
              <div className="border border-dashed border-border/60 rounded-lg py-14 text-center">
                <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No published projects yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                {projects.map((project) => (
                  <article
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="group cursor-pointer border border-border/60 rounded-md overflow-hidden bg-card/40 hover:bg-card/70 hover:border-ember/50 transition-all"
                  >
                    {project.image_url && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img
                          src={project.image_url}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-display text-lg font-semibold mb-1.5 group-hover:text-ember transition-colors">
                        {project.title}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{project.description}</p>
                      )}
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {project.technologies.slice(0, 5).map((tech, index) => (
                            <Badge key={index} variant="outline" className="text-[10px] font-normal">{tech}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        {project.github_url && (
                          <Button variant="ghost" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                            <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                              <Github className="h-3.5 w-3.5 mr-1.5" /> Code
                            </a>
                          </Button>
                        )}
                        {project.live_url && (
                          <Button variant="ghost" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                            <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Live
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Repositories */}
          <section className="scroll-mt-24" id="repositories">
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-xs uppercase tracking-[0.25em] text-ember">05</span>
              <h2 className="font-display text-2xl md:text-3xl font-semibold">Repositories</h2>
              <span className="ml-auto text-sm text-muted-foreground">{repositories.length}</span>
            </div>
            {repositories.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/70 px-5 py-12 text-center">
                <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No public repositories to show yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {repositories.map((repository) => (
                  <article key={repository.id} className="rounded-md border border-border/70 bg-card/30 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 break-words font-display font-semibold">{repository.name}</h3>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Star className="h-3 w-3" />{repository.star_count || 0}</span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{repository.description || 'No repository description provided.'}</p>
                    {repository.tags && repository.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{repository.tags.slice(0, 4).map((tag) => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}</div>}
                  </article>
                ))}
              </div>
            )}
          </section>

        </main>
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

      {isOwnProfile && profile && (
        <ProfileEditModal
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile as any}
          userId={profile.user_id}
          onSuccess={fetchUserProfile}
        />
      )}
    </>
  );
};

export default UserProfile;
