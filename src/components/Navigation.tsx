import React from 'react';
import { Button } from '@/components/ui/button';
import { Home, FolderOpen, User, Users, MessageSquare, Newspaper, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MobileNav } from '@/components/MobileNav';
import { NotificationBell } from '@/components/NotificationBell';
import { GlobalSearch } from '@/components/GlobalSearch';
import ProfileDropdown from '@/components/ProfileDropdown';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/portfolio', label: 'Portfolio', icon: User },
    { path: '/projects', label: 'Projects', icon: FolderOpen },
    { path: '/collaborate', label: 'Collaborate', icon: Users },
    { path: '/community', label: 'Community', icon: MessageSquare },
    { path: '/news', label: 'News', icon: Newspaper },
    { path: '/vibe-code', label: 'Vibe Code', icon: Sparkles },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between h-16 w-full">
        {/* Left side */}
        <div className="flex items-center gap-2 pl-3">
          <MobileNav />
          <h1 
            className="text-lg font-bold text-foreground cursor-pointer tracking-tight"
            onClick={() => navigate('/')}
          >
            The Night Club
          </h1>
        </div>
        
        {/* Right side */}
        <div className="flex items-center space-x-1 md:space-x-2 pr-3">
          <GlobalSearch />
          
          <div className="hidden lg:block">
            <div className="flex items-center space-x-0.5">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Button 
                    key={item.path} 
                    variant={isActive ? "secondary" : "ghost"} 
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className="flex items-center gap-1.5 text-xs rounded-full"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
          
          {user && <NotificationBell />}
          <ProfileDropdown />
        </div>
      </div>
    </motion.nav>
  );
};

export default Navigation;
