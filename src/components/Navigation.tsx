import React from 'react';
import { Button } from '@/components/ui/button';
import { Home, FolderOpen, User, Users, MessageSquare, Newspaper } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MobileNav } from '@/components/MobileNav';
import { NotificationBell } from '@/components/NotificationBell';
import ProfileDropdown from '@/components/ProfileDropdown';
import { useAuth } from '@/hooks/useAuth';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [{
    path: '/',
    label: 'Home',
    icon: Home
  }, {
    path: '/portfolio',
    label: 'Portfolio',
    icon: User
  }, {
    path: '/projects',
    label: 'Projects',
    icon: FolderOpen
  }, {
    path: '/collaborate',
    label: 'Collaborate',
    icon: Users
  }, {
    path: '/community',
    label: 'Community',
    icon: MessageSquare
  }, {
    path: '/news',
    label: 'News',
    icon: Newspaper
  }];

  return (
    <nav className="bg-card border-b border-border">
      <div className="flex items-center justify-between h-16 w-full">
        {/* Left side - Title and Mobile Nav */}
        <div className="flex items-center gap-2 pl-2">
          <MobileNav />
          <h1 
            className="text-xl md:text-2xl font-bold text-foreground cursor-pointer"
            onClick={() => navigate('/')}
          >
            The Night Club
          </h1>
        </div>
        
        {/* Right side - Navigation and User */}
        <div className="flex items-center space-x-2 md:space-x-4 pr-2">
          {/* Navigation Items */}
          <div className="hidden md:block">
            <div className="flex items-baseline space-x-2">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Button 
                    key={item.path} 
                    variant={isActive ? "default" : "ghost"} 
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>
          
          {/* Notifications - Only show if logged in */}
          {user && <NotificationBell />}
          
          {/* Profile Dropdown */}
          <ProfileDropdown />
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
