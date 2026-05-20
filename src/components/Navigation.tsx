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
    <nav
      className="sticky top-0 z-50 border-b border-border/40"
      style={{
        background: 'rgba(10, 10, 12, 0.72)',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
      }}
    >
      <div className="flex items-center justify-between h-14 w-full">
        <div className="flex items-center gap-2 pl-3">
          <MobileNav />
          <h1
            className="text-lg md:text-xl font-bold text-foreground cursor-pointer tracking-tight"
            onClick={() => navigate('/')}
          >
            The Night Club
          </h1>
        </div>

        <div className="flex items-center space-x-1 md:space-x-2 pr-3">
          <GlobalSearch />
          <div className="hidden lg:block">
            <div className="flex items-baseline space-x-0.5">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className="flex items-center gap-1.5 relative h-8"
                  >
                    <Icon className="h-4 w-4" />
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
    </nav>
  );
};

export default Navigation;
