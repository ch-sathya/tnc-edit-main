import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import {
  Users, ArrowRight, User, GitBranch, UserPlus, Code, Zap, Shield,
  Sparkles, ChevronRight, Star, MessageSquare, FolderOpen, UploadCloud
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserSearchModal } from '@/components/UserSearchModal';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/animations/ScrollReveal';
import { GlassPanel, GridPattern } from '@/components/animations/FluidBackground';



const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ portfolios: 0, projects: 0, rooms: 0 });
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [profileCount, projectCount, roomCount] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('projects' as any).select('*', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('collaboration_rooms').select('*', { count: 'exact', head: true })
        ]);
        setStats({
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
    { icon: <User className="h-6 w-6" />, title: "Developer Portfolios", description: "Create beautiful portfolio pages to showcase your projects and skills to the world.", status: "available" as const },
    { icon: <Users className="h-6 w-6" />, title: "Live Workspaces", description: "Code together with shared files, live cursors, presence, chat, and instant synchronization.", status: "available" as const },
    { icon: <Code className="h-6 w-6" />, title: "Run Code In-Browser", description: "Execute JavaScript and TypeScript in a sandboxed runtime without leaving the workspace.", status: "available" as const },
    { icon: <UploadCloud className="h-6 w-6" />, title: "Repository Import", description: "Importing code from a repository link requires connecting a Git provider — not yet available.", status: "planned" as const },
    { icon: <GitBranch className="h-6 w-6" />, title: "Push Changes Back", description: "Pushing reviewed work back to the original repository is planned and needs provider authorization.", status: "planned" as const }
  ];

  const displayStats = [
    { label: "Portfolios", value: loading ? "..." : stats.portfolios.toLocaleString(), icon: User },
    { label: "Projects", value: loading ? "..." : stats.projects.toLocaleString(), icon: FolderOpen },
    { label: "Live Workspaces", value: loading ? "..." : stats.rooms.toLocaleString(), icon: MessageSquare }
  ];

  const howItWorks = [
    { step: "01", title: "Create a Workspace", description: "Start a blank collaborative room and add the files you need.", status: "available" as const },
    { step: "02", title: "Invite Your Team", description: "Share a private room code and work in the same file tree.", status: "available" as const },
    { step: "03", title: "Build Together", description: "Edit with realtime cursors, presence, chat, and conflict-safe sync.", status: "available" as const },
    { step: "04", title: "Review & Push", description: "Reviewing and pushing work upstream arrives with Git provider support.", status: "planned" as const }
  ];

  return (
    <>
      <div className="min-h-screen bg-background overflow-hidden">
        {/* Hero Section */}
        <section className="relative min-h-[100vh] flex items-center justify-center px-4 overflow-hidden">
          <GridPattern />

          <div className="relative z-10 max-w-7xl mx-auto text-center">
            <ScrollReveal delay={0.1}>
              <Badge className="mb-8 px-5 py-2 text-sm border-border/50" variant="outline">
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                Collaborative Development Platform
              </Badge>
            </ScrollReveal>

            <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold text-foreground mb-8 tracking-tighter leading-[0.95]">
              <span>Build Together.</span>
              <br />
              <span className="gradient-text inline-block">Ship to the Source.</span>
            </h1>

            <ScrollReveal delay={0.6}>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
                Import existing code, collaborate in realtime, and push reviewed changes back to the original repository.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.8}>
              <div className="flex gap-4 justify-center flex-wrap mb-12">
                <Button size="lg" className="h-14 px-8 text-base group" onClick={() => navigate('/collaborate')}>
                  Start Collaborating
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-base" onClick={() => navigate('/portfolio')}>
                  Your Portfolio
                  <User className="ml-2 h-4 w-4" />
                </Button>
                {user ? (
                  <Button size="lg" variant="secondary" className="h-14 px-8 text-base" onClick={() => setShowSearchModal(true)}>
                    Find People
                    <UserPlus className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="lg" variant="secondary" className="h-14 px-8 text-base" onClick={() => navigate('/auth')}>
                    Get Started
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={1}>
              <div className="flex justify-center gap-3 flex-wrap">
                {[
                  { icon: Code, label: 'Real-time Code Sync' },
                  { icon: Shield, label: 'Secure & Private' },
                  { icon: Zap, label: 'Lightning Fast' },
                ].map(({ icon: Icon, label }) => (
                  <Badge key={label} variant="secondary" className="px-3 py-1.5 bg-secondary/50 border border-border/50">
                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                    {label}
                  </Badge>
                ))}
              </div>
            </ScrollReveal>

          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 px-4 border-y border-border/50 relative">
          <GridPattern />
          <div className="max-w-7xl mx-auto relative">
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-8" staggerDelay={0.12}>
              {displayStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <StaggerItem key={index}>
                    <GlassPanel className="p-6 text-center">
                      {loading ? (
                        <>
                          <Skeleton className="h-12 w-24 mx-auto mb-2" />
                          <Skeleton className="h-4 w-32 mx-auto" />
                        </>
                      ) : (
                        <>
                          <div className="inline-flex items-center gap-2 mb-2">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <div className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                              {stat.value}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">{stat.label}</div>
                        </>
                      )}
                    </GlassPanel>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-28 px-4 relative">
          <div className="max-w-7xl mx-auto relative">
            <ScrollReveal className="text-center mb-20">
              <Badge variant="outline" className="mb-4">Features</Badge>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-5 tracking-tight">
                Everything you need
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A focused workflow for collaborative coding, professional work, and developer connections.
              </p>
            </ScrollReveal>

            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.1}>
              {features.map((feature, index) => (
                <StaggerItem key={index}>
                  <motion.div whileHover={{ y: -6, transition: { duration: 0.3 } }}>
                    <GlassPanel className="p-6 h-full">
                      <div className="h-14 w-14 bg-secondary text-foreground rounded-xl flex items-center justify-center mb-5 group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                        {feature.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                    </GlassPanel>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-28 px-4 relative border-y border-border/50">
          <GridPattern />
          <div className="max-w-7xl mx-auto relative">
            <ScrollReveal className="text-center mb-20">
              <Badge variant="outline" className="mb-4">How It Works</Badge>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-5 tracking-tight">
                Get started in minutes
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Four simple steps to launch your professional developer presence.
              </p>
            </ScrollReveal>

            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-8" staggerDelay={0.15}>
              {howItWorks.map((item, index) => (
                <StaggerItem key={index}>
                  <div className="relative">
                    <motion.div
                      className="text-7xl font-bold text-foreground/[0.04] mb-4 tracking-tighter"
                      whileInView={{ opacity: [0, 1] }}
                      transition={{ duration: 1, delay: index * 0.2 }}
                    >
                      {item.step}
                    </motion.div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                    {index < howItWorks.length - 1 && (
                      <ChevronRight className="hidden lg:block absolute top-8 -right-4 h-8 w-8 text-border" />
                    )}
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-4 relative overflow-hidden">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <ScrollReveal>
              <motion.div
                className="inline-flex items-center gap-2 mb-8"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Star className="h-5 w-5 text-foreground/60" />
                <span className="text-muted-foreground text-sm tracking-wide uppercase">Join thousands of developers</span>
              </motion.div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-5 tracking-tight">
                 Ready to build together?
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
                 Bring your existing code, invite your team, and keep your source repository in control.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="flex gap-4 justify-center flex-wrap">
                 <Button size="lg" className="h-14 px-8 text-base group" onClick={() => navigate('/collaborate')}>
                   Open a Workspace
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-base" onClick={() => navigate('/projects')}>
                  Explore Projects
                </Button>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.4}>
              <div className="flex justify-center gap-8 mt-14 text-sm text-muted-foreground">
                {[
                  { icon: Shield, label: 'Free to start' },
                  { icon: Zap, label: 'No credit card required' },
                  { icon: Users, label: 'Active community' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>
      </div>

      <UserSearchModal open={showSearchModal} onOpenChange={setShowSearchModal} />
    </>
  );
};

export default Home;
