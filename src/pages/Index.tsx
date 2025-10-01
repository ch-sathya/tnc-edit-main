import React from 'react';
import Home from '@/pages/Home';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { loading, isAuthenticated } = useAuth();

  // Enable dark mode by default for better contrast
  React.useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return <Home />;
};

export default Index;
