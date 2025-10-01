import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import Home from '@/pages/Home';
import Community from '@/pages/Community';
import News from '@/pages/News';
import Pricing from '@/pages/Pricing';
import Auth from '@/pages/Auth';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const { user, loading, isAuthenticated } = useAuth();

  console.log('Current page state:', currentPage);
  console.log('Auth state:', { user: user?.email, isAuthenticated, loading });

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

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <Auth />;
  }

  const renderCurrentPage = () => {
    const pageComponent = (() => {
      switch (currentPage) {
        case 'home':
          return <Home onNavigate={setCurrentPage} />;
        case 'community':
          return <Community />;
        case 'news':
          return <News />;
        case 'pricing':
          return <Pricing />;
        default:
          return <Home onNavigate={setCurrentPage} />;
      }
    })();

    return (
      <div key={currentPage} className="animate-fade-in">
        {pageComponent}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1">
        {renderCurrentPage()}
      </div>
      <Footer />
    </div>
  );
};

export default Index;
