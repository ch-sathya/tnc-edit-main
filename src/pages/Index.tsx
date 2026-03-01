import React from 'react';
import Navigation from '@/components/Navigation';
import Home from '@/pages/Home';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <div className="flex-1">
        <Home />
      </div>
      <Footer />
    </div>
  );
};

export default Index;
