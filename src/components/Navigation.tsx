import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Home, FolderOpen, User, Users, LogOut, MessageSquare, Newspaper, DollarSign } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';

const Navigation: React.FC = () => {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };
  const navItems = [{
    path: '/',
    label: 'Home',
    icon: Home
  }, {
    path: '/projects',
    label: 'Projects',
    icon: FolderOpen
  }, {
    path: '/portfolio',
    label: 'Portfolio',
    icon: User
  }, {
    path: '/community',
    label: 'Community',
    icon: MessageSquare
  }, {
    path: '/news',
    label: 'News',
    icon: Newspaper
  }, {
    path: '/pricing',
    label: 'Pricing',
    icon: DollarSign
  }];
  return <nav className="bg-card border-b border-border">
      <div className="flex items-center justify-between h-16 w-full">
        {/* Left side - Title (Sharp Left) */}
        <div className="flex-shrink-0 pl-2">
          <h1 className="text-2xl font-bold text-foreground">The Night Club</h1>
        </div>
        
        {/* Right side - Navigation and User (Sharp Right) */}
        <div className="flex items-center space-x-4 pr-2">
          {/* Navigation Items */}
          <div className="hidden md:block">
            <div className="flex items-baseline space-x-4">
              {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return <Button key={item.path} variant={isActive ? "default" : "ghost"} onClick={() => navigate(item.path)} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>;
            })}
            </div>
          </div>
          
          {/* User Profile (Second to Last) */}
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url} alt={profile?.display_name || profile?.username} />
              <AvatarFallback className="text-xs">
                {profile?.display_name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            {profile?.username && (
              <span className="text-sm text-muted-foreground hidden md:block">
                @{profile.username}
              </span>
            )}
          </div>
          
          {/* Sign Out Button (Last) */}
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </nav>;
};
export default Navigation;