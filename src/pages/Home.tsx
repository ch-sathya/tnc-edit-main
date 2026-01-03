import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Search, 
  Globe, 
  ArrowRight, 
  User, 
  GitBranch, 
  UserPlus,
  Code,
  Zap,
  Shield,
  Sparkles,
  ChevronRight,
  Star,
  MessageSquare,
  FolderOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserSearchModal } from '@/components/UserSearchModal';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    repositories: 0,
    portfolios: 0,
    projects: 0,
    rooms: 0
  });
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [repoCount, profileCount, projectCount, roomCount] = await Promise.all([
          supabase.from('repositories' as any).select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('projects' as any).select('*', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('collaboration_rooms').select('*', { count: 'exact', head: true })
        ]);
        setStats({
          repositories: repoCount.count || 0,
          portfolios: profileCount.count || 0,
          projects: projectCount.count || 0,
          rooms: roomCount.count || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const features = [
    {
      icon: <User className="h-6 w-6" />,
      title: "Developer Portfolios",
      description: "Create beautiful portfolio pages to showcase your projects and skills to the world."
    },
    {
      icon: <GitBranch className="h-6 w-6" />,
      title: "Repository Hosting",
      description: "Host your code repositories with version control and collaborative file management."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Real-time Collaboration",
      description: "Code together in real-time with live cursors, chat, and instant synchronization."
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Global Community",
      description: "Connect with developers worldwide and showcase your work to a global audience."
    }
  ];

  const displayStats = [
    { label: "Public Repositories", value: loading ? "..." : stats.repositories.toLocaleString(), icon: GitBranch },
    { label: "Developer Portfolios", value: loading ? "..." : stats.portfolios.toLocaleString(), icon: User },
    { label: "Published Projects", value: loading ? "..." : stats.projects.toLocaleString(), icon: FolderOpen },
    { label: "Collaboration Rooms", value: loading ? "..." : stats.rooms.toLocaleString(), icon: MessageSquare }
  ];

  const howItWorks = [
    { step: "01", title: "Create Your Portfolio", description: "Sign up and build your professional developer portfolio in minutes." },
    { step: "02", title: "Add Your Projects", description: "Showcase your work with detailed project pages and live demos." },
    { step: "03", title: "Connect & Collaborate", description: "Join rooms, find collaborators, and build together in real-time." },
    { step: "04", title: "Grow Your Network", description: "Get discovered by companies and developers from around the world." }
  ];

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Hero Section with animated gradient */}
        <section className="relative py-24 px-4 overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/20 to-background" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse delay-1000" />
          
          <div className="relative max-w-7xl mx-auto text-center">
            <Badge className="mb-6 px-4 py-1.5" variant="outline">
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              Developer Portfolio Platform
            </Badge>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground mb-6 tracking-tight">
              Build Your
              <br />
              <span className="bg-gradient-to-r from-foreground via-muted-foreground to-foreground bg-clip-text text-transparent">
                Developer Portfolio
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
              Create stunning portfolio pages, host your repositories, and connect with developers worldwide. 
              Share your projects and discover amazing work from the community.
            </p>

            <div className="flex gap-4 justify-center flex-wrap mb-16">
              <Button size="lg" className="h-14 px-8 text-lg" onClick={() => navigate('/projects')}>
                View Projects
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg" onClick={() => navigate('/portfolio')}>
                Your Portfolio
                <User className="ml-2 h-5 w-5" />
              </Button>
              {user ? (
                <Button size="lg" variant="secondary" className="h-14 px-8 text-lg" onClick={() => setShowSearchModal(true)}>
                  Find People
                  <UserPlus className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button size="lg" variant="secondary" className="h-14 px-8 text-lg" onClick={() => navigate('/auth')}>
                  Get Started
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>

            {/* Floating badges */}
            <div className="flex justify-center gap-3 flex-wrap">
              <Badge variant="secondary" className="px-3 py-1">
                <Code className="h-3.5 w-3.5 mr-1.5" />
                Real-time Code Sync
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                Secure & Private
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Lightning Fast
              </Badge>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4 bg-secondary/30 border-y border-border">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {displayStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="text-center group">
                    {loading ? (
                      <>
                        <Skeleton className="h-12 w-24 mx-auto mb-2" />
                        <Skeleton className="h-4 w-32 mx-auto" />
                      </>
                    ) : (
                      <>
                        <div className="inline-flex items-center gap-2 mb-2">
                          <Icon className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                          <div className="text-4xl md:text-5xl font-bold text-foreground">
                            {stat.value}
                          </div>
                        </div>
                        <div className="text-muted-foreground">{stat.label}</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">Features</Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Everything you need for your
                <br />
                developer portfolio
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed to showcase your work and connect with the developer community.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="group border border-border hover:border-foreground/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 bg-card"
                >
                  <CardHeader>
                    <div className="h-14 w-14 bg-secondary text-foreground rounded-xl flex items-center justify-center mb-4 group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 px-4 bg-secondary/20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">How It Works</Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Get started in minutes
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Four simple steps to launch your professional developer presence.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {howItWorks.map((item, index) => (
                <div key={index} className="relative">
                  <div className="text-6xl font-bold text-secondary mb-4">{item.step}</div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                  {index < howItWorks.length - 1 && (
                    <ChevronRight className="hidden lg:block absolute top-8 -right-4 h-8 w-8 text-border" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section - Fixed: Using dark gradient instead of bg-primary */}
        <section className="py-24 px-4 bg-gradient-to-br from-secondary via-secondary/80 to-card border-t border-border">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-6">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-muted-foreground">Join thousands of developers</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Ready to showcase your work?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join our growing community of developers who are building amazing portfolios and connecting with each other.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="h-14 px-8 text-lg" onClick={() => navigate('/portfolio')}>
                Create Your Portfolio
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg" onClick={() => navigate('/projects')}>
                Explore Projects
              </Button>
            </div>
            <div className="flex justify-center gap-8 mt-12 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Free to start
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Active community
              </div>
            </div>
          </div>
        </section>
      </div>

      <UserSearchModal open={showSearchModal} onOpenChange={setShowSearchModal} />
    </>
  );
};

export default Home;
