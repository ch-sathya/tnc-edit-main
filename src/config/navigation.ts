import { Home, FolderOpen, User, Users, MessageSquare, Newspaper, type LucideIcon } from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Only shown to signed-in users. */
  authOnly?: boolean;
}

/** Single source of truth for primary navigation (desktop + mobile). */
export const primaryNavItems: NavItem[] = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/collaborate', label: 'Collaborate', icon: Users },
  { path: '/projects', label: 'Showcase', icon: FolderOpen },
  { path: '/community', label: 'Community', icon: MessageSquare },
  { path: '/news', label: 'News', icon: Newspaper },
  { path: '/portfolio', label: 'My Portfolio', icon: User, authOnly: true },
];

export const getNavItems = (isSignedIn: boolean) =>
  primaryNavItems.filter((item) => !item.authOnly || isSignedIn);
