import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, GitBranch, Search, Globe, ArrowRight, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import Footer from '@/components/Footer';

interface Stats {
  repositories: number;
  portfolios: number;
  users: number;
  projects: number;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    repositories: 0,
    portfolios: 0,
    users: 0,
    projects: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: repoCount } = await supabase
          .from('repositories' as any)
          .select('*', { count: 'exact', head: true });

        const { count: profileCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .not('username', 'is', null);

        const { count: projectCount } = await supabase
          .from('projects' as any)
          .select('*', { count: 'exact', head: true });

        setStats({
          repositories: repoCount || 0,
          portfolios: profileCount || 0,
          users: profileCount || 0,
          projects: projectCount || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);
  const features = [{
    icon: <User className="h-6 w-6" />,
    title: "Developer Portfolios",
    description: "Create beautiful portfolio pages to showcase your projects and skills."
  }, {
    icon: <GitBranch className="h-6 w-6" />,
    title: "Repository Hosting",
    description: "Host your code repositories with version control and file management."
  }, {
    icon: <Search className="h-6 w-6" />,
    title: "Discovery",
    description: "Find and explore amazing projects from developers around the world."
  }, {
    icon: <Globe className="h-6 w-6" />,
    title: "Global Community",
    description: "Connect with developers worldwide and showcase your work publicly."
  }];
  const displayStats = [{
    label: "Public Repositories",
    value: stats.repositories.toLocaleString()
  }, {
    label: "Developer Portfolios",
    value: stats.portfolios.toLocaleString()
  }, {
    label: "Active Projects",
    value: stats.projects.toLocaleString()
  }, {
    label: "Community Members",
    value: stats.users.toLocaleString()
  }];
  return <div className="min-h-screen bg-background">
    {/* Hero Section */}
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto text-center">
        <Badge className="mb-6" variant="outline">
          🚀 Developer Portfolio Platform
        </Badge>
        <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6">
          Build Your
          <br />
          <span className="text-muted-foreground">Developer Portfolio</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">Create stunning portfolio pages, host your repositories, and connect with developers worldwide. Share your projects and discover amazing work from the community.</p>

        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/projects')}>
            View Projects
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/portfolio')}>
            View Portfolios
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Community and News Navigation */}
        <div className="flex gap-4 justify-center mt-6">
          <Button size="lg" variant="secondary" onClick={() => navigate('/community')}>
            Join Community
            <Users className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate('/news')}>
            Read News
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>

    {/* Stats Section */}
    <section className="py-16 px-4 bg-secondary/50">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {displayStats.map((stat, index) => <div key={index} className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              {stat.value}
            </div>
            <div className="text-muted-foreground">{stat.label}</div>
          </div>)}
        </div>
      </div>
    </section>

    {/* Features Section */}
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Everything you need for your developer portfolio
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to showcase your work and connect with the developer community.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => <Card key={index} className="border border-border hover:border-foreground/20 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <CardTitle className="text-lg">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground">
                {feature.description}
              </CardDescription>
            </CardContent>
          </Card>)}
        </div>
      </div>
    </section>

    {/* CTA Section */}
    <section className="py-20 px-4 bg-primary text-primary-foreground">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-4">
          Ready to showcase your work?
        </h2>
        <p className="text-xl mb-8 opacity-90">
          Join thousands of developers who are already building amazing portfolios.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" variant="secondary" onClick={() => navigate('/portfolio')}>
            View Portfolios
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate('/projects')}>
            Explore Projects
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate('/community')}>
            Join Community
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate('/news')}>
            Latest News
          </Button>
        </div>
      </div>
    </section>
    <Footer />
  </div>;
};
export default Home;