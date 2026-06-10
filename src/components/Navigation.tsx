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
      transition={{ duration: 0.5, ease: [0.25, 0.4, 0, 1] }}
      className="sticky top-0 z-50 border-b border-border/30"
      style={{
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      <div className="flex items-center justify-between h-16 w-full">
        <div className="flex items-center gap-2 pl-3">
          <MobileNav />
          <motion.h1
            className="text-xl md:text-2xl font-bold text-foreground cursor-pointer tracking-tight"
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            The Night Club
          </motion.h1>
        </div>

        <div className="flex items-center space-x-2 md:space-x-3 pr-3">
          <GlobalSearch />
          <div className="hidden lg:block">
            <div className="flex items-baseline space-x-0.5">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className="flex items-center gap-1.5 relative"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden xl:inline">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -bottom-[1px] left-2 right-2 h-[2px] bg-foreground rounded-full"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
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
