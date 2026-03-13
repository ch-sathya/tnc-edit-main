import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import {
  Users, ArrowRight, User, GitBranch, UserPlus, Code, Zap, Shield,
  Sparkles, ChevronRight, Star, MessageSquare, FolderOpen, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserSearchModal } from '@/components/UserSearchModal';
import { ScrollReveal, StaggerContainer, StaggerItem, TextReveal } from '@/components/animations/ScrollReveal';
import { FluidGradientOrb, GlassPanel, GridPattern } from '@/components/animations/FluidBackground';

const FloatingScene = lazy(() => import('@/components/three/FloatingScene'));

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ repositories: 0, portfolios: 0, projects: 0, rooms: 0 });
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
    { icon: <User className="h-6 w-6" />, title: "Developer Portfolios", description: "Create beautiful portfolio pages to showcase your projects and skills to the world." },
    { icon: <GitBranch className="h-6 w-6" />, title: "Repository Hosting", description: "Host your code repositories with version control and collaborative file management." },
    { icon: <Users className="h-6 w-6" />, title: "Real-time Collaboration", description: "Code together in real-time with live cursors, chat, and instant synchronization." },
    { icon: <Globe className="h-6 w-6" />, title: "Global Community", description: "Connect with developers worldwide and showcase your work to a global audience." }
  ];

  const displayStats = [
    { label: "Repositories", value: loading ? "..." : stats.repositories.toLocaleString(), icon: GitBranch },
    { label: "Portfolios", value: loading ? "..." : stats.portfolios.toLocaleString(), icon: User },
    { label: "Projects", value: loading ? "..." : stats.projects.toLocaleString(), icon: FolderOpen },
    { label: "Collab Rooms", value: loading ? "..." : stats.rooms.toLocaleString(), icon: MessageSquare }
  ];

  const howItWorks = [
    { step: "01", title: "Create Your Portfolio", description: "Sign up and build your professional developer portfolio in minutes." },
    { step: "02", title: "Add Your Projects", description: "Showcase your work with detailed project pages and live demos." },
    { step: "03", title: "Connect & Collaborate", description: "Join rooms, find collaborators, and build together in real-time." },
    { step: "04", title: "Grow Your Network", description: "Get discovered by companies and developers from around the world." }
  ];

  return (
    <>
      <div className="min-h-screen bg-background overflow-hidden">
        {/* Hero Section */}
        <section className="relative min-h-[100vh] flex items-center justify-center px-4 overflow-hidden">
          {/* 3D Background */}
          <Suspense fallback={null}>
            <FloatingScene className="opacity-60" />
          </Suspense>
          
          {/* Fluid gradient orbs */}
          <FluidGradientOrb className="top-1/4 left-1/4" delay={0} />
          <FluidGradientOrb className="bottom-1/4 right-1/4" size="w-[500px] h-[500px]" delay={5} />
          <FluidGradientOrb className="top-1/2 right-1/3" size="w-72 h-72" delay={10} />
          
          <GridPattern />

          <div className="relative z-10 max-w-7xl mx-auto text-center">
            <ScrollReveal delay={0.1}>
              <Badge className="mb-8 px-5 py-2 text-sm border-border/50" variant="outline">
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                Developer Portfolio Platform
              </Badge>
            </ScrollReveal>

            <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold text-foreground mb-8 tracking-tighter leading-[0.95]">
              <TextReveal delay={0.2}>Build Your</TextReveal>
              <br />
              <span className="gradient-text">
                <TextReveal delay={0.4}>Developer Portfolio</TextReveal>
              </span>
            </h1>

            <ScrollReveal delay={0.6}>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
                Create stunning portfolio pages, host your repositories, and connect with developers worldwide.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.8}>
              <div className="flex gap-4 justify-center flex-wrap mb-12">
                <Button size="lg" className="h-14 px-8 text-base group" onClick={() => navigate('/projects')}>
                  View Projects
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

            {/* Scroll indicator */}
            <motion.div
              className="absolute bottom-8 left-1/2 -translate-x-1/2"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                  animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 px-4 border-y border-border/50 relative">
          <GridPattern />
          <div className="max-w-7xl mx-auto relative">
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-8" staggerDelay={0.12}>
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
          <FluidGradientOrb className="top-0 right-0" size="w-[600px] h-[600px]" delay={3} />
          
          <div className="max-w-7xl mx-auto relative">
            <ScrollReveal className="text-center mb-20">
              <Badge variant="outline" className="mb-4">Features</Badge>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-5 tracking-tight">
                Everything you need
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed to showcase your work and connect with the developer community.
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
          <FluidGradientOrb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size="w-[800px] h-[800px]" delay={0} duration={30} />
          
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
                Ready to showcase your work?
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
                Join our growing community of developers who are building amazing portfolios and connecting with each other.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button size="lg" className="h-14 px-8 text-base group" onClick={() => navigate('/portfolio')}>
                  Create Your Portfolio
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
