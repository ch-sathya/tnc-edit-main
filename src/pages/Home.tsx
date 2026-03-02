import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { 
  Users, ArrowRight, User, GitBranch, UserPlus, Code, Zap, Shield, 
  Sparkles, ChevronRight, Star, MessageSquare, FolderOpen 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserSearchModal } from '@/components/UserSearchModal';

const FadeInSection = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ repositories: 0, portfolios: 0, projects: 0, rooms: 0 });
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

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
    { icon: <User className="h-6 w-6" />, title: "Developer Portfolios", description: "Create beautiful portfolio pages to showcase your projects and skills." },
    { icon: <GitBranch className="h-6 w-6" />, title: "Repository Hosting", description: "Host your code repositories with version control and collaboration." },
    { icon: <Users className="h-6 w-6" />, title: "Real-time Collaboration", description: "Code together in real-time with live cursors and instant sync." },
    { icon: <Sparkles className="h-6 w-6" />, title: "AI Vibe Coding", description: "Build with AI assistance — your intelligent coding companion." },
  ];

  const displayStats = [
    { label: "Repositories", value: loading ? "—" : stats.repositories.toLocaleString(), icon: GitBranch },
    { label: "Developers", value: loading ? "—" : stats.portfolios.toLocaleString(), icon: User },
    { label: "Projects", value: loading ? "—" : stats.projects.toLocaleString(), icon: FolderOpen },
    { label: "Collab Rooms", value: loading ? "—" : stats.rooms.toLocaleString(), icon: MessageSquare }
  ];

  const howItWorks = [
    { step: "01", title: "Create Your Portfolio", description: "Sign up and build your professional developer portfolio in minutes." },
    { step: "02", title: "Add Your Projects", description: "Showcase your work with detailed project pages and live demos." },
    { step: "03", title: "Connect & Collaborate", description: "Join rooms, find collaborators, and build together in real-time." },
    { step: "04", title: "Grow Your Network", description: "Get discovered by companies and developers worldwide." }
  ];

  return (
    <>
      <div className="min-h-screen bg-background overflow-hidden">
        {/* Hero Section - Cinematic Split Text */}
        <motion.section
          ref={heroRef}
          className="relative min-h-[100vh] flex items-center justify-center px-4 overflow-hidden"
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        >
          {/* Subtle animated background elements */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-background via-background to-secondary/10" />
            <motion.div
              className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[120px]"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/[0.02] blur-[100px]"
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Center vertical line like SRG */}
            <div className="absolute left-1/2 top-0 w-px h-full bg-gradient-to-b from-transparent via-border/50 to-transparent" />
          </div>
          
          <div className="relative max-w-7xl mx-auto text-center z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Badge className="mb-8 px-4 py-1.5 text-xs tracking-[0.2em] uppercase" variant="outline">
                Developer Platform
              </Badge>
            </motion.div>

            {/* Big dramatic split text */}
            <div className="relative">
              <motion.h1
                className="text-[clamp(3rem,12vw,10rem)] font-bold text-foreground leading-[0.9] tracking-tighter"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <motion.span
                  className="block"
                  initial={{ x: -80, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  BUILD
                </motion.span>
                <motion.span
                  className="block text-muted-foreground/40"
                  initial={{ x: 80, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  YOUR
                </motion.span>
                <motion.span
                  className="block"
                  initial={{ x: -80, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 1, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  LEGACY
                </motion.span>
              </motion.h1>
            </div>

            <motion.p
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-10 mb-12 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            >
              Create stunning portfolios, host repositories, collaborate in real-time,
              and code with AI — all in one platform.
            </motion.p>

            <motion.div
              className="flex gap-4 justify-center flex-wrap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.4 }}
            >
              <Button size="lg" className="h-14 px-8 text-base rounded-full" onClick={() => navigate('/projects')}>
                Explore Projects
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {user ? (
                <Button size="lg" variant="outline" className="h-14 px-8 text-base rounded-full" onClick={() => setShowSearchModal(true)}>
                  Find Developers
                  <UserPlus className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button size="lg" variant="outline" className="h-14 px-8 text-base rounded-full" onClick={() => navigate('/auth')}>
                  Get Started
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
              className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
            >
              <span className="text-xs text-muted-foreground/60 tracking-[0.3em] uppercase">Scroll</span>
              <motion.div
                className="w-px h-10 bg-gradient-to-b from-muted-foreground/60 to-transparent"
                animate={{ scaleY: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </div>
        </motion.section>

        {/* Stats Section - Horizontal strip */}
        <FadeInSection>
          <section className="py-20 px-4 border-y border-border/50">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                {displayStats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={index}
                      className="text-center group"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                    >
                      <div className="text-5xl md:text-6xl font-bold text-foreground tracking-tighter mb-1">
                        {stat.value}
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        {stat.label}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Features Section - Card Grid with hover */}
        <section className="py-28 px-4">
          <div className="max-w-7xl mx-auto">
            <FadeInSection>
              <div className="mb-16">
                <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground">Features</span>
                <h2 className="text-4xl md:text-6xl font-bold text-foreground mt-4 tracking-tight">
                  Everything you need
                </h2>
              </div>
            </FadeInSection>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <FadeInSection key={index} delay={index * 0.1}>
                  <motion.div
                    className="group p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm transition-colors duration-500 hover:bg-card hover:border-border cursor-default"
                    whileHover={{ y: -8, transition: { duration: 0.3 } }}
                  >
                    <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center mb-6 group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </motion.div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works - Numbered Steps */}
        <section className="py-28 px-4 bg-secondary/10">
          <div className="max-w-7xl mx-auto">
            <FadeInSection>
              <div className="mb-16">
                <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground">Process</span>
                <h2 className="text-4xl md:text-6xl font-bold text-foreground mt-4 tracking-tight">
                  Get started in minutes
                </h2>
              </div>
            </FadeInSection>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
              {howItWorks.map((item, index) => (
                <FadeInSection key={index} delay={index * 0.15}>
                  <div className="relative">
                    <span className="text-[8rem] font-bold text-foreground/[0.04] leading-none block -mb-16">
                      {item.step}
                    </span>
                    <h3 className="text-xl font-semibold text-foreground mb-3 relative z-10">{item.title}</h3>
                    <p className="text-muted-foreground relative z-10">{item.description}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section - Full bleed */}
        <FadeInSection>
          <section className="py-32 px-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
            <div className="max-w-4xl mx-auto text-center relative z-10">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <Star className="h-8 w-8 mx-auto mb-6 text-muted-foreground" />
                <h2 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight mb-6">
                  Ready to build?
                </h2>
                <p className="text-xl text-muted-foreground mb-12 max-w-xl mx-auto">
                  Join our growing community of developers creating amazing portfolios.
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <Button size="lg" className="h-14 px-10 text-base rounded-full" onClick={() => navigate('/portfolio')}>
                    Create Portfolio
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button size="lg" variant="outline" className="h-14 px-10 text-base rounded-full" onClick={() => navigate('/vibe-code')}>
                    Try Vibe Code
                    <Sparkles className="ml-2 h-5 w-5" />
                  </Button>
                </div>
                <div className="flex justify-center gap-8 mt-16 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Shield className="h-4 w-4" />Free to start</div>
                  <div className="flex items-center gap-2"><Zap className="h-4 w-4" />No credit card</div>
                  <div className="flex items-center gap-2"><Users className="h-4 w-4" />Active community</div>
                </div>
              </motion.div>
            </div>
          </section>
        </FadeInSection>
      </div>

      <UserSearchModal open={showSearchModal} onOpenChange={setShowSearchModal} />
    </>
  );
};

export default Home;
