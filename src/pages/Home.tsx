import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Code2, Users, Search, Globe, ArrowRight, Star, User, GitBranch } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
interface HomeProps {
  onNavigate: (page: string) => void;
}

interface SearchResult {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
}
const Home: React.FC<HomeProps> = ({
  onNavigate
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, display_name, bio, avatar_url')
        .ilike('display_name', `%${searchQuery}%`)
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .not('username', 'is', null)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserClick = (username: string) => {
    navigate(`/@${username}`);
  };
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
  const stats = [{
    label: "Public Repositories",
    value: "8,200+"
  }, {
    label: "Developer Portfolios",
    value: "15,000+"
  }, {
    label: "Lines of Code",
    value: "4.2M+"
  }, {
    label: "Countries",
    value: "85+"
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
          <Button size="lg" onClick={() => onNavigate('projects')}>
            View Projects
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => onNavigate('repository')}>
            Search Repositories
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
          {stats.map((stat, index) => <div key={index} className="text-center">
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
          <Button size="lg" variant="secondary" onClick={() => onNavigate('portfolio')}>
            Create Portfolio
          </Button>
          <Button size="lg" variant="secondary" onClick={() => onNavigate('projects')}>
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
  </div>;
};
export default Home;