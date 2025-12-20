import React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Home, FolderOpen, User, Users, LogOut, MessageSquare, Newspaper, Menu, Settings, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';

interface MobileNavProps {
  unreadNotifications?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({ unreadNotifications = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/portfolio', label: 'Portfolio', icon: User },
    { path: '/projects', label: 'Projects', icon: FolderOpen },
    { path: '/collaborate', label: 'Collaborate', icon: Users },
    { path: '/community', label: 'Community', icon: MessageSquare },
    { path: '/news', label: 'News', icon: Newspaper },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden touch-target">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] bg-card border-border">
        <SheetHeader className="border-b border-border pb-4 mb-4">
          <SheetTitle className="text-left text-foreground">The Night Club</SheetTitle>
        </SheetHeader>
        
        {/* User Profile */}
        <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-secondary/50">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile?.avatar_url} alt={profile?.display_name || profile?.username} />
            <AvatarFallback>
              {profile?.display_name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {profile?.display_name || 'User'}
            </p>
            {profile?.username && (
              <p className="text-sm text-muted-foreground truncate">
                @{profile.username}
              </p>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 h-12 touch-target"
                onClick={() => handleNavigate(item.path)}
              >
                <Icon className="h-5 w-5" />
                {item.label}
                {item.path === '/notifications' && unreadNotifications > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="absolute bottom-6 left-4 right-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive touch-target"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
